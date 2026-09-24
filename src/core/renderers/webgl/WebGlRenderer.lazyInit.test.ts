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
 * Startup-path regression tests: expensive GL queries and SDF buffer
 * allocation must not run in the WebGlRenderer constructor. They are
 * initialized lazily on first access instead.
 */
import { describe, expect, it, vi } from 'vitest';
import { WebGlRenderer } from './WebGlRenderer.js';
import { SdfBuffer } from './SdfBuffer.js';
import type { Stage } from '../../Stage.js';

const makeGlwMock = () => ({
  viewport: vi.fn(),
  clearColor: vi.fn(),
  setBlend: vi.fn(),
  blendFunc: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  elementArrayBufferData: vi.fn(),
  arrayBufferData: vi.fn(),
  getParameter: vi.fn(() => 0),
  getExtension: vi.fn(() => null),
  ONE: 1,
  ONE_MINUS_SRC_ALPHA: 2,
  STATIC_DRAW: 3,
  DYNAMIC_DRAW: 4,
  FLOAT: 5,
  UNSIGNED_BYTE: 6,
});

const makeRenderer = () => {
  const glw = makeGlwMock();
  const stage = {
    options: { quadBufferSize: 4096, enableDirtyRepaints: false },
    platform: {
      canvas: { width: 1920, height: 1080 },
      createContext: () => glw,
    },
    clearColor: 0,
    bufferMemory: 8000,
  } as unknown as Stage;
  const renderer = new WebGlRenderer(stage);
  return { renderer, glw };
};

describe('WebGlRenderer lazy startup init', () => {
  it('does not enumerate GL parameters/extensions in the constructor', () => {
    const { renderer, glw } = makeRenderer();
    expect(glw.getParameter).not.toHaveBeenCalled();
    expect(glw.getExtension).not.toHaveBeenCalled();
    expect((renderer as any)._system).toBeNull();
  });

  it('enumerates GL parameters/extensions once on first system access', () => {
    const { renderer, glw } = makeRenderer();
    const first = renderer.system;
    expect(glw.getParameter).toHaveBeenCalled();
    expect(glw.getExtension).toHaveBeenCalled();
    const paramCalls = (glw.getParameter as ReturnType<typeof vi.fn>).mock.calls
      .length;
    expect(renderer.system).toBe(first);
    expect(
      (glw.getParameter as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(paramCalls);
  });

  it('does not allocate SDF buffers in the constructor', () => {
    const { renderer, glw } = makeRenderer();
    expect((renderer as any)._sdfBufferPlain).toBeNull();
    expect((renderer as any)._sdfBufferRich).toBeNull();
    expect(glw.createBuffer).toHaveBeenCalledTimes(4); // index + quad + node-coords + stencil VBOs
  });

  it('creates each SDF buffer on first access and caches it', () => {
    const { renderer } = makeRenderer();
    const plain = renderer.sdfBufferPlain;
    expect(plain).toBeInstanceOf(SdfBuffer);
    expect(renderer.sdfBufferPlain).toBe(plain);
    const rich = renderer.sdfBufferRich;
    expect(rich).toBeInstanceOf(SdfBuffer);
    expect(rich.layout).toBe('rich');
    expect(renderer.sdfBufferRich).toBe(rich);
  });
});
