import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebPlatform } from './WebPlatform.js';
import { WebGlContextWrapper } from './WebGlContextWrapper.js';
import type { Stage } from '../../Stage.js';

describe('WebPlatform WebGL context events', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('prevents default restoration suppression and starts one new loop', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));

    const canvas = new EventTarget();
    const frameEvents: string[] = [];
    const glw = Object.create(
      WebGlContextWrapper.prototype,
    ) as WebGlContextWrapper;
    glw.isContextLost = vi.fn(() => true);
    const platform = Object.create(WebPlatform.prototype) as WebPlatform;
    Object.assign(platform, {
      canvas,
      glw,
      loopGeneration: 0,
      _imageWorkerManager: null,
      detachContextEvents: null,
      frameHandle: null,
      timerHandle: null,
    });
    const stage = {
      contextState: 'running',
      renderer: { mode: 'webgl' },
      onContextLost: vi.fn(() => {
        stage.contextState = 'lost';
      }),
      onContextRestored: vi.fn(() => {
        stage.contextState = 'running';
        return true;
      }),
      targetFrameTime: 0,
      updateFrameTime: vi.fn(),
      updateAnimations: vi.fn(),
      hasSceneUpdates: vi.fn(() => true),
      drawFrame: vi.fn(() => frameEvents.push('draw')),
      flushFrameEvents: vi.fn(() => frameEvents.push('flush')),
      onRecoveryFrameCompleted: vi.fn(() => frameEvents.push('restored')),
    } as unknown as Stage;

    platform.startLoop(stage);
    expect(frames.size).toBe(1);
    const initialFrame = frames.get(nextId);
    frames.delete(nextId);
    if (initialFrame === undefined) throw new Error('Expected initial frame');
    initialFrame(16);
    expect(glw.isContextLost).not.toHaveBeenCalled();
    expect(stage.drawFrame).toHaveBeenCalledOnce();
    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(stage.onContextLost).toHaveBeenCalledOnce();

    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(stage.onContextRestored).toHaveBeenCalledOnce();
    expect(stage.onRecoveryFrameCompleted).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    const recoveryFrame = frames.get(nextId);
    frames.delete(nextId);
    if (recoveryFrame === undefined) throw new Error('Expected recovery frame');
    recoveryFrame(32);
    expect(stage.drawFrame).toHaveBeenCalledTimes(2);
    expect(stage.onRecoveryFrameCompleted).toHaveBeenCalledOnce();
    expect(frameEvents.slice(-3)).toEqual(['draw', 'flush', 'restored']);
    expect(glw.isContextLost).not.toHaveBeenCalled();

    const nextFrame = frames.get(nextId);
    frames.delete(nextId);
    if (nextFrame === undefined) throw new Error('Expected next frame');
    vi.mocked(stage.drawFrame).mockImplementationOnce(() => {
      throw new Error('draw failed');
    });
    expect(() => nextFrame(48)).toThrow('draw failed');
    expect(glw.isContextLost).not.toHaveBeenCalled();

    platform.stopLoop();
    expect(frames.size).toBe(0);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(stage.onContextRestored).toHaveBeenCalledOnce();
  });

  it('handles failed and canceled recovery frames without entering the normal loop', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));

    const canvas = new EventTarget();
    const platform = Object.create(WebPlatform.prototype) as WebPlatform;
    Object.assign(platform, {
      canvas,
      loopGeneration: 0,
      _imageWorkerManager: null,
      detachContextEvents: null,
      frameHandle: null,
      timerHandle: null,
    });
    const stage = {
      contextState: 'running',
      renderer: { mode: 'webgl' },
      onContextLost: vi.fn(() => {
        stage.contextState = 'lost';
      }),
      onContextRestored: vi.fn(() => {
        stage.contextState = 'running';
        return true;
      }),
      onRecoveryFrameFailed: vi.fn(() => {
        stage.contextState = 'failed';
        return true;
      }),
      onRecoveryFrameCompleted: vi.fn(),
      updateFrameTime: vi.fn(),
      updateAnimations: vi.fn(),
      drawFrame: vi.fn(() => {
        throw new Error('recovery failed');
      }),
    } as unknown as Stage;

    platform.startLoop(stage);
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    const failedFrame = frames.get(nextId);
    frames.delete(nextId);
    if (failedFrame === undefined) throw new Error('Expected recovery frame');
    failedFrame(16);
    expect(stage.onRecoveryFrameFailed).toHaveBeenCalledOnce();
    expect(stage.onRecoveryFrameCompleted).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);

    canvas.dispatchEvent(new Event('webglcontextrestored'));
    const canceledFrame = frames.get(nextId);
    if (canceledFrame === undefined) throw new Error('Expected retry frame');
    platform.stopLoop();
    canceledFrame(32); // A callback already dispatched before cancellation.
    expect(stage.drawFrame).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it('does not report a superseded recovery frame as a current failure', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));

    const canvas = new EventTarget();
    const platform = Object.create(WebPlatform.prototype) as WebPlatform;
    Object.assign(platform, {
      canvas,
      loopGeneration: 0,
      _imageWorkerManager: null,
      detachContextEvents: null,
      frameHandle: null,
      timerHandle: null,
    });
    const stage = {
      contextState: 'running',
      renderer: { mode: 'webgl' },
      onContextLost: vi.fn(() => {
        stage.contextState = 'lost';
      }),
      onContextRestored: vi.fn(() => {
        stage.contextState = 'running';
        return true;
      }),
      onRecoveryFrameFailed: vi.fn(),
      onRecoveryFrameCompleted: vi.fn(),
      updateFrameTime: vi.fn(),
      updateAnimations: vi.fn(),
      drawFrame: vi.fn(() => {
        platform.stopLoop();
        throw new Error('old frame failed');
      }),
    } as unknown as Stage;

    platform.startLoop(stage);
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    const recoveryFrame = frames.get(nextId);
    frames.delete(nextId);
    if (recoveryFrame === undefined) throw new Error('Expected recovery frame');
    expect(() => recoveryFrame(16)).not.toThrow();
    expect(stage.contextState).toBe('running');
    expect(stage.onRecoveryFrameFailed).not.toHaveBeenCalled();
    expect(stage.onRecoveryFrameCompleted).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it('finishes the current frame without rescheduling after a callback stops the loop', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));

    const platform = Object.create(WebPlatform.prototype) as WebPlatform;
    Object.assign(platform, {
      loopGeneration: 0,
      frameHandle: null,
      timerHandle: null,
      detachContextEvents: null,
      _imageWorkerManager: null,
    });
    const stage = {
      contextState: 'running',
      renderer: { mode: 'canvas' },
      targetFrameTime: 0,
      updateFrameTime: vi.fn(),
      updateAnimations: vi.fn(),
      hasSceneUpdates: vi.fn(() => true),
      drawFrame: vi.fn(),
      flushFrameEvents: vi.fn(() => platform.stopLoop()),
    } as unknown as Stage;

    platform.startLoop(stage);
    const frame = frames.get(nextId);
    frames.delete(nextId);
    if (frame === undefined) throw new Error('Expected a frame');
    frame(16);
    expect(stage.drawFrame).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it('does not update or draw after a frameTick callback suspends the stage', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));

    const platform = Object.create(WebPlatform.prototype) as WebPlatform;
    Object.assign(platform, {
      loopGeneration: 0,
      frameHandle: null,
      timerHandle: null,
      detachContextEvents: null,
      _imageWorkerManager: null,
    });
    const stage = {
      contextState: 'running',
      renderer: { mode: 'canvas' },
      targetFrameTime: 0,
      updateFrameTime: vi.fn(() => {
        stage.contextState = 'lost';
      }),
      updateAnimations: vi.fn(),
      drawFrame: vi.fn(),
    } as unknown as Stage;

    platform.startLoop(stage);
    const frame = frames.get(nextId);
    frames.delete(nextId);
    if (frame === undefined) throw new Error('Expected a frame');
    frame(16);
    expect(stage.updateAnimations).not.toHaveBeenCalled();
    expect(stage.drawFrame).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    platform.stopLoop();
  });
});
