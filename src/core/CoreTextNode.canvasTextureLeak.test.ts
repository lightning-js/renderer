/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Tests for canvas text GPU texture lifecycle in CoreTextNode: each text
 * change or node destroy must deterministically free the previous canvas
 * text texture (freeing GPU memory immediately) rather than relying on LRU
 * cleanup to reclaim it later.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { CoreTextureManager } from './CoreTextureManager.js';
import { CoreNode } from './CoreNode.js';
import { CoreTextNode } from './CoreTextNode.js';
import { Texture, TextureType } from './textures/Texture.js';
import { TextureMemoryManager } from './TextureMemoryManager.js';
import type { TextureMemoryManagerSettings } from './TextureMemoryManager.js';
import { Stage } from './Stage.js';
import { createBound } from './lib/utils.js';
import type {
  CanvasRenderInfo,
  TextRenderer,
} from './text-rendering/TextRenderer.js';
import { makeNodeProps, makeTextProps } from '../../test/mockStage.js';

class FakeBitmap {
  width = 120;
  height = 40;
}

let OriginalImageBitmap: unknown;

beforeEach(() => {
  OriginalImageBitmap = (globalThis as Record<string, unknown>).ImageBitmap;
  (globalThis as Record<string, unknown>).ImageBitmap = FakeBitmap;
});

afterEach(() => {
  (globalThis as Record<string, unknown>).ImageBitmap = OriginalImageBitmap;
});

function makeCanvasTextRenderer() {
  return {
    type: 'canvas',
    font: {
      isFontLoaded: vi.fn().mockReturnValue(true),
      waitingForFont: vi.fn(),
      stopWaitingForFont: vi.fn(),
    },
    renderText: vi.fn(
      () =>
        ({
          type: 'canvas',
          width: 120,
          height: 40,
          hasRemainingText: false,
          remainingLines: 0,
          renderSource: () =>
            new (
              globalThis as unknown as { ImageBitmap: new () => ImageBitmap }
            ).ImageBitmap(),
        }) as unknown as CanvasRenderInfo,
    ),
    addQuads: vi.fn(),
    renderQuads: vi.fn(),
  } as unknown as TextRenderer;
}

function makeMemSettings(
  overrides?: Partial<TextureMemoryManagerSettings>,
): TextureMemoryManagerSettings {
  return {
    criticalThreshold: 124e6,
    targetThresholdLevel: 0.5,
    cleanupInterval: 5000,
    debugLogging: false,
    baselineMemoryAllocation: 25e6,
    doNotExceedCriticalThreshold: false,
    ...overrides,
  };
}

/**
 * Builds a stage with a real CoreTextureManager + TextureMemoryManager (not
 * mocked), plus the minimal drawFrame scaffolding needed to drive
 * CoreTextNode through its normal update → texture-load pipeline.
 */
function makeDrawFrameHarness() {
  const addQuad = vi.fn();
  let txMemManagerRef: TextureMemoryManager | null = null;
  const stageObj: Record<string, unknown> = {
    contextState: 'running',
    contextSuspended: false,
    contextGeneration: 0,
    deltaTime: 16,
    boundsMargin: [0, 0, 0, 0],
    strictBound: createBound(0, 0, 1920, 1080),
    preloadBound: createBound(0, 0, 1920, 1080),
    defaultTexture: { state: 'loaded' },
    defShaderNode: null,
    calculateTextureCoord: false,
    interactiveNodes: new Set(),
    platform: { getTimeStamp: () => 0 },
    options: {
      maxTextureUploadsDuringAnimation: 0,
      textureProcessingTimeLimit: 1000,
      enableDirtyRepaints: true,
    },
    activeAnimationCount: 0,
    renderer: {
      reset: vi.fn(),
      render: vi.fn(),
      addQuad,
      invalidateQuadBuffer: vi.fn(),
      rttNodes: [],
      createCtxTexture: (texture: Texture) => ({
        state: 'freed',
        load: (): void => {
          (txMemManagerRef as TextureMemoryManager).setTextureMemUse(
            texture,
            120 * 40 * 4,
          );
          texture.setState('loaded', { w: 120, h: 40 });
        },
        free: vi.fn(),
      }),
    },
    renderListDirty: true,
    renderListNodes: [] as CoreNode[],
    renderListOps: new Uint8Array(64),
    renderListLen: 0,
    renderRequested: false,
    timedNodes: [],
    firstFrameDrawn: true,
    calculateFps: vi.fn(),
    calculateQuads: vi.fn(),
    requestRender: Stage.prototype.requestRender,
    requestRenderListUpdate: Stage.prototype.requestRenderListUpdate,
    buildRenderList: (Stage.prototype as unknown as Record<string, unknown>)
      .buildRenderList,
    pushRenderOp: (Stage.prototype as unknown as Record<string, unknown>)
      .pushRenderOp,
    drawFrame: Stage.prototype.drawFrame,
  };
  const stage = stageObj as unknown as Stage;

  const txMemManager = new TextureMemoryManager(stage, makeMemSettings());
  stageObj.txMemManager = txMemManager;
  txMemManagerRef = txMemManager;

  const txManager = new CoreTextureManager(stage, {
    maxRetryCount: 5,
    createImageBitmapSupport: 'full',
  });
  stageObj.txManager = txManager;
  txManager.renderer = stageObj.renderer as never;

  const root = new CoreNode(stage, makeNodeProps({ w: 1920, h: 1080 }));
  stageObj.root = root;
  return { stage, txManager, txMemManager, root, addQuad };
}

describe('CoreTextNode canvas text — GPU texture lifecycle', () => {
  it('6. each text change creates a new, uncached Texture — keyCache bypass', () => {
    const { stage, txManager, root } = makeDrawFrameHarness();
    const node = new CoreTextNode(
      stage,
      makeTextProps({ parent: root, forceLoad: true, text: '' }),
      makeCanvasTextRenderer(),
    );

    const createTextureSpy = vi.spyOn(txManager, 'createTexture');

    const N = 50;
    for (let i = 0; i < N; i++) {
      node.text = `value-${i}`;
      stage.drawFrame();
    }

    expect(createTextureSpy).toHaveBeenCalledTimes(N);
    expect(node.texture!.cacheKey).toBeNull();
    // ImageTexture.makeCacheKey returns false for non-string src (ImageBitmap
    // here), so createTexture() never calls initTextureToCache() and
    // keyCache never receives a single canvas-text entry.
    expect(txManager.keyCache.size).toBe(0);
  });

  it('7. old texture is freed eagerly on swap', () => {
    const { stage, txMemManager, root } = makeDrawFrameHarness();
    const node = new CoreTextNode(
      stage,
      makeTextProps({ parent: root, forceLoad: true, text: '' }),
      makeCanvasTextRenderer(),
    );

    const freeSpy = vi.spyOn(Texture.prototype, 'free');
    const destroySpy = vi.spyOn(Texture.prototype, 'destroy');

    node.text = 'first';
    stage.drawFrame();
    const firstTexture = node.texture!;
    expect(firstTexture.state).toBe('loaded');

    freeSpy.mockClear();
    destroySpy.mockClear();

    node.text = 'second';
    stage.drawFrame();
    const secondTexture = node.texture!;

    expect(secondTexture).not.toBe(firstTexture);

    // The outgoing texture is freed deterministically as soon as the new one
    // is created, instead of waiting for an LRU cleanup() pass.
    expect(freeSpy).toHaveBeenCalledWith();
    expect(destroySpy).toHaveBeenCalled();
    expect(firstTexture.ctxTexture).toBeUndefined();

    // The orphaned texture is no longer tracked by the memory manager.
    const loadedTextures = (
      txMemManager as unknown as { loadedTextures: (Texture | null)[] }
    ).loadedTextures;
    expect(loadedTextures).not.toContain(firstTexture);
  });

  it('8. node destroy frees the canvas text GL resource', () => {
    const { stage, txMemManager, root } = makeDrawFrameHarness();
    const node = new CoreTextNode(
      stage,
      makeTextProps({ parent: root, forceLoad: true, text: '' }),
      makeCanvasTextRenderer(),
    );

    node.text = 'destroy-me';
    stage.drawFrame();
    const texture = node.texture!;
    expect(texture.state).toBe('loaded');

    const memBefore = txMemManager.getMemoryInfo().memUsed;
    expect(memBefore).toBeGreaterThan(0);

    const destroySpy = vi.spyOn(Texture.prototype, 'destroy');
    node.destroy();

    // Mirrors the SDF path (releaseSdfCache() on destroy): canvas text now
    // has an equivalent release step, so destroy() frees the GL resource.
    expect(destroySpy).toHaveBeenCalled();
    expect(texture.ctxTexture).toBeUndefined();
    expect(node.texture).toBeNull();

    const memAfter = txMemManager.getMemoryInfo().memUsed;
    expect(memAfter).toBeLessThan(memBefore);

    const loadedTextures = (
      txMemManager as unknown as { loadedTextures: (Texture | null)[] }
    ).loadedTextures;
    expect(loadedTextures).not.toContain(texture);
  });

  it('11. releasing a texture that is still mid-upload does not crash or leave a dangling queue entry', () => {
    const { stage, txManager, root } = makeDrawFrameHarness();
    const node = new CoreTextNode(
      stage,
      makeTextProps({ parent: root, forceLoad: true, text: '' }),
      makeCanvasTextRenderer(),
    );

    // Set text but do NOT drawFrame() yet - the texture data resolves
    // synchronously for canvas text, so it's enqueued for GPU upload but
    // still sits in 'loading' state until the upload queue is processed.
    // Run only the tree update (what drawFrame does first) so the texture is
    // created and enqueued without also draining the upload queue.
    node.text = 'in-flight';
    root.update(16, root.clippingRect);
    const texture = node.texture!;
    expect(texture.state).toBe('loading');
    expect(txManager.isProcessingTexture(texture)).toBe(true);

    expect(() => node.destroy()).not.toThrow();

    expect(txManager.isProcessingTexture(texture)).toBe(false);

    // Processing the (now-empty-of-this-texture) queue must not throw either.
    expect(() => stage.drawFrame()).not.toThrow();
  });

  it('13. destroying a texture mid-upload still frees its allocated ctxTexture', () => {
    const { txManager } = makeDrawFrameHarness();

    const texture = txManager.createTexture('ImageTexture', {
      premultiplyAlpha: true,
      src: new (
        globalThis as unknown as { ImageBitmap: new () => unknown }
      ).ImageBitmap(),
    } as never);

    // Allocate the GPU-side resource but leave the texture reporting
    // 'loading', the window a mid-upload teardown lands in.
    const ctx = texture.loadCtxTexture();
    texture.setState('loading');
    expect(texture.ctxTexture).toBeDefined();

    texture.destroy();

    // Gating the free on state === 'loaded' would strand this ctxTexture.
    expect(ctx.free).toHaveBeenCalled();
    expect(texture.ctxTexture).toBeUndefined();
  });

  it('12. a failed re-render keeps the existing texture instead of blanking the node', () => {
    const { stage, root } = makeDrawFrameHarness();
    const textRenderer = makeCanvasTextRenderer();
    const node = new CoreTextNode(
      stage,
      makeTextProps({ parent: root, forceLoad: true, text: 'original' }),
      textRenderer,
    );

    stage.drawFrame();
    const original = node.texture;
    expect(original).not.toBeNull();

    const destroySpy = vi.spyOn(Texture.prototype, 'destroy');

    // Next render fails (zero dimensions). The release happens only after
    // handleRenderResult's validity guards, so the node must keep showing
    // the previously rendered text rather than dropping to no texture.
    (textRenderer.renderText as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      type: 'canvas',
      width: 0,
      height: 0,
      hasRemainingText: false,
      remainingLines: 0,
      renderSource: () => null,
    } as unknown as CanvasRenderInfo);

    node.text = 'triggers-failure';
    stage.drawFrame();

    expect(node.texture).toBe(original);
    expect(destroySpy).not.toHaveBeenCalled();

    destroySpy.mockRestore();
  });

  it('rejects a canvas render result without a source generator', () => {
    const { stage, root } = makeDrawFrameHarness();
    const textRenderer = makeCanvasTextRenderer();
    const node = new CoreTextNode(
      stage,
      makeTextProps({ parent: root, forceLoad: true, text: 'original' }),
      textRenderer,
    );

    stage.drawFrame();
    const original = node.texture;
    const failed = vi.fn();
    node.on('failed', failed);
    (textRenderer.renderText as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      type: 'canvas',
      width: 120,
      height: 40,
      hasRemainingText: false,
      remainingLines: 0,
    } as unknown as CanvasRenderInfo);

    node.text = 'missing-source';
    stage.drawFrame();

    expect(failed).toHaveBeenCalledOnce();
    expect(node.texture).toBe(original);
  });

  it('9. loadedTextures compacts via null-slot reuse under alternating churn — H3 refuted for this pattern', () => {
    const stage = mock<Stage>();
    const txManager = mock<Stage['txManager']>();
    (stage as { txManager: Stage['txManager'] }).txManager = txManager;
    const mgr = new TextureMemoryManager(stage, makeMemSettings());

    const N = 200;
    for (let i = 0; i < N; i++) {
      const texture = mock<Texture>();
      texture.type = TextureType.image;
      texture.state = 'loaded';
      (texture as { renderable: boolean }).renderable = false;
      texture.preventCleanup = false;
      texture.canBeCleanedUp.mockReturnValue(true);

      mgr.setTextureMemUse(texture, 1024);
      mgr.setTextureMemUse(texture, 0);
    }

    const loadedTextures = (
      mgr as unknown as { loadedTextures: (Texture | null)[] }
    ).loadedTextures;

    // setTextureMemUse(tex, 0) nulls the slot, and the very next
    // setTextureMemUse() call for a *different* texture reuses that null
    // slot via indexOf(null) before appending. For this alternating
    // add/remove-immediately pattern the array stays bounded — H3 is
    // refuted here. A more realistic leak-adjacent pattern (many textures
    // added, only a few removed much later via cleanup()) is NOT covered by
    // this test and may behave differently; see findings doc.
    expect(loadedTextures.length).toBeLessThan(N);
  });

  it('9b. loadedTextures grows with the live (not-yet-cleaned) orphan count when removal lags creation', () => {
    const stage = mock<Stage>();
    const txManager = mock<Stage['txManager']>();
    (stage as { txManager: Stage['txManager'] }).txManager = txManager;
    const mgr = new TextureMemoryManager(stage, makeMemSettings());

    // Simulates H2: 200 text changes create 200 orphaned Textures before a
    // single cleanup() pass ever runs (gated on memUsed threshold + 5s
    // cleanupInterval) — i.e. setTextureMemUse(tex, 0) never happens for any
    // of them in this window.
    const N = 200;
    for (let i = 0; i < N; i++) {
      const texture = mock<Texture>();
      texture.type = TextureType.image;
      texture.state = 'loaded';
      (texture as { renderable: boolean }).renderable = false;
      texture.preventCleanup = false;
      texture.canBeCleanedUp.mockReturnValue(true);
      mgr.setTextureMemUse(texture, 1024);
    }

    const loadedTextures = (
      mgr as unknown as { loadedTextures: (Texture | null)[] }
    ).loadedTextures;

    // Array length tracks exactly the number of orphans accumulated since
    // the last cleanup — this is "working as designed" (it is the memory
    // manager's live-tracking list), but it does mean the array's high-water
    // mark scales 1:1 with however many text changes happen between
    // cleanup() passes.
    expect(loadedTextures.length).toBe(N);
  });

  it('10. STARTUP_GRACE_PERIOD blocks reclamation of churned textures (H2 corollary)', () => {
    vi.useFakeTimers();
    try {
      const stage = mock<Stage>();
      const txManager = mock<Stage['txManager']>();
      (stage as { txManager: Stage['txManager'] }).txManager = txManager;
      const mgr = new TextureMemoryManager(
        stage,
        makeMemSettings({ criticalThreshold: 1 }),
      );

      const N = 100;
      const textures: Texture[] = [];
      for (let i = 0; i < N; i++) {
        const texture = mock<Texture>();
        texture.type = TextureType.image;
        texture.state = 'loaded';
        (texture as { renderable: boolean }).renderable = false;
        texture.preventCleanup = false;
        // Use the REAL canBeCleanedUp()-equivalent gating behavior: freshly
        // created textures (createdAt === Date.now()) are within the 2s
        // grace period, so canBeCleanedUp() should report false.
        texture.canBeCleanedUp.mockImplementation(() => {
          return (
            Date.now() -
              (texture as unknown as { createdAt: number }).createdAt >=
            2000
          );
        });
        (texture as unknown as { createdAt: number }).createdAt = Date.now();
        mgr.setTextureMemUse(texture, 1024);
        textures.push(texture);
        vi.advanceTimersByTime(10); // 100 textures over 1s — well inside the 2s window
      }

      mgr.cleanup(true);

      const destroyedCount = textures.filter(
        (t) => (t.destroy as ReturnType<typeof vi.fn>).mock.calls.length > 0,
      ).length;

      // Expected: 0 — every texture is still within its 2s grace period, so
      // canBeCleanedUp() short-circuits and cleanup(true) (a "full" pass)
      // destroys none of them even though we explicitly asked for a full
      // cleanup.
      expect(destroyedCount).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
