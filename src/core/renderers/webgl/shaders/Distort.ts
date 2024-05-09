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

import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import {
  WebGlCoreShader,
  type DimensionsShaderProp,
} from '../WebGlCoreShader.js';
import type { WebGlCoreCtxTexture } from '../WebGlCoreCtxTexture.js';
import type { ShaderProgramSources } from '../internal/ShaderUtils.js';

/**
 * Properties of the {@link DistortProps} shader
 */
export interface DistortProps extends DimensionsShaderProp {
  /**
   * X & Y coordinates of the top left point
   */
  topLeft?: number[];

  /**
   * X & Y coordinates of the top right point
   */
  topRight?: number[];

  /**
   * X & Y coordinates of the bottom right point
   */
  bottomRight?: number[];

  /**
   * X & Y coordinates of the bottom left point
   */
  bottomLeft?: number[];
}

export class Distort extends WebGlCoreShader {
  constructor(renderer: WebGlCoreRenderer) {
    super({
      renderer,
      attributes: ['a_position', 'a_textureCoordinate', 'a_color'],
      uniforms: [
        { name: 'u_resolution', uniform: 'uniform2fv' },
        { name: 'u_pixelRatio', uniform: 'uniform1f' },
        { name: 'u_texture', uniform: 'uniform2f' },
        { name: 'u_dimensions', uniform: 'uniform2fv' },
        { name: 'u_topLeft', uniform: 'uniform2fv' },
        { name: 'u_topRight', uniform: 'uniform2fv' },
        { name: 'u_bottomRight', uniform: 'uniform2fv' },
        { name: 'u_bottomLeft', uniform: 'uniform2fv' },
      ],
    });
  }

  static z$__type__Props: DistortProps;

  static override resolveDefaults(props: DistortProps): Required<DistortProps> {
    return {
      topLeft: props.topLeft || [0, 0],
      topRight: props.topRight || [1920, 0],
      bottomRight: props.bottomRight || [1920, 1080],
      bottomLeft: props.bottomLeft || [0, 1080],
      $dimensions: {
        width: 0,
        height: 0,
      },
    };
  }

  override bindTextures(textures: WebGlCoreCtxTexture[]) {
    const { glw } = this;
    glw.activeTexture(0);
    glw.bindTexture(textures[0]!.ctxTexture);
  }

  protected override bindProps(props: Required<DistortProps>): void {
    this.setUniform('u_topLeft', new Float32Array(props.topLeft));
    this.setUniform('u_topRight', new Float32Array(props.topRight));
    this.setUniform('u_bottomRight', new Float32Array(props.bottomRight));
    this.setUniform('u_bottomLeft', new Float32Array(props.bottomLeft));
  }

  override canBatchShaderProps(
    propsA: Required<DistortProps>,
    propsB: Required<DistortProps>,
  ): boolean {
    return JSON.stringify(propsA) === JSON.stringify(propsB);
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

      void main() {
        vec2 normalized = a_position * u_pixelRatio / u_resolution;
        vec2 zero_two = normalized * 2.0;
        vec2 clip_space = zero_two - 1.0;

        // pass to fragment
        v_color = a_color;
        v_textureCoordinate = a_textureCoordinate;

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

    uniform sampler2D u_texture;
    uniform vec2 u_dimensions;
    uniform vec2 u_topLeft;
    uniform vec2 u_topRight;
    uniform vec2 u_bottomLeft;
    uniform vec2 u_bottomRight;

    varying vec2 v_textureCoordinate;
    varying vec4 v_color;

    float xross(in vec2 a, in vec2 b) {
        return a.x * b.y - a.y * b.x;
    }

    vec2 invBilinear(in vec2 p, in vec2 a, in vec2 b, in vec2 c, in vec2 d ){
        vec2 e = b-a;
        vec2 f = d-a;
        vec2 g = a-b+c-d;
        vec2 h = p-a;

        float k2 = xross(g, f);
        float k1 = xross(e, f) + xross(h, g);
        float k0 = xross(h, e);

        float w = k1*k1 - 4.0*k0*k2;

        if( w<0.0 ) return vec2(-1.0);

        w = sqrt(w);

        float v1 = (-k1 - w)/(2.0*k2);
        float v2 = (-k1 + w)/(2.0*k2);
        float u1 = (h.x - f.x*v1)/(e.x + g.x*v1);
        float u2 = (h.x - f.x*v2)/(e.x + g.x*v2);
        bool b1 = v1>0.0 && v1<1.0 && u1>0.0 && u1<1.0;
        bool b2 = v2>0.0 && v2<1.0 && u2>0.0 && u2<1.0;

        vec2 res = vec2(-1.0);

        if(b1 && !b2) res = vec2(u1, v1);
        if(!b1 &&  b2) res = vec2(u2, v2);

        return res;
      }

      void main(void){
          vec4 color = vec4(0.0);
          vec2 topLeft = u_topLeft / u_dimensions;
          vec2 topRight = u_topRight / u_dimensions;
          vec2 bottomRight = u_bottomRight / u_dimensions;
          vec2 bottomLeft = u_bottomLeft / u_dimensions;

          vec2 texUv = invBilinear(v_textureCoordinate, topLeft, topRight, bottomRight, bottomLeft);

          if (texUv.x > -0.5) {
              color = texture2D(u_texture, texUv) * v_color;
          }

          gl_FragColor = color;
      }
    `,
  };
}
