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
import {
  BorderTemplate,
  type BorderProps,
} from '../templates/BorderTemplate.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

export const Border: WebGlShaderType<BorderProps> = {
  props: BorderTemplate.props,
  update(node) {
    this.uniform4fa('u_borderWidth', this.props!.w as Vec4);
    this.uniformRGBA('u_borderColor', this.props!.color);
    this.uniform1f('u_borderGap', this.props!.gap as number);
    this.uniform1f('u_borderAlign', this.props!.align as number);
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
    uniform float u_borderGap;
    uniform float u_borderAlign;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    varying vec2 v_innerSize;
    varying vec2 v_outerSize;
    varying vec2 v_outerBorderUv;
    varying vec2 v_innerBorderUv;
    varying vec2 v_halfDimensions;
    varying float v_edgeWidth;

    void main() {
      vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);
      vec2 edge = clamp(a_nodeCoords * 2.0 - vec2(1.0), -1.0, 1.0);
      v_edgeWidth = 1.0 / u_pixelRatio;

      float borderTop = u_borderWidth.x;
      float borderRight = u_borderWidth.y;
      float borderBottom = u_borderWidth.z;
      float borderLeft = u_borderWidth.w;

      v_outerBorderUv = vec2(0.0);
      v_innerBorderUv = vec2(0.0);

      vec2 borderSize = vec2(borderRight + borderLeft, borderTop + borderBottom);
      vec2 extraSize = borderSize * u_borderAlign;
      vec2 gapSize = step(0.001, borderSize) * u_borderGap;

      v_outerSize = (u_dimensions + gapSize * 2.0 + extraSize) * 0.5;
      v_innerSize = v_outerSize - borderSize * 0.5;

      // Use sign() to avoid branching
      vec2 borderDiff = vec2(borderRight - borderLeft, borderBottom - borderTop);
      vec2 signDiff = sign(borderDiff);
      borderDiff = abs(borderDiff) - u_borderGap;

      v_outerBorderUv = -signDiff * borderDiff * u_borderAlign;
      v_innerBorderUv = v_outerBorderUv + signDiff * borderDiff;

      vec2 edgeOffsetExtra = step(u_dimensions * 0.5, v_outerSize) * edge * (extraSize + u_borderGap);
      vec2 borderEdge = edgeOffsetExtra;

      vec2 vertexPos = (a_position + edge + borderEdge) * u_pixelRatio;
      gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);

      v_color = a_color;
      v_nodeCoords = a_nodeCoords + (screenSpace + borderEdge) / (u_dimensions);
      v_textureCoords = a_textureCoords + (screenSpace + borderEdge) / (u_dimensions);

      v_halfDimensions = u_dimensions * 0.5;
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

    uniform vec4 u_borderWidth;
    uniform vec4 u_borderColor;
    uniform float u_borderGap;

    varying vec4 v_color;
    varying vec2 v_nodeCoords;
    varying vec2 v_textureCoords;

    varying vec2 v_innerSize;
    varying vec2 v_outerSize;
    varying vec2 v_outerBorderUv;
    varying vec2 v_innerBorderUv;
    varying vec2 v_halfDimensions;
    varying float v_edgeWidth;

    float box(vec2 p, vec2 s) {
      vec2 q = abs(p) - s;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0)));
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec4 resultColor = vec4(0.0);
      vec2 boxUv = v_nodeCoords.xy * u_dimensions - v_halfDimensions;

      float outerDist = box(boxUv + v_outerBorderUv, v_outerSize - v_edgeWidth);
      float innerDist = box(boxUv + v_innerBorderUv, v_innerSize - v_edgeWidth);

      if(u_borderGap == 0.0) {
        resultColor = mix(resultColor, u_borderColor, 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, outerDist));
        resultColor = mix(resultColor, color, 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, innerDist));
        gl_FragColor = resultColor * u_alpha;
        return;
      }

      float nodeDist = box(boxUv, v_halfDimensions - v_edgeWidth);
      float nodeAlpha = 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, nodeDist);

      float borderDist = max(-innerDist, outerDist);
      float borderAlpha = 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, borderDist);
      resultColor = mix(resultColor, color, nodeAlpha);
      resultColor = mix(resultColor, u_borderColor, borderAlpha * u_borderColor.a);

      gl_FragColor = resultColor * u_alpha;
    }
  `,
};
