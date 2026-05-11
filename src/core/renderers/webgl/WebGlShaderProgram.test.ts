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

import { describe, expect, it, vi } from 'vitest';
import { WebGlShaderProgram } from './WebGlShaderProgram.js';

describe('WebGlShaderProgram.bindRenderOp', () => {
  function createProgram() {
    const program = Object.create(
      WebGlShaderProgram.prototype,
    ) as WebGlShaderProgram;
    const bindTextures = vi.fn();
    const bindBufferCollection = vi.fn();
    const uniform1f = vi.fn();
    const uniform2f = vi.fn();
    const glw = {
      canvas: { width: 1920, height: 1080 },
      uniform1f,
      uniform2f,
    };

    (program as any).glw = glw;
    (program as any).bindTextures = bindTextures;
    (program as any).bindBufferCollection = bindBufferCollection;
    (program as any).useTimeValue = false;
    (program as any).useSystemAlpha = false;
    (program as any).useSystemDimensions = false;

    return {
      program,
      bindTextures,
      bindBufferCollection,
      uniform1f,
      uniform2f,
    };
  }

  it('binds SDF shader props while using the main framebuffer resolution', () => {
    const {
      program,
      bindTextures,
      bindBufferCollection,
      uniform1f,
      uniform2f,
    } = createProgram();
    const onSdfBind = vi.fn();
    const renderOp = {
      isCoreNode: false,
      shader: { shaderType: { onSdfBind } },
      sdfShaderProps: { size: 16, distanceRange: 4 },
      renderOpTextures: [],
      quadBufferCollection: {},
      parentHasRenderTexture: false,
      framebufferDimensions: null,
      rtt: false,
      stage: { pixelRatio: 1.5 },
      time: 0,
      worldAlpha: 1,
      w: 100,
      h: 20,
    };

    program.bindRenderOp(renderOp as any);

    expect(bindTextures).toHaveBeenCalledWith(renderOp.renderOpTextures);
    expect(bindBufferCollection).toHaveBeenCalledWith(
      renderOp.quadBufferCollection,
    );
    expect(uniform1f).toHaveBeenCalledWith('u_pixelRatio', 1.5);
    expect(uniform2f).toHaveBeenCalledWith('u_resolution', 1920, 1080);
    expect(onSdfBind).toHaveBeenCalledWith(renderOp.sdfShaderProps);
  });

  it('keeps SDF binding active when rendering into a parent framebuffer', () => {
    const { program, uniform1f, uniform2f } = createProgram();
    const onSdfBind = vi.fn();
    const renderOp = {
      isCoreNode: false,
      shader: { shaderType: { onSdfBind } },
      sdfShaderProps: { size: 18, distanceRange: 6 },
      renderOpTextures: [],
      quadBufferCollection: {},
      parentHasRenderTexture: true,
      framebufferDimensions: { w: 320, h: 180 },
      rtt: false,
      stage: { pixelRatio: 2 },
      time: 0,
      worldAlpha: 1,
      w: 100,
      h: 20,
    };

    program.bindRenderOp(renderOp as any);

    expect(uniform1f).toHaveBeenCalledWith('u_pixelRatio', 1);
    expect(uniform2f).toHaveBeenCalledWith('u_resolution', 320, 180);
    expect(onSdfBind).toHaveBeenCalledWith(renderOp.sdfShaderProps);
  });
});
