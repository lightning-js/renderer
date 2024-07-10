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
/**
 * Based on https://www.shadertoy.com/view/lsVSWW
 *
 * @module
 */
import {
  WebGlCoreShader,
  type DimensionsShaderProp,
  type WebGlCoreRenderer,
  type WebGlCoreCtxTexture,
  type ShaderProgramSources,
} from '@lightningjs/renderer';

export interface Point {
  x: number;
  y: number;
}

declare module '@lightningjs/renderer' {
  interface ShaderMap {
    MyCustomShader: typeof MyCustomShader;
  }
}

/**
 * Properties of the {@link CustomShaderProps} shader
 */
export interface CustomShaderProps extends DimensionsShaderProp {
  /**
   * Use normalized values rather than pixle values
   * @default false
   */
  normalized?: boolean;

  /**
   * x & y coordinates of the top left point
   * @default null
   */
  topLeft?: Point | null;

  /**
   * x & y coordinates of the top right point
   * @default null
   */
  topRight?: Point | null;

  /**
   * x & y coordinates of the bottom right point
   * @default null
   */
  bottomRight?: Point | null;

  /**
   * x & y coordinates of the bottom left point
   * @default null
   */
  bottomLeft?: Point | null;
}

export class MyCustomShader extends WebGlCoreShader {
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

  static z$__type__Props: CustomShaderProps;

  static override resolveDefaults(
    props: CustomShaderProps,
  ): Required<CustomShaderProps> {
    return {
      normalized: props.normalized || false,
      topLeft: props.topLeft || null,
      topRight: props.topRight || null,
      bottomRight: props.bottomRight || null,
      bottomLeft: props.bottomLeft || null,
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

  protected override bindProps(props: Required<CustomShaderProps>): void {
    const width = props.normalized ? 1 : props.$dimensions.width;
    const height = props.normalized ? 1 : props.$dimensions.height;

    const topLeft = [
      (props.topLeft?.x || 0) / width,
      (props.topLeft?.y || 0) / height,
    ];

    const topRight = [
      (props.topRight?.x || width) / width,
      (props.topRight?.y || 0) / height,
    ];

    const bottomRight = [
      (props.bottomRight?.x || width) / width,
      (props.bottomRight?.y || height) / height,
    ];

    const bottomLeft = [
      (props.bottomLeft?.x || 0) / width,
      (props.bottomLeft?.y || height) / height,
    ];

    this.setUniform('u_topLeft', new Float32Array(topLeft));
    this.setUniform('u_topRight', new Float32Array(topRight));
    this.setUniform('u_bottomRight', new Float32Array(bottomRight));
    this.setUniform('u_bottomLeft', new Float32Array(bottomLeft));
  }

  override canBatchShaderProps(
    propsA: Required<CustomShaderProps>,
    propsB: Required<CustomShaderProps>,
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

        // will fail for k0=0, which is only on the ba edge
        float v = 2.0*k0/(-k1 - w);
        if( v<0.0 || v>1.0 ) v = 2.0*k0/(-k1 + w);

        float u = (h.x - f.x*v)/(e.x + g.x*v);
        if( u<0.0 || u>1.0 || v<0.0 || v>1.0 ) return vec2(-1.0);
        return vec2( u, v );
      }

      void main(void){
        vec4 color = vec4(0.0);
        vec2 texUv = invBilinear(v_textureCoordinate, u_topLeft, u_topRight, u_bottomRight, u_bottomLeft);

        if (texUv.x > -0.5) {
          color = texture2D(u_texture, texUv) * v_color;
        }

        gl_FragColor = color;
      }
    `,
  };
}
