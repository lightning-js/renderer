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
import type { WebGlShaderType } from '@lightningjs/renderer/webgl';

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
export interface CustomShaderProps {
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

export const MyCustomShader: WebGlShaderType<CustomShaderProps> = {
  props: {
    normalized: false,
    topLeft: null,
    topRight: null,
    bottomRight: null,
    bottomLeft: null,
  },
  update(node) {
    const props = this.props!;
    const width = props.normalized ? 1 : node.w;
    const height = props.normalized ? 1 : node.h;

    const topLeft = [
      (props.topLeft?.x || 0) / width,
      (props.topLeft?.y || 0) / height,
    ] as [number, number];

    const topRight = [
      (props.topRight?.x || width) / width,
      (props.topRight?.y || 0) / height,
    ] as [number, number];

    const bottomRight = [
      (props.bottomRight?.x || width) / width,
      (props.bottomRight?.y || height) / height,
    ] as [number, number];

    const bottomLeft = [
      (props.bottomLeft?.x || 0) / width,
      (props.bottomLeft?.y || height) / height,
    ] as [number, number];

    this.uniform2fa('u_topLeft', topLeft);
    this.uniform2fa('u_topRight', topRight);
    this.uniform2fa('u_bottomRight', bottomRight);
    this.uniform2fa('u_bottomLeft', bottomLeft);
  },
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform sampler2D u_texture;
    uniform vec2 u_topLeft;
    uniform vec2 u_topRight;
    uniform vec2 u_bottomLeft;
    uniform vec2 u_bottomRight;

    varying vec2 v_textureCoords;
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
      vec2 texUv = invBilinear(v_textureCoords, u_topLeft, u_topRight, u_bottomRight, u_bottomLeft);

      if (texUv.x > -0.5) {
        color = texture2D(u_texture, texUv) * v_color;
      }

      gl_FragColor = color;
    }
  `,
};
