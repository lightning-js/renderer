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

import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';
import {
  ShadowTemplate,
  type ShadowProps,
} from '../templates/ShadowTemplate.js';

export const Shadow: WebGlShaderType<ShadowProps> = {
  props: ShadowTemplate.props,
  update() {
    this.uniformRGBA('u_color', this.props!.color);
    this.uniform4fa('u_shadow', this.props!.projection);
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
    uniform float u_rtt;
    uniform vec2 u_dimensions;

    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    void main() {
      vec2 screenSpace = vec2(2.0 / u_resolution.x,  -2.0 / u_resolution.y);
      vec2 outerEdge = clamp(a_nodeCoords * 2.0 - vec2(1.0), -1.0, 1.0);

      vec2 shadowEdge = outerEdge * ((u_shadow.w * 2.0)+ u_shadow.z) + u_shadow.xy;
      vec2 normVertexPos = a_position * u_pixelRatio;

      vec2 vertexPos = (a_position + outerEdge + shadowEdge) * u_pixelRatio;
      gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);

      v_color = a_color;
      v_nodeCoords = a_nodeCoords + (screenSpace + shadowEdge) / (u_dimensions);
      v_textureCoords = a_textureCoords + (screenSpace + shadowEdge) / (u_dimensions);
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

    uniform vec4 u_color;
    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    float box(vec2 p, vec2 s) {
      vec2 q = abs(p) - s;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) + 2.0;
    }

    float shadowBox(vec2 p, vec2 s, float r) {
      vec2 q = abs(p) - s + r;
      float dist = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
      return 1.0 - smoothstep(-u_shadow.w, u_shadow.w + u_shadow.z, dist);
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 halfDimensions = (u_dimensions * 0.5);

      vec2 boxUv = v_nodeCoords.xy * u_dimensions - halfDimensions;
      float boxDist = box(boxUv, halfDimensions);

      float boxAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, boxDist);
      float shadowDist = shadowBox(boxUv - u_shadow.xy, halfDimensions + u_shadow.w, u_shadow.z);

      vec4 resColor = vec4(0.0);
      resColor = mix(resColor, u_color, shadowDist);
      resColor = mix(resColor, color, min(color.a, boxAlpha));
      gl_FragColor = resColor * u_alpha;
    }
  `,
};
