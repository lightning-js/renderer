/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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

import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import { WebGlCoreShader } from '../WebGlCoreShader.js';
import type { WebGlCoreCtxTexture } from '../WebGlCoreCtxTexture.js';
import type { ShaderProgramSources } from '../internal/ShaderUtils.js';
import type { WebGlCoreRenderOp } from '../WebGlCoreRenderOp.js';

/**
 * Properties of the {@link RoundedRectangle} shader
 */
export interface RoundedRectangleProps {
  /**
   * Corner radius, in pixels, to cut out of the corners
   *
   * @default 10
   */
  radius?: number;
}

/**
 * Similar to the {@link DefaultShader} but cuts out 4 rounded rectangle corners
 * as defined by the specified corner {@link RoundedRectangleProps.radius}
 */
export class RoundedRectangle extends WebGlCoreShader {
  constructor(renderer: WebGlCoreRenderer) {
    super({
      renderer,
      attributes: [
        'a_position',
        'a_textureCoordinate',
        'a_color',
        'a_textureIndex',
      ],
      uniforms: [
        { name: 'u_resolution', uniform: 'uniform2fv' },
        { name: 'u_pixelRatio', uniform: 'uniform1f' },
        { name: 'u_texture', uniform: 'uniform2f' },
        { name: 'u_dimensions', uniform: 'uniform2fv' },
        { name: 'u_radius', uniform: 'uniform1f' },
      ],
    });
  }

  static z$__type__Props: RoundedRectangleProps;

  static override resolveDefaults(
    props: RoundedRectangleProps,
  ): Required<RoundedRectangleProps> {
    return {
      radius: props.radius || 10,
    };
  }

  override bindTextures(textures: WebGlCoreCtxTexture[]) {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]!.ctxTexture);
  }

  override bindUniforms(renderOp: WebGlCoreRenderOp) {
    super.bindUniforms(renderOp);
    const { width = 100, height = 100 } = renderOp.dimensions;
    this.setUniform('u_dimensions', [width, height]);
  }

  override bindProps(props: RoundedRectangleProps): void {
    for (const key in props) {
      // @ts-expect-error to fancy code
      this.setUniform(`u_${key}`, props[key]);
    }
  }

  static override shaderSources: ShaderProgramSources = {
    vertex: `
      # ifdef GL_FRAGMENT_PRESICISON_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      attribute vec2 a_position;
      attribute vec2 a_textureCoordinate;
      attribute vec4 a_color;
      attribute float a_textureIndex;
      attribute float a_depth;

      uniform vec2 u_resolution;
      uniform float u_pixelRatio;

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;
      varying float v_textureIndex;

      void main() {
        vec2 normalized = a_position * u_pixelRatio / u_resolution;
        vec2 zero_two = normalized * 2.0;
        vec2 clip_space = zero_two - 1.0;

        // pass to fragment
        v_color = a_color;
        v_textureCoordinate = a_textureCoordinate;
        v_textureIndex = a_textureIndex;

        // flip y
        gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
      }
    `,
    fragment: `
      # ifdef GL_FRAGMENT_PRESICISON_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      uniform vec2 u_resolution;
      uniform vec2 u_dimensions;
      uniform float u_radius;
      uniform sampler2D u_texture;

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;

      float boxDist(vec2 p, vec2 size, float radius){
        size -= vec2(radius);
        vec2 d = abs(p) - size;
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius;
      }

      float fillMask(float dist) {
        return clamp(-dist, 0.0, 1.0);
      }

      void main() {
        vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
        vec2 halfDimensions = u_dimensions * 0.5;

        float d = boxDist(v_textureCoordinate.xy * u_dimensions - halfDimensions, halfDimensions + 0.5, u_radius);
        gl_FragColor = mix(vec4(0.0), color, fillMask(d));
      }
    `,
  };
}
