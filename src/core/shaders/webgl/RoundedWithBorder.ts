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
    this.uniform1f('u_borderGap', this.props!['border-gap'] as number);
    this.uniform1f('u_borderAlign', this.props!['border-align'] as number);

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
    uniform float u_borderGap;
    uniform float u_borderAlign;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    varying vec2 v_innerSize;
    varying vec2 v_outerSize;
    varying vec2 v_outerBorderUv;
    varying vec2 v_innerBorderUv;
    varying vec4 v_innerBorderRadius;
    varying vec4 v_outerBorderRadius;
    varying vec2 v_halfDimensions;
    varying float v_edgeWidth;
    varying float v_borderZero;

    void main() {
      vec2 vertexPos = a_position * u_pixelRatio;
      vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);
      vec2 edge = clamp(a_nodeCoords * 2.0 - vec2(1.0), -1.0, 1.0);
      vec2 edgeOffset = vec2(0.0);

      v_borderZero = u_borderWidth == vec4(0.0) ? 1.0 : 0.0;
      v_innerSize = vec2(0.0);
      v_outerSize = vec2(0.0);

      if(v_borderZero == 0.0) {
        float borderTop = u_borderWidth.x;
        float borderRight = u_borderWidth.y;
        float borderBottom = u_borderWidth.z;
        float borderLeft = u_borderWidth.w;

        v_outerBorderUv = vec2(0.0);
        v_innerBorderUv = vec2(0.0);

        vec2 borderSize = vec2(borderRight + borderLeft, borderTop + borderBottom);
        vec2 extraSize = borderSize * u_borderAlign;
        float gapLeft = step(0.001, borderLeft) * u_borderGap;
        float gapRight = step(0.001, borderRight) * u_borderGap;
        float gapTop = step(0.001, borderTop) * u_borderGap;
        float gapBottom = step(0.001, borderBottom) * u_borderGap;
        vec2 gapSize = vec2(gapLeft + gapRight, gapTop + gapBottom);

        v_outerSize = (u_dimensions + gapSize + extraSize) * 0.5;
        v_innerSize = v_outerSize - borderSize * 0.5;

        // Use sign() to avoid branching
        vec2 borderDiff = vec2(borderRight - borderLeft, borderBottom - borderTop);
        vec2 signDiff = sign(borderDiff);
        borderDiff = abs(borderDiff);

        vec2 gapDiff = vec2(gapRight - gapLeft, gapBottom - gapTop);
        vec2 signGapDiff = sign(gapDiff);
        gapDiff = abs(gapDiff);

        v_outerBorderUv = -signDiff * borderDiff * u_borderAlign * 0.5 - signGapDiff * gapDiff * 0.5;
        v_innerBorderUv = v_outerBorderUv + signDiff * borderDiff * 0.5;

        v_outerBorderRadius = vec4(
          max(0.0, u_radius.x + max(borderTop * u_borderAlign + u_borderGap, borderLeft * u_borderAlign + u_borderGap)),
          max(0.0, u_radius.y + max(borderTop * u_borderAlign + u_borderGap, borderRight * u_borderAlign + u_borderGap)),
          max(0.0, u_radius.z + max(borderBottom * u_borderAlign + u_borderGap, borderRight * u_borderAlign + u_borderGap)),
          max(0.0, u_radius.w + max(borderBottom * u_borderAlign + u_borderGap, borderLeft * u_borderAlign + u_borderGap))
        );

        v_innerBorderRadius = vec4(
          max(0.0, v_outerBorderRadius.x - max(borderTop, borderLeft)),
          max(0.0, v_outerBorderRadius.y - max(borderTop, borderRight)),
          max(0.0, v_outerBorderRadius.z - max(borderBottom, borderRight)),
          max(0.0, v_outerBorderRadius.w - max(borderBottom, borderLeft))
        );

        vec2 edgeOffsetExtra = step(u_dimensions * 0.5, v_outerSize) * edge * (extraSize + u_borderGap);
        edgeOffset = edgeOffsetExtra;

        vertexPos = (a_position + edge + edgeOffset) * u_pixelRatio;
      }

      gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);

      v_color = a_color;
      v_nodeCoords = a_nodeCoords + (screenSpace + edgeOffset) / (u_dimensions);
      v_textureCoords = a_textureCoords + (screenSpace + edgeOffset) / (u_dimensions);

      v_halfDimensions = u_dimensions * 0.5;
      v_edgeWidth = 1.0 / u_pixelRatio;
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
    uniform float u_borderGap;
    uniform float u_borderAlign;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    varying vec2 v_innerSize;
    varying vec2 v_outerSize;
    varying vec2 v_outerBorderUv;
    varying vec2 v_innerBorderUv;
    varying vec4 v_innerBorderRadius;
    varying vec4 v_outerBorderRadius;
    varying vec2 v_halfDimensions;
    varying float v_edgeWidth;
    varying float v_borderZero;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) - r.x;
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec4 resultColor = vec4(0.0);
      vec2 boxUv = v_nodeCoords.xy * u_dimensions - v_halfDimensions;

      float nodeDist;
      float nodeAlpha;

      if(v_borderZero == 1.0) {
        nodeDist = roundedBox(boxUv, v_halfDimensions - v_edgeWidth, u_radius);
        nodeAlpha = 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, nodeDist);
        gl_FragColor = mix(vec4(0.0), color, nodeAlpha) * u_alpha;
        return;
      }

      float outerDist = roundedBox(boxUv + v_outerBorderUv, v_outerSize - v_edgeWidth, v_outerBorderRadius);
      float innerDist = roundedBox(boxUv + v_innerBorderUv, v_innerSize - v_edgeWidth, v_innerBorderRadius);

      if(u_borderGap == 0.0) {
        resultColor = mix(resultColor, u_borderColor, 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, outerDist));
        resultColor = mix(resultColor, color, 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, innerDist));
        gl_FragColor = resultColor * u_alpha;
        return;
      }

      nodeDist = roundedBox(boxUv, v_halfDimensions - v_edgeWidth, u_radius);
      nodeAlpha = 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, nodeDist);
      float borderDist = max(-innerDist, outerDist);
      float borderAlpha = 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, borderDist);

      resultColor = mix(vec4(0.0), color, nodeAlpha);
      resultColor = mix(resultColor, u_borderColor, borderAlpha * u_borderColor.a);
      gl_FragColor = resultColor * u_alpha;
    }
  `,
};
