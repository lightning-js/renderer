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
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';
import { calcFactoredRadiusArray } from '../../lib/utils.js';
import {
  RoundedTemplate,
  type RoundedProps,
} from '../templates/RoundedTemplate.js';
import type { CoreNode } from '../../CoreNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';

/**
 * Similar to the {@link DefaultShader} but cuts out 4 rounded rectangle corners
 * as defined by the specified corner {@link RoundedProps.radius}
 */
export const Rounded: WebGlShaderType<RoundedProps> = {
  props: RoundedTemplate.props,
  update(node: CoreNode) {
    this.uniform4fa(
      'u_radius',
      calcFactoredRadiusArray(this.props!.radius as Vec4, node.w, node.h),
    );
  },
  vertex: `
  # ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  # else
  precision mediump float;
  # endif

  attribute vec2 a_position;
  attribute vec2 a_textureCoords;
  attribute vec4 a_color;
  attribute vec2 a_nodeCoords;

  uniform vec2 u_resolution;
  uniform float u_pixelRatio;
  uniform vec2 u_dimensions;

  varying vec4 v_color;
  varying vec2 v_textureCoords;
  varying vec2 v_nodeCoords;

  void main() {
    vec2 normalized = a_position * u_pixelRatio;
    vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);

    v_color = a_color;
    v_nodeCoords = a_nodeCoords;
    v_textureCoords = a_textureCoords;

    gl_Position = vec4(normalized.x * screenSpace.x - 1.0, normalized.y * -abs(screenSpace.y) + 1.0, 0.0, 1.0);
    gl_Position.y = -sign(screenSpace.y) * gl_Position.y;
  }
`,
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    //renderer applies these uniforms automatically
    uniform vec2 u_resolution;
    uniform vec2 u_dimensions;
    uniform float u_alpha;
    uniform sampler2D u_texture;

    //custom uniforms
    uniform vec4 u_radius;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) - r.x;
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 halfDimensions = (u_dimensions * 0.5);

      vec2 boxUv = v_nodeCoords.xy * u_dimensions - halfDimensions;
      float boxDist = roundedBox(boxUv, halfDimensions, u_radius);

      float roundedAlpha = 1.0 - smoothstep(0.0, 1.0, boxDist);

      vec4 resColor = vec4(0.0);
      resColor = mix(resColor, color, roundedAlpha);
      gl_FragColor = resColor * u_alpha;
    }
  `,
};
