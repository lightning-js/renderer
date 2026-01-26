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
  RoundedWithBorderAndShadowTemplate,
  type RoundedWithBorderAndShadowProps,
} from '../templates/RoundedWithBorderAndShadowTemplate.js';

export const RoundedWithBorderAndShadow: WebGlShaderType<RoundedWithBorderAndShadowProps> =
  {
    props: RoundedWithBorderAndShadowTemplate.props,
    update(node: CoreNode) {
      const props = this.props!;
      this.uniformRGBA('u_borderColor', props['border-color']);
      this.uniform4fa('u_borderWidth', props['border-w'] as Vec4);
      this.uniform1f('u_borderGap', this.props!['border-gap'] as number);
      this.uniform1f('u_borderAlign', this.props!['border-align'] as number);

      this.uniformRGBA('u_shadowColor', props['shadow-color']);
      this.uniform4fa('u_shadow', props['shadow-projection']);

      this.uniform4fa(
        'u_radius',
        calcFactoredRadiusArray(props.radius as Vec4, node.w, node.h),
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
    uniform float u_rtt;
    uniform vec2 u_dimensions;

    uniform vec4 u_shadow;
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
      vec2 screenSpace = vec2(2.0 / u_resolution.x,  -2.0 / u_resolution.y);
      vec2 edge = clamp(a_nodeCoords * 2.0 - vec2(1.0), -1.0, 1.0);

      vec2 edgeOffset = edge * ((u_shadow.w * 2.0)+ u_shadow.z) + u_shadow.xy;
      vec2 vertexPos = (a_position + edge + edgeOffset) * u_pixelRatio;

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
        vec2 gapSize = step(0.001, borderSize) * u_borderGap;

        v_outerSize = u_dimensions + gapSize * 2.0 + extraSize;
        v_innerSize = v_outerSize - borderSize;

        // Use sign() to avoid branching
        vec2 borderDiff = vec2(borderRight - borderLeft, borderBottom - borderTop);
        vec2 signDiff = sign(borderDiff);
        borderDiff = abs(borderDiff) - u_borderGap;

        v_outerBorderUv = -signDiff * borderDiff * u_borderAlign * 0.5;
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

        vec2 edgeOffsetExtra = step(u_dimensions, v_outerSize) * edge * (extraSize + u_borderGap);
        edgeOffset += edgeOffsetExtra;

        vertexPos = (a_position + edge + edgeOffset) * u_pixelRatio;
      }

      gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);

      v_halfDimensions = u_dimensions * 0.5;
      v_edgeWidth = 1.0 / u_pixelRatio;
      v_color = a_color;
      v_nodeCoords = a_nodeCoords + (screenSpace + edgeOffset) / (u_dimensions);
      v_textureCoords = a_textureCoords + (screenSpace + edgeOffset) / (u_dimensions);
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
    uniform float u_rtt;

    uniform vec4 u_radius;
    uniform vec4 u_borderWidth;
    uniform vec4 u_borderColor;
    uniform vec4 u_shadowColor;
    uniform vec4 u_shadow;

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

    float shadowBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      float dist = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
      return 1.0 - smoothstep(-u_shadow.w, u_shadow.w + u_shadow.z, dist);
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec4 resultColor = vec4(0.0);
      vec2 boxUv = v_nodeCoords.xy * u_dimensions - v_halfDimensions;
      float nodeDist;
      float nodeAlpha;
      float shadowAlpha;

      if(v_borderZero == 1.0) {
        nodeDist = roundedBox(boxUv, v_halfDimensions - v_edgeWidth, u_radius);
        nodeAlpha = 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, nodeDist);
        shadowAlpha = shadowBox(boxUv - u_shadow.xy, v_halfDimensions + u_shadow.w - v_edgeWidth, u_radius + u_shadow.z);
        resultColor = mix(resultColor, u_shadowColor, shadowAlpha);
        gl_FragColor = mix(resultColor, color, nodeAlpha) * u_alpha;
        return;
      }

      if(v_outerSize.x > u_dimensions.x || v_outerSize.y > u_dimensions.y) {
        shadowAlpha = shadowBox(boxUv + v_outerBorderUv - u_shadow.xy, v_outerSize * 0.5 + u_shadow.w - v_edgeWidth, v_outerBorderRadius + u_shadow.z);
      }
      else {
        shadowAlpha = shadowBox(boxUv - u_shadow.xy, v_halfDimensions + u_shadow.w - v_edgeWidth, u_radius + u_shadow.z);
      }

      nodeDist = roundedBox(boxUv, v_halfDimensions - v_edgeWidth, u_radius);
      nodeAlpha = 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, nodeDist);
      float outerDist = roundedBox(boxUv + v_outerBorderUv, v_outerSize * 0.5 - v_edgeWidth, v_outerBorderRadius);
      float innerDist = roundedBox(boxUv + v_innerBorderUv, v_innerSize * 0.5 - v_edgeWidth, v_innerBorderRadius);
      float borderDist = max(-innerDist, outerDist);
      float borderAlpha = 1.0 - smoothstep(-0.5 * v_edgeWidth, 0.5 * v_edgeWidth, borderDist);
      resultColor = mix(resultColor, u_shadowColor, shadowAlpha);
      resultColor = mix(resultColor, color, nodeAlpha);
      resultColor = mix(resultColor, u_borderColor, borderAlpha * u_borderColor.a);
      gl_FragColor = resultColor * u_alpha;
    }
  `,
  };
