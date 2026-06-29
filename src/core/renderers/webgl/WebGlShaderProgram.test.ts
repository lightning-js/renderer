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
import { mock } from 'vitest-mock-extended';
import { CoreTextNode, type CoreTextNodeProps } from '../../CoreTextNode.js';
import type { Stage } from '../../Stage.js';
import type { TextRenderer } from '../../text-rendering/TextRenderer.js';
import { createBound } from '../../lib/utils.js';
import type { CoreRenderer } from '../CoreRenderer.js';
import { WebGlRenderer } from './WebGlRenderer.js';
import { WebGlShaderProgram } from './WebGlShaderProgram.js';

const makeStage = (): Stage =>
  mock<Stage>({
    strictBound: createBound(0, 0, 1920, 1080),
    preloadBound: createBound(0, 0, 1920, 1080),
    defaultTexture: {
      state: 'loaded',
    },
    pixelRatio: 2,
    renderer: mock<CoreRenderer>() as CoreRenderer,
  });

const makeTextProps = (): CoreTextNodeProps => ({
  alpha: 1,
  autosize: false,
  boundsMargin: null,
  clipping: false,
  clipRadius: 0,
  color: 0xffffffff,
  colorBl: 0xffffffff,
  colorBottom: 0xffffffff,
  colorBr: 0xffffffff,
  colorLeft: 0xffffffff,
  colorRight: 0xffffffff,
  colorTl: 0xffffffff,
  colorTop: 0xffffffff,
  colorTr: 0xffffffff,
  h: 20,
  mount: 0,
  mountX: 0,
  mountY: 0,
  parent: null,
  pivot: 0,
  pivotX: 0,
  pivotY: 0,
  rotation: 0,
  rtt: false,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  shader: null,
  src: '',
  texture: null,
  textureOptions: {},
  w: 100,
  x: 0,
  y: 0,
  zIndex: 0,
  text: 'Test',
  textAlign: 'left',
  contain: 'none',
  fontFamily: 'Arial',
  fontStyle: 'normal',
  fontSize: 16,
  letterSpacing: 0,
  lineHeight: 1,
  maxHeight: 0,
  maxLines: 0,
  maxWidth: 0,
  offsetY: 0,
  overflowSuffix: '...',
  verticalAlign: 'top',
  wordBreak: 'break-word',
  textRendererOverride: null,
  forceLoad: false,
  richText: false,
});

const makeSdfTextRenderer = (): TextRenderer =>
  ({
    clearCache: vi.fn(),
    type: 'sdf',
    font: {
      isFontLoaded: vi.fn().mockReturnValue(true),
      loadFont: vi.fn(),
      waitingForFont: vi.fn(),
      stopWaitingForFont: vi.fn(),
    },
    init: vi.fn(),
    renderText: vi.fn().mockReturnValue({
      width: 100,
      height: 20,
      layout: { glyphs: [], width: 100, height: 20 },
    }),
    addQuads: vi.fn().mockReturnValue(new Float32Array(0)),
    renderQuads: vi.fn(),
  } as unknown as TextRenderer);

const makeSdfTextNode = () => {
  const node = new CoreTextNode(
    makeStage(),
    makeTextProps(),
    makeSdfTextRenderer(),
  );
  node.parentHasRenderTexture = true;
  node.framebufferDimensions = { w: 320, h: 180 };
  node.rttParent = { framebufferDimensions: { w: 640, h: 360 } } as any;
  return node;
};

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

    (program as any).bindTextures = bindTextures;
    (program as any).bindBufferCollection = bindBufferCollection;
    (program as any).glw = glw;
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
      isSdfRenderOp: true,
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
      isSdfRenderOp: true,
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

  it('uses parent RTT dimensions for SDF text render ops', () => {
    const { program, uniform1f, uniform2f } = createProgram();
    const onSdfBind = vi.fn();
    const sdfShaderProps = {
      color: 0xffffffff,
      distanceRange: 1,
      size: 16,
      transform: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };
    const renderOp = {
      framebufferDimensions: { w: 320, h: 180 },
      isCoreNode: true,
      isSdfRenderOp: true,
      parentFramebufferDimensions: { w: 640, h: 360 },
      parentHasRenderTexture: true,
      quadBufferCollection: {},
      renderOpTextures: [],
      rtt: false,
      sdfShaderProps,
      shader: {
        shaderType: {
          onSdfBind,
        },
      },
      stage: { pixelRatio: 2 },
      time: 0,
      worldAlpha: 1,
      w: 100,
      h: 20,
    } as any;

    program.bindRenderOp(renderOp);

    expect(uniform1f).toHaveBeenCalledWith('u_pixelRatio', 1.0);
    expect(uniform2f).toHaveBeenCalledWith('u_resolution', 640, 360);
    expect(onSdfBind).toHaveBeenCalledWith(sdfShaderProps);
  });
});

describe('WebGlRenderer.canReuseRenderOp', () => {
  it('reuses SDF text render ops with matching parent RTT dimensions', () => {
    const renderer = Object.create(WebGlRenderer.prototype) as WebGlRenderer;
    renderer.stencilDepth = 0;
    const node = makeSdfTextNode();
    node.stencilDepth = 0;

    node.props.shader = {
      shaderKey: 'default',
    } as any;

    renderer.curRenderOp = node;

    expect(renderer.reuseRenderOp(node)).toBe(true);
  });
});
