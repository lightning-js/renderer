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
import type { WebGlShaderType } from '../WebGlShaderNode.js';
import {
  calcFactoredRadius,
  calcFactoredRadiusArray,
} from '../../../lib/utils.js';
import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import {
  RoundedRectangleTemplate,
  type RoundedRectangleProps,
} from '../../../shaders/RoundedRectangleTemplate.js';
import { assertTruthy } from '../../../../utils.js';
import type { CoreNode } from '../../../CoreNode.js';
import type { Vec4 } from '../internal/ShaderUtils.js';

/**
 * Similar to the {@link DefaultShader} but cuts out 4 rounded rectangle corners
 * as defined by the specified corner {@link RoundedRectangleProps.radius}
 */
export const RoundedRectangle: WebGlShaderType<RoundedRectangleProps> = {
  name: RoundedRectangleTemplate.name,
  props: RoundedRectangleTemplate.props,
  update(node: CoreNode) {
    assertTruthy(this.props);
    if (!Array.isArray(this.props.radius)) {
      this.uniform1f(
        'u_radius',
        calcFactoredRadius(this.props.radius, node.width, node.height),
      );
    } else {
      const fRadius = calcFactoredRadiusArray(
        this.props.radius as Vec4,
        node.width,
        node.height,
      );
      this.uniform4f(
        'u_radius',
        fRadius[0],
        fRadius[1],
        fRadius[2],
        fRadius[3],
      );
    }
  },
  getCacheMarkers(props: RoundedRectangleProps) {
    return `radiusArray:${Array.isArray(props.radius)}`;
  },
  fragment(renderer: WebGlCoreRenderer, props: RoundedRectangleProps) {
    return `
      # ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      uniform vec2 u_resolution;
      uniform vec2 u_dimensions;
      uniform ${Array.isArray(props.radius) ? 'vec4' : 'float'} u_radius;
      uniform sampler2D u_texture;

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;
      varying vec2 v_position;

      float boxDist(vec2 p, vec2 size, float radius){
        size -= vec2(radius);
        vec2 d = abs(p) - size;
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius;
      }

      float fillMask(float dist) {
        return clamp(-dist, 0.0, 1.0);
      }

      void main() {
        vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
        vec2 halfDimensions = u_dimensions * 0.5;
        ${
          Array.isArray(props.radius)
            ? `
            float radius = u_radius[0] * step(v_textureCoordinate.x, 0.5) * step(v_textureCoordinate.y, 0.5);
            radius = radius + u_radius[1] * step(0.5, v_textureCoordinate.x) * step(v_textureCoordinate.y, 0.5);
            radius = radius + u_radius[2] * step(0.5, v_textureCoordinate.x) * step(0.5, v_textureCoordinate.y);
            radius = radius + u_radius[3] * step(v_textureCoordinate.x, 0.5) * step(0.5, v_textureCoordinate.y);
          `
            : `
            float radius = u_radius;
          `
        }

        float d = boxDist(v_textureCoordinate.xy * u_dimensions - halfDimensions, halfDimensions + 0.5, radius);
        gl_FragColor = mix(vec4(0.0), color, fillMask(d));
      }
    `;
  },
};
