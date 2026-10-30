import { describe, expect, it, vi } from 'vitest';
import { CoreTextureManager } from './CoreTextureManager.js';
import { CoreNode, UpdateType } from './CoreNode.js';
import { CoreTextNode } from './CoreTextNode.js';
import { Stage } from './Stage.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { createBound } from './lib/utils.js';
import type { Texture } from './textures/Texture.js';
import {
  makeMockStage,
  makeNodeProps,
  makeTextProps,
} from '../../test/mockStage.js';

class FakeLoadedTexture extends EventEmitter {
  state = 'loading';
  textureData = { data: new Uint8Array([0, 0, 0, 0]), premultiplyAlpha: true };
  dimensions: { w: number; h: number } | null = null;
  error: unknown = null;
  preventCleanup = false;
  cacheKey: string | null = null;
  renderableOwners = new Set<string | number>();
  retryCount = 0;
  maxRetryCount = 5;

  constructor(private loadedW = 8, private loadedH = 8) {
    super();
  }

  setState(state: string, payload?: { w: number; h: number }): void {
    this.state = state;
    if (state === 'loaded' && payload !== undefined) {
      this.dimensions = payload;
    }
    this.emit(state, payload);
  }

  setRenderableOwner(_id: string | number, _renderable: boolean): void {}

  loadCtxTexture(): { state: string; load: () => void } {
    return {
      state: 'freed',
      load: (): void => {
        this.setState('loaded', { w: this.loadedW, h: this.loadedH });
      },
    };
  }
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
  const root = new CoreNode(stage, makeNodeProps({ w: 1920, h: 1080 }));
  stageObj.root = root;
  return { stage, txManager, root, addQuad };
}

describe('Plan 1 texture upload latency', () => {
  it('processSome uploads to GPU synchronously with no microtask hop', () => {
    const stage = {
      contextState: 'running',
      contextGeneration: 0,
      platform: { getTimeStamp: () => 0 },
      txMemManager: {
        doNotExceedCriticalThreshold: false,
        criticalCleanupRequested: false,
      },
    } as unknown as Stage;
    const manager = new CoreTextureManager(stage, {
      maxRetryCount: 5,
      createImageBitmapSupport: 'full',
    });
    const texture = new FakeLoadedTexture() as unknown as Texture;
    manager.enqueueUploadTexture(texture);

    const result = manager.processSome(1000, 10);

    expect(result).toBe(undefined);
    expect(texture.state).toBe('loaded');
    expect(manager.hasUpdates()).toBe(false);
  });

  it('uploadTexture returns void and sets loaded state synchronously', () => {
    const stage = {
      contextState: 'running',
      contextGeneration: 0,
      platform: { getTimeStamp: () => 0 },
      txMemManager: {
        doNotExceedCriticalThreshold: false,
        criticalCleanupRequested: false,
      },
    } as unknown as Stage;
    const manager = new CoreTextureManager(stage, {
      maxRetryCount: 5,
      createImageBitmapSupport: 'full',
    });
    const texture = new FakeLoadedTexture() as unknown as Texture;

    const result = manager.uploadTexture(texture);

    expect(result).toBe(undefined);
    expect(texture.state).toBe('loaded');
  });

  it('CoreNode.loadTexture attaches texture listeners synchronously', () => {
    const stage = makeMockStage();
    const texture = new FakeLoadedTexture() as unknown as Texture;
    const onSpy = vi.spyOn(texture, 'on');

    const node = new CoreNode(stage, makeNodeProps({ src: null, texture }));
    void node;

    expect(onSpy.mock.calls.length).toBe(3);
    expect(onSpy.mock.calls[0]?.[0]).toBe('loaded');
    expect(onSpy.mock.calls[1]?.[0]).toBe('failed');
    expect(onSpy.mock.calls[2]?.[0]).toBe('freed');
  });

  it('CoreNode.loadTexture fires loaded handler on next microtask for cached textures', async () => {
    const stage = makeMockStage();
    const texture = new FakeLoadedTexture() as unknown as Texture;
    texture.setState('loaded', { w: 8, h: 8 });

    const node = new CoreNode(stage, makeNodeProps({ src: null, texture }));
    node.updateType = 0;

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(node.updateType & UpdateType.IsRenderable).toBe(
      UpdateType.IsRenderable,
    );
  });

  it('Stage.drawFrame uploads queued texture, marks node renderable, and calls renderer.addQuad in the same frame', () => {
    const { stage, txManager, root, addQuad } = makeDrawFrameHarness();
    const texture = new FakeLoadedTexture(120, 80) as unknown as Texture;
    const node = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 120, h: 80, src: null, texture }),
    );
    txManager.enqueueUploadTexture(texture);

    expect(node.isRenderable).toBe(false);

    stage.drawFrame();

    expect(texture.state).toBe('loaded');
    expect(node.isRenderable).toBe(true);
    expect(addQuad).toHaveBeenCalledWith(node);
  });

  it('Stage.drawFrame updates autosize and resizeMode:contain dimensions/transforms in the same frame', () => {
    const { stage, txManager, root, addQuad } = makeDrawFrameHarness();
    const autoTex = new FakeLoadedTexture(240, 140) as unknown as Texture;
    const containTex = new FakeLoadedTexture(200, 100) as unknown as Texture;

    const autoNode = new CoreNode(
      stage,
      makeNodeProps({
        parent: root,
        autosize: true,
        src: null,
        texture: autoTex,
      }),
    );
    const containNode = new CoreNode(
      stage,
      makeNodeProps({
        parent: root,
        w: 100,
        h: 100,
        src: null,
        texture: containTex,
        textureOptions: { resizeMode: { type: 'contain' } },
      }),
    );

    txManager.enqueueUploadTexture(autoTex);
    txManager.enqueueUploadTexture(containTex);

    stage.drawFrame();

    expect(autoNode.w).toBe(240);
    expect(autoNode.h).toBe(140);
    expect(autoNode.isRenderable).toBe(true);
    expect(addQuad).toHaveBeenCalledWith(autoNode);

    expect(containNode.isRenderable).toBe(true);
    expect(containNode.localTransform?.ty).toBe(25);
    expect(containNode.localTransform?.td).toBe(0.5);
    expect(addQuad).toHaveBeenCalledWith(containNode);
  });

  it('CoreTextNode.onTextureLoaded requests render and marks quad dirty', () => {
    const stage = makeMockStage({
      options: { enableDirtyRepaints: true } as Stage['options'],
      requestRender: vi.fn(),
    } as Partial<Stage>);
    const textRenderer = {
      type: 'sdf',
      font: {
        isFontLoaded: vi.fn().mockReturnValue(true),
        waitingForFont: vi.fn(),
        stopWaitingForFont: vi.fn(),
      },
      renderText: vi.fn(),
      addQuads: vi.fn(),
      renderQuads: vi.fn(),
    } as never;
    const node = new CoreTextNode(stage, makeTextProps(), textRenderer);
    const texture = new FakeLoadedTexture() as unknown as Texture;

    (
      node as unknown as {
        onTextureLoaded: (t: Texture, d: { w: number; h: number }) => void;
      }
    ).onTextureLoaded(texture, { w: 10, h: 10 });

    expect(
      (stage.requestRender as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(1);
    expect(node.isQuadDirty).toBe(true);
    expect(node.updateType & UpdateType.IsRenderable).toBe(
      UpdateType.IsRenderable,
    );
  });
});
