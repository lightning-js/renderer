/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
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

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RendererMain } from './Renderer.js';
import type { Platform } from '../core/platforms/Platform.js';
import type { Inspector } from './Inspector.js';
import type { CanvasRenderer } from '../core/renderers/canvas/CanvasRenderer.js';
import type { WebGlRenderer } from '../core/renderers/webgl/WebGlRenderer.js';
import type { AnimationManager } from '../core/animations/AnimationManager.js';

// Mock isProductionEnvironment so the Inspector gets initialized
vi.mock('../utils.js', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../utils.js');
  return {
    ...actual,
    isProductionEnvironment: false,
  };
});

// Mock Stage to avoid real WebGL/Canvas renderer setup
vi.mock('../core/Stage.js', () => {
  const mockStage = {
    root: {
      id: 1,
      children: [],
      props: {},
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    txManager: { destroy: vi.fn() },
  };
  return {
    Stage: vi.fn(() => mockStage),
  };
});

/**
 * Minimal platform mock: returns a real <canvas> element so the Renderer
 * can set its width/height and append it to the target.
 */
function makeMockPlatform() {
  const canvas = document.createElement('canvas');
  return vi.fn().mockReturnValue({ canvas, settings: {}, glw: null });
}

/** Convenience: construct RendererMain with the minimum required settings. */
function makeRenderer(
  target: HTMLElement,
  extra: Partial<{
    inspector: typeof Inspector | false;
  }> = {},
) {
  const MockPlatform = makeMockPlatform();
  const MockAnimationManager = vi.fn(() => ({
    update: vi.fn(),
    animateNode: vi.fn(),
  })) as unknown as new () => AnimationManager;
  return new RendererMain(
    {
      appWidth: 1920,
      appHeight: 1080,
      inspector: extra.inspector ?? false,
      platform: MockPlatform as unknown as typeof Platform,
      animationManager: MockAnimationManager,
      renderEngine: {} as unknown as
        | typeof CanvasRenderer
        | typeof WebGlRenderer,
    },
    target,
  );
}

describe('RendererMain.close()', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    vi.clearAllMocks();
  });

  afterEach(() => {
    target.remove();
  });

  it('should call inspector.destroy() when close() is called', () => {
    const inspectorDestroy = vi.fn();
    const MockInspector = vi.fn(() => ({ destroy: inspectorDestroy }));

    const renderer = makeRenderer(target, {
      inspector: MockInspector as unknown as typeof Inspector,
    });

    renderer.close();

    expect(inspectorDestroy).toHaveBeenCalledOnce();
  });

  it('should call stage.destroy() when close() is called', async () => {
    const { Stage } = await import('../core/Stage.js');
    const renderer = makeRenderer(target);

    const mockStageInstance = vi.mocked(Stage).mock.results[0]?.value as {
      destroy: ReturnType<typeof vi.fn>;
    };

    renderer.close();

    expect(mockStageInstance?.destroy).toHaveBeenCalledOnce();
  });

  it('should remove the canvas from the DOM when close() is called', () => {
    const renderer = makeRenderer(target);
    const canvas = renderer.canvas;

    expect(target.contains(canvas)).toBe(true);

    renderer.close();

    expect(document.contains(canvas)).toBe(false);
  });

  it('should not throw when close() is called a second time', () => {
    const MockInspector = vi.fn(() => ({ destroy: vi.fn() }));

    const renderer = makeRenderer(target, {
      inspector: MockInspector as unknown as typeof Inspector,
    });

    renderer.close();

    // inspector is set to null after close(); the ?. guard must handle it
    expect(() => renderer.close()).not.toThrow();
  });
});
