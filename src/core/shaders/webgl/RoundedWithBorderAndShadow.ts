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
      const borderWidth = props['border-w'] as Vec4;
      const borderGap = props['border-gap'] || 0;

      this.uniformRGBA('u_borderColor', props['border-color']);
      this.uniform4fa('u_borderWidth', borderWidth);
      this.uniform1f('u_borderGap', borderGap);
      this.uniformRGBA('u_borderGapColor', props['border-gapColor']);

      this.uniformRGBA('u_shadowColor', props['shadow-color']);
      this.uniform4fa('u_shadow', props['shadow-projection']);

      const origWidth = node.w;
      const origHeight = node.h;
      this.uniform2f('u_dimensions_orig', origWidth, origHeight);

      const expandedWidth =
        origWidth + borderWidth[3] + borderWidth[1] + borderGap * 2; // original + left + right + 2*gap
      const expandedHeight =
        origHeight + borderWidth[0] + borderWidth[2] + borderGap * 2; // original + top + bottom + 2*gap

      // u_dimensions for the shader's SDF functions should be the expanded size (Content + Gap + Border)
      this.uniform2f('u_dimensions', expandedWidth, expandedHeight);

      // The `radius` property is for the content rectangle.
      // Factor it against the original dimensions to prevent self-intersection.
      const contentRadius = calcFactoredRadiusArray(
        props.radius as Vec4,
        origWidth,
        origHeight,
      );

      // From the content radius, calculate the outer radius of the border.
      const bTop = borderWidth[0],
        bRight = borderWidth[1],
        bBottom = borderWidth[2],
        bLeft = borderWidth[3];
      const outerRadius: Vec4 = [
        Math.max(0, contentRadius[0] + borderGap + Math.max(bTop, bLeft)), // top-left
        Math.max(0, contentRadius[1] + borderGap + Math.max(bTop, bRight)), // top-right
        Math.max(0, contentRadius[2] + borderGap + Math.max(bBottom, bRight)), // bottom-right
        Math.max(0, contentRadius[3] + borderGap + Math.max(bBottom, bLeft)), // bottom-left
      ];

      // The final radius passed to the shader is the outer radius of the whole shape.
      this.uniform4fa(
        'u_radius',
        calcFactoredRadiusArray(outerRadius, expandedWidth, expandedHeight),
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
    uniform vec2 u_dimensions_orig;

    uniform vec4 u_shadow;
    uniform vec4 u_radius;
    uniform vec4 u_borderWidth;
    uniform float u_borderGap;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    varying vec4 v_borderEndRadius;
    varying vec2 v_borderEndSize;
    varying vec4 v_innerRadius;
    varying vec2 v_innerSize;
    varying vec2 v_halfDimensions;
    varying float v_borderZero;

    void main() {
      vec2 screenSpace = vec2(2.0 / u_resolution.x,  -2.0 / u_resolution.y);

      v_color = a_color;

      float bTop = u_borderWidth.x;
      float bRight = u_borderWidth.y;
      float bBottom = u_borderWidth.z;
      float bLeft = u_borderWidth.w;
      float gap = u_borderGap;

      // 1. Calculate expansion for Border + Gap (Relative to original Node)
      vec2 borderExpansion = vec2(0.0);
      if (a_nodeCoords.x == 0.0) borderExpansion.x = -(bLeft + gap);
      else borderExpansion.x = (bRight + gap);

      if (a_nodeCoords.y == 0.0) borderExpansion.y = -(bTop + gap);
      else borderExpansion.y = (bBottom + gap);

      // 2. Calculate expansion for Shadow (Relative to Border Edge)
      // a_nodeCoords is 0 or 1. direction is -1 or 1.
      vec2 direction = vec2(a_nodeCoords.x == 0.0 ? -1.0 : 1.0, a_nodeCoords.y == 0.0 ? -1.0 : 1.0);

      // Shadow expands from the outer edge.
      // u_shadow: x=offset_x, y=offset_y, z=blur, w=spread
      vec2 shadowEdge = direction * (u_shadow.w * 2.0 + u_shadow.z) + u_shadow.xy;

      // 3. Final Vertex Position
      // Start with original position (Content), expand by Border/Gap, then expand by Shadow.
      vec2 vertexPos = (a_position + borderExpansion + shadowEdge) * u_pixelRatio;

      gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);

      // 4. Calculate varyings for SDFs

      // u_dimensions is the size of the shape (Content + Gap + Border).
      // We need v_nodeCoords to map 0..1 across u_dimensions.
      // Since we expanded the quad beyond u_dimensions (via shadowEdge),
      // v_nodeCoords must extrapolate outside 0..1.
      // Length of u_dimensions in pixels is u_dimensions.
      // Length added by shadowEdge is shadowEdge.
      // So new coord = oldCoord + (shadowEdge / u_dimensions)
      // Note: a_nodeCoords is 0 or 1.
      v_nodeCoords = a_nodeCoords + (shadowEdge / u_dimensions);

      // v_textureCoords maps to the original content box (u_dimensions_orig).
      // We can derive it from v_nodeCoords (which maps to u_dimensions).
      // Position in u_dimensions space: v_nodeCoords * u_dimensions
      // Content box starts at (bLeft + gap) inside u_dimensions space.
      // So pos relative to content: (v_nodeCoords * u_dimensions) - (bLeft + gap).
      // Normalized: / u_dimensions_orig.
      v_textureCoords = (v_nodeCoords * u_dimensions - (bLeft + gap)) / u_dimensions_orig;

      v_halfDimensions = u_dimensions * 0.5;

      v_borderZero = (u_borderWidth == vec4(0.0)) ? 1.0 : 0.0;

      if(v_borderZero == 0.0) {
         // Calculate radius and size for the inner edge of the border (where the gap begins)
        v_borderEndRadius = vec4(
          max(0.0, u_radius.x - max(bTop, bLeft) - 0.5),
          max(0.0, u_radius.y - max(bTop, bRight) - 0.5),
          max(0.0, u_radius.z - max(bBottom, bRight) - 0.5),
          max(0.0, u_radius.w - max(bBottom, bLeft) - 0.5)
        );
        v_borderEndSize = vec2(
            (u_dimensions.x - (bLeft + bRight) - 1.0),
            (u_dimensions.y - (bTop + bBottom) - 1.0)
        ) * 0.5;

        // Calculate radius and size for the content area (after the gap)
        v_innerRadius = vec4(
          max(0.0, u_radius.x - max(bTop, bLeft) - u_borderGap - 0.5),
          max(0.0, u_radius.y - max(bTop, bRight) - u_borderGap - 0.5),
          max(0.0, u_radius.z - max(bBottom, bRight) - u_borderGap - 0.5),
          max(0.0, u_radius.w - max(bBottom, bLeft) - u_borderGap - 0.5)
        );
        v_innerSize = vec2(
            (u_dimensions.x - (bLeft + bRight) - (u_borderGap * 2.0) - 1.0),
            (u_dimensions.y - (bTop + bBottom) - (u_borderGap * 2.0) - 1.0)
        ) * 0.5;
      }
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
    uniform vec4 u_borderGapColor;

    uniform vec4 u_shadowColor;
    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    varying vec2 v_halfDimensions;
    varying vec4 v_borderEndRadius;
    varying vec2 v_borderEndSize;
    varying vec4 v_innerRadius;
    varying vec2 v_innerSize;
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
      return 1.0 - smoothstep(-(u_shadow.w), (u_shadow.w + u_shadow.z), dist);
    }

    void main() {
      vec4 contentTexColor = texture2D(u_texture, v_textureCoords) * v_color;

      vec2 boxUv = v_nodeCoords.xy * u_dimensions - v_halfDimensions;

      // Outer Shape Distance (Outset Border)
      float outerShapeDist = roundedBox(boxUv, v_halfDimensions, u_radius);

      float edgeWidth = 1.0 / u_pixelRatio;
      float outerShapeAlpha = 1.0 - smoothstep(-0.5 * edgeWidth, 0.5 * edgeWidth, outerShapeDist);

      // Shadow
      // Shadow uses the same boxUv (relative to current pixel) but assumes the shape is offset by u_shadow.xy
      // And the shadow shape is expanded by spread (shadow.w).
      // Note: roundedBox returns distance from edge.
      // shadowBox calculates alpha based on distance.
      float shadowAlpha = shadowBox(boxUv - u_shadow.xy, v_halfDimensions + u_shadow.w, u_radius + u_shadow.z);

      // If no border, we treat it as Content + Shadow
      if(v_borderZero == 1.0) {
         // Mix Shadow with Content based on OuterShapeAlpha (which acts as ContentAlpha here)
         // Wait, if no border/gap, outerShapeDist IS the content dist.
         vec4 shadow = mix(vec4(0.0), u_shadowColor, shadowAlpha);
         gl_FragColor = mix(shadow, contentTexColor, outerShapeAlpha) * u_alpha;
         return;
      }

      // Adjust boxUv for non-uniform borders
      vec2 adjustedBoxUv = boxUv;
      adjustedBoxUv.x += (u_borderWidth.y - u_borderWidth.w) * 0.5;
      adjustedBoxUv.y += (u_borderWidth.z - u_borderWidth.x) * 0.5;

      // Inner Border Edge (Gap starts here)
      float borderEndDist = roundedBox(adjustedBoxUv, v_borderEndSize, v_borderEndRadius);
      float borderEndAlpha = 1.0 - smoothstep(-0.5 * edgeWidth, 0.5 * edgeWidth, borderEndDist);

      // Content Area
      float contentDist = roundedBox(adjustedBoxUv, v_innerSize, v_innerRadius);
      float contentAlpha = 1.0 - smoothstep(-0.5 * edgeWidth, 0.5 * edgeWidth, contentDist);

      // Calculate Masks for layers
      float borderMask = clamp(outerShapeAlpha - borderEndAlpha, 0.0, 1.0);
      float gapMask = clamp(borderEndAlpha - contentAlpha, 0.0, 1.0);

      // Composite Layers
      // 0. Shadow (Base)
      vec4 composite = mix(vec4(0.0), u_shadowColor, shadowAlpha);

      // 1. Content
      composite = mix(composite, contentTexColor, contentAlpha);

      // 2. Gap
      composite = mix(composite, u_borderGapColor, gapMask);

      // 3. Border
      composite = mix(composite, u_borderColor, borderMask);

      // Final Alpha weighting (Use outerShapeAlpha only for edge AA? No, composite already handles shape)
      // Actually, composite at this point covers the whole shape (Content+Gap+Border+Shadow).
      // Wait, shadowAlpha extends BEYOND outerShapeAlpha.

      // Logic check:
      // contentAlpha handles content shape.
      // gapMask handles gap shape.
      // borderMask handles border shape.
      // shadowAlpha handles shadow shape.

      // If we are strictly in Shadow area (outside Border), borderMask=0, gapMask=0, contentAlpha=0.
      // composite starts as ShadowColor * shadowAlpha.
      // mix(composite, content, 0) -> shadow.
      // mix(shadow, gap, 0) -> shadow.
      // mix(shadow, border, 0) -> shadow.
      // Result: Shadow. Correct.

      // If we are in Border area:
      // borderMask=1.
      // composite starts as Shadow.
      // mix(shadow, content, 0) -> shadow.
      // mix(shadow, gap, 0) -> shadow.
      // mix(shadow, border, 1) -> Border. Correct.

      gl_FragColor = composite * u_alpha;
    }
  `,
  };
