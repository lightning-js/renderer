/*
 * Copyright 2026 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoreShaderManager } from './CoreShaderManager.js';
import type { Stage } from './Stage.js';
import type { CoreShaderProgram } from './renderers/CoreShaderProgram.js';

function makeProgram(): CoreShaderProgram & {
  destroy: ReturnType<typeof vi.fn>;
} {
  return {
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
  };
}

function makeStage(
  opts: {
    mode?: 'webgl' | 'canvas';
    createProgramImpl?: (shType: any, props: any) => CoreShaderProgram | null;
  } = {},
) {
  const programs: CoreShaderProgram[] = [];
  const renderer = {
    mode: opts.mode ?? 'webgl',
    supportsShaderType: vi.fn().mockReturnValue(true),
    createShaderProgram: vi.fn(
      (shType: any, props: any): CoreShaderProgram | null => {
        if (opts.createProgramImpl) {
          return opts.createProgramImpl(shType, props);
        }
        const p = makeProgram();
        programs.push(p);
        return p;
      },
    ),
    createShaderNode: vi.fn(
      (shaderKey: string, shType: any, props: any, program: any) =>
        ({ shaderKey, shType, props, program } as any),
    ),
  };
  const stage = {
    renderer,
    defShaderNode: { shaderKey: 'default' },
    requestRender: vi.fn(),
  } as unknown as Stage;
  return { stage, renderer, programs };
}

describe('CoreShaderManager dynamic runtime shaders', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('reuses compiled programs via createShader', () => {
    const { stage, renderer } = makeStage();
    const manager = new CoreShaderManager(stage);
    manager.registerShaderType('Live', { fragment: 'v1' } as any);

    manager.createShader('Live' as never);
    manager.createShader('Live' as never);

    expect(renderer.createShaderProgram).toHaveBeenCalledTimes(1);
  });

  it('unregister destroys cached programs including cache-marker variants', () => {
    const { stage } = makeStage();
    const manager = new CoreShaderManager(stage);
    manager.registerShaderType('Grad', {
      fragment: 'src',
      props: { colors: [0xffffffff] },
      getCacheMarkers: (props: any) => `colors:${props.colors.length}`,
    } as any);

    manager.createShader('Grad' as never, { colors: [1] } as any);
    manager.createShader('Grad' as never, { colors: [1, 2] } as any);
    const cache = (manager as any).shCache as Map<string, CoreShaderProgram>;
    expect(cache.size).toBe(2);
    const destroyed = [...cache.values()].map(
      (p) => p.destroy as ReturnType<typeof vi.fn>,
    );

    manager.unregisterShaderType('Grad');

    expect(destroyed[0]).toHaveBeenCalledTimes(1);
    expect(destroyed[1]).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(0);
    // Same name can be registered again after unregister
    manager.registerShaderType('Grad', { fragment: 'v2' } as any);
    expect((manager as any).shTypes['Grad']).toBeDefined();
  });

  it('update replaces the definition so next createShader compiles new source', () => {
    const seen: unknown[] = [];
    const { stage, renderer } = makeStage({
      createProgramImpl: (shType) => {
        seen.push((shType as any).fragment);
        return makeProgram();
      },
    });
    const manager = new CoreShaderManager(stage);
    manager.registerShaderType('Live', { fragment: 'v1' } as any);
    manager.createShader('Live' as never);

    manager.updateShaderType('Live', { fragment: 'v2' } as any);
    manager.createShader('Live' as never);

    expect(seen).toEqual(['v1', 'v2']);
    expect(renderer.createShaderProgram).toHaveBeenCalledTimes(2);
  });

  it('falls back to default shader when compilation throws', () => {
    const { stage } = makeStage({
      createProgramImpl: () => {
        throw new Error('compile failed');
      },
    });
    const manager = new CoreShaderManager(stage);
    manager.registerShaderType('Bad', { fragment: 'bad glsl' } as any);

    const node = manager.createShader('Bad' as never);

    expect(node).toBe(stage.defShaderNode);
    expect(console.warn).toHaveBeenCalled();
  });

  it('unregister of unknown name warns without throwing', () => {
    const { stage } = makeStage();
    const manager = new CoreShaderManager(stage);
    expect(() => manager.unregisterShaderType('Missing')).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });
});
