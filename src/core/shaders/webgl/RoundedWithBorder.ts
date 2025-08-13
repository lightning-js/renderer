/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CoreNode } from '../../CoreNode.js';
import { calcFactoredRadiusArray } from '../../lib/utils.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';
import {
  RoundedWithBorderTemplate,
  type RoundedWithBorderProps,
} from '../templates/RoundedWithBorderTemplate.js';

export const RoundedWithBorder: WebGlShaderType<RoundedWithBorderProps> = {
  props: RoundedWithBorderTemplate.props,
  update(node: CoreNode) {
    this.uniformRGBA('u_borderColor', this.props!['border-color']);
    this.uniform4fa('u_borderWidth', this.props!['border-w'] as Vec4);

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

    uniform vec4 u_radius;
    uniform vec4 u_borderWidth;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    varying vec4 v_innerRadius;
    varying vec2 v_innerSize;
    varying vec2 v_halfDimensions;
    varying float v_borderZero;

    void main() {
      vec2 normalized = a_position * u_pixelRatio;
      vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);

      v_color = a_color;
      v_nodeCoords = a_nodeCoords;
      v_textureCoords = a_textureCoords;

      v_halfDimensions = u_dimensions * 0.5;

      v_borderZero = u_borderWidth == vec4(0.0) ? 1.0 : 0.0;

      if(v_borderZero == 0.0) {
        v_innerRadius = vec4(
          max(0.0, u_radius.x - max(u_borderWidth.x, u_borderWidth.w) - 0.5),
          max(0.0, u_radius.y - max(u_borderWidth.x, u_borderWidth.y) - 0.5),
          max(0.0, u_radius.z - max(u_borderWidth.z, u_borderWidth.y) - 0.5),
          max(0.0, u_radius.w - max(u_borderWidth.z, u_borderWidth.w) - 0.5)
        );

        v_innerSize = (vec2(u_dimensions.x - (u_borderWidth[3] + u_borderWidth[1]) + 1.0, u_dimensions.y - (u_borderWidth[0] + u_borderWidth[2])) - 2.0) * 0.5;
      }

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

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform float u_alpha;
    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform vec4 u_radius;

    uniform vec4 u_borderWidth;
    uniform vec4 u_borderColor;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    varying vec2 v_halfDimensions;
    varying vec4 v_innerRadius;
    varying vec2 v_innerSize;
    varying float v_borderZero;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) - r.x;
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;

      vec2 boxUv = v_nodeCoords.xy * u_dimensions - v_halfDimensions;
      float outerDist = roundedBox(boxUv, v_halfDimensions, u_radius);

      float outerAlpha = 1.0 - smoothstep(0.0, 1.0, outerDist);

      if(v_borderZero == 1.0) {
        gl_FragColor = mix(vec4(0.0), color, outerAlpha) * u_alpha;
        return;
      }

      boxUv.x += u_borderWidth.y > u_borderWidth.w ? (u_borderWidth.y - u_borderWidth.w) * 0.5 : -(u_borderWidth.w - u_borderWidth.y) * 0.5;
      boxUv.y += u_borderWidth.z > u_borderWidth.x ? ((u_borderWidth.z - u_borderWidth.x) * 0.5 + 0.5) : -(u_borderWidth.x - u_borderWidth.z) * 0.5;

      float innerDist = roundedBox(boxUv, v_innerSize, v_innerRadius);
      float innerAlpha = 1.0 - smoothstep(0.0, 1.0, innerDist);

      vec4 resColor = mix(u_borderColor, color, innerAlpha);
      resColor = mix(vec4(0.0), resColor, outerAlpha);
      gl_FragColor = resColor * u_alpha;
    }
  `,
};
