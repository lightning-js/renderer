import { describe, expect, it, vi } from 'vitest';
import { Stage } from './Stage.js';

function makeStage() {
  const events: Array<[string, unknown]> = [];
  const stage = Object.create(Stage.prototype) as Stage;
  const renderer = {
    mode: 'webgl',
    restoreContext: vi.fn(),
    rttNodes: [{ hasRTTupdates: false }],
  };
  Object.assign(stage, {
    contextState: 'running',
    contextSuspended: false,
    contextGeneration: 0,
    contextLostAt: 0,
    pendingRestoreEvent: false,
    platform: {
      getTimeStamp: () => 200,
      glw: { isContextLost: vi.fn(() => true) },
      suspendFrameLoop: vi.fn(),
    },
    renderer,
    txManager: { invalidateContext: vi.fn(), restoreContext: vi.fn() },
    txMemManager: { invalidateContext: vi.fn() },
    shManager: { restoreContext: vi.fn() },
    root: { setUpdateType: vi.fn() },
    eventBus: {
      emit: (name: string, data: unknown) => events.push([name, data]),
    },
    renderListDirty: false,
    renderRequested: false,
    options: { enableDirtyRepaints: false },
    lastFrameTime: 10,
    currentFrameTime: 10,
  });
  return { stage, renderer, events };
}

describe('WebGL context recovery', () => {
  it('invalidates once per loss and restores scene state without replacing references', () => {
    const { stage, renderer, events } = makeStage();
    stage.onContextLost();
    stage.onContextLost();
    expect(stage.contextState).toBe('lost');
    expect(events.map(([event]) => event)).toEqual(['contextLost']);
    expect(stage.txManager.invalidateContext).toHaveBeenCalledOnce();

    expect(stage.onContextRestored()).toBe(true);
    expect(stage.contextState).toBe('running');
    expect(renderer.restoreContext).toHaveBeenCalledOnce();
    expect(renderer.rttNodes[0]?.hasRTTupdates).toBe(true);
    expect(stage.lastFrameTime).toBe(0);
    expect(stage.root.setUpdateType).toHaveBeenCalled();
    expect(events.map(([event]) => event)).toEqual(['contextLost']);
  });

  it('reports failed reinitialisation and does not resume GPU work', () => {
    const { stage, renderer, events } = makeStage();
    renderer.restoreContext.mockImplementation(() => {
      throw new Error('no context');
    });
    stage.onContextLost();
    stage.onContextRestored();
    expect(stage.contextState).toBe('failed');
    expect(events.map(([event]) => event)).toEqual([
      'contextLost',
      'contextRestoreFailed',
    ]);
    expect(stage.txManager.restoreContext).not.toHaveBeenCalled();
  });

  it('uses the generic renderer hook without assuming a WebGL renderer', () => {
    const { stage, renderer } = makeStage();
    renderer.mode = 'canvas';
    stage.onContextLost();
    expect(stage.onContextRestored()).toBe(true);
    expect(renderer.restoreContext).toHaveBeenCalledOnce();
  });

  it('reports an unsupported renderer instead of calling WebGL code', () => {
    const { stage, renderer, events } = makeStage();
    Object.assign(renderer, { restoreContext: undefined });
    stage.onContextLost();
    expect(stage.onContextRestored()).toBe(false);
    expect(stage.contextState).toBe('failed');
    expect(events.map(([event]) => event)).toEqual([
      'contextLost',
      'contextRestoreFailed',
    ]);
  });

  it('suspends the platform loop on loss so GL-error paths cancel stale frames', () => {
    const { stage } = makeStage();
    stage.onContextLost();
    expect(stage.platform.suspendFrameLoop).toHaveBeenCalledOnce();
    stage.onContextLost();
    expect(stage.platform.suspendFrameLoop).toHaveBeenCalledOnce();
  });

  it('reports restored only after the first recovery frame', () => {
    const { stage, renderer, events } = makeStage();
    stage.onContextLost();
    stage.drawFrame(); // A lost context must not submit a frame.
    stage.onContextRestored();
    expect(events.map(([event]) => event)).toEqual(['contextLost']);

    Object.assign(stage, {
      root: { updateType: 0 },
      renderListDirty: false,
      renderListNodes: [],
      renderListLen: 0,
      timedNodes: [],
      firstFrameDrawn: true,
      calculateFps: vi.fn(),
      calculateQuads: vi.fn(),
    });
    Object.assign(renderer, {
      rttNodes: [],
      reset: vi.fn(),
      render: vi.fn(),
    });
    Object.assign(stage.txManager, { hasUpdates: () => false });
    Object.assign(stage.txMemManager, { criticalCleanupRequested: false });
    stage.drawFrame();
    expect(events.map(([event]) => event)).toEqual(['contextLost']);
    expect(stage.platform.glw?.isContextLost).not.toHaveBeenCalled();
    stage.onRecoveryFrameCompleted();
    expect(events.map(([event]) => event)).toEqual([
      'contextLost',
      'contextRestored',
    ]);
    expect(events[1]?.[1]).toEqual({ generation: 1, duration: 0 });
  });

  it('reports an overdue restoration but still accepts a late browser event', () => {
    vi.useFakeTimers();
    try {
      const { stage, events } = makeStage();
      Object.assign(stage, { options: { contextRestoreTimeout: 50 } });
      stage.onContextLost();
      vi.advanceTimersByTime(51);
      expect(stage.contextState).toBe('lost');
      expect(events.map(([event]) => event)).toEqual([
        'contextLost',
        'contextRestoreFailed',
      ]);
      stage.onContextRestored();
      expect(stage.contextState).toBe('running');
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a failed first recovery frame and gates subsequent draws', () => {
    const { stage, events } = makeStage();
    stage.onContextLost();
    stage.onContextRestored();
    expect(stage.onRecoveryFrameFailed(new Error('frame failed'))).toBe(true);
    expect(stage.contextState).toBe('failed');
    expect(events.map(([event]) => event)).toEqual([
      'contextLost',
      'contextRestoreFailed',
    ]);
    expect(stage.onRecoveryFrameFailed(new Error('later'))).toBe(false);
  });
});
