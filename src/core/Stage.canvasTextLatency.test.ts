import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CoreTextureManager } from './CoreTextureManager.js';
import { CoreNode, UpdateType } from './CoreNode.js';
import { CoreTextNode } from './CoreTextNode.js';
import { ImageTexture } from './textures/ImageTexture.js';
import type { Texture } from './textures/Texture.js';
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

function makeImageTextureProps(src: unknown) {
  return ImageTexture.resolveDefaults({
    src: src as never,
    maxRetryCount: 5,
  });
}

function makeTxManager(stageOverrides: Record<string, unknown> = {}) {
  const stage = {
    contextState: 'running',
    contextGeneration: 0,
    platform: { getTimeStamp: () => 0 },
    txMemManager: {
      doNotExceedCriticalThreshold: false,
      criticalCleanupRequested: false,
    },
    ...stageOverrides,
  } as unknown as Stage;
  const manager = new CoreTextureManager(stage, {
    maxRetryCount: 5,
    createImageBitmapSupport: 'full',
  });
  return { stage, manager };
}

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
          imageData: new (
            globalThis as unknown as { ImageBitmap: new () => unknown }
          ).ImageBitmap(),
        }) as unknown as CanvasRenderInfo,
    ),
    addQuads: vi.fn(),
    renderQuads: vi.fn(),
  } as unknown as TextRenderer;
}

function makeDrawFrameHarness() {
  const addQuad = vi.fn();
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
          texture.setState('loaded', { w: 120, h: 40 });
        },
      }),
    },
    renderListDirty: true,
    renderListNodes: [] as CoreNode[],
    renderListOps: new Uint8Array(64),
    renderListLen: 0,
    renderRequested: false,
    timedNodes: [],
    txMemManager: {
      doNotExceedCriticalThreshold: false,
      criticalCleanupRequested: false,
    },
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
  const txManager = new CoreTextureManager(stage, {
    maxRetryCount: 5,
    createImageBitmapSupport: 'full',
  });
  stageObj.txManager = txManager;
  txManager.renderer = stageObj.renderer as never;
  const root = new CoreNode(stage, makeNodeProps({ w: 1920, h: 1080 }));
  stageObj.root = root;
  return { stage, txManager, root, addQuad };
}

describe('Plan 2 canvas text latency', () => {
  it('returns in-memory texture data synchronously without a Promise', () => {
    const { manager } = makeTxManager();
    const bitmap = new FakeBitmap();
    const texture = new ImageTexture(manager, makeImageTextureProps(bitmap));

    const result = texture.getTextureSource();

    expect(result instanceof Promise).toBe(false);
    if (result instanceof Promise) {
      throw new Error('unreachable');
    }
    expect(result.data).toBe(bitmap as never);
  });

  it('keeps URL texture sources asynchronous', async () => {
    const bitmap = new FakeBitmap();
    const txManager = {
      platform: {
        loadImage: vi.fn(() =>
          Promise.resolve({ data: bitmap, premultiplied: true }),
        ),
      },
      renderer: { mode: 'webgl' },
    } as never;
    const texture = new ImageTexture(
      txManager,
      makeImageTextureProps('https://example.com/a.png'),
    );

    const result = texture.getTextureSource();

    expect(result instanceof Promise).toBe(true);
    if (!(result instanceof Promise)) {
      throw new Error('unreachable');
    }
    const data = await result;
    expect(data.data).toBe(bitmap as never);
  });

  it('populates textureData synchronously for in-memory sources', () => {
    const { manager } = makeTxManager();
    const bitmap = new FakeBitmap();
    const texture = new ImageTexture(manager, makeImageTextureProps(bitmap));

    const result = texture.getTextureData();

    expect(result instanceof Promise).toBe(false);
    expect(texture.textureData).not.toBe(null);
    expect(texture.getTextureData()).toBe(result);
  });

  it('enqueues in-memory image textures synchronously during loadTexture', () => {
    const { manager } = makeTxManager();
    const texture = new ImageTexture(
      manager,
      makeImageTextureProps(new FakeBitmap()),
    ) as unknown as Texture;

    manager.loadTexture(texture);

    expect(manager.hasUpdates()).toBe(true);
  });

  it('shows canvas text in the same frame the text is set from empty', () => {
    const { stage, root, addQuad } = makeDrawFrameHarness();
    const node = new CoreTextNode(
      stage,
      makeTextProps({ parent: root, forceLoad: true, text: '' }),
      makeCanvasTextRenderer(),
    );

    node.text = 'hello';
    stage.drawFrame();

    expect(node.isRenderable).toBe(true);
    expect(node.texture).not.toBe(null);
    expect(node.texture!.state).toBe('loaded');
    expect(addQuad).toHaveBeenCalledWith(node);
  });

  it('moves from text A to text B with a single frame of difference', () => {
    const { stage, root, addQuad } = makeDrawFrameHarness();
    const node = new CoreTextNode(
      stage,
      makeTextProps({ parent: root, forceLoad: true, text: '' }),
      makeCanvasTextRenderer(),
    );

    node.text = 'banana';
    stage.drawFrame();
    const bananaTexture = node.texture;
    expect(node.isRenderable).toBe(true);
    expect(bananaTexture).not.toBe(null);
    expect(bananaTexture!.state).toBe('loaded');
    const bananaDraws = (addQuad.mock.calls as unknown[][]).filter(
      (call) => call[0] === node,
    ).length;
    expect(bananaDraws).toBe(1);

    addQuad.mockClear();
    node.text = 'strawberry';
    stage.drawFrame();

    expect(node.texture).not.toBe(null);
    expect(node.texture).not.toBe(bananaTexture);
    expect(node.texture!.state).toBe('loaded');
    expect(node.isRenderable).toBe(true);
    expect(node.updateType & UpdateType.IsRenderable).toBe(0);
    const strawberryDraws = (addQuad.mock.calls as unknown[][]).filter(
      (call) => call[0] === node,
    ).length;
    expect(strawberryDraws).toBe(1);
  });

  it('loads RenderTexture synchronously despite null source data', () => {
    const { txManager } = makeDrawFrameHarness();
    const rt = txManager.createTexture('RenderTexture', { w: 64, h: 64 });

    txManager.loadTexture(rt);

    expect(rt.state).toBe('loaded');
  });
});
