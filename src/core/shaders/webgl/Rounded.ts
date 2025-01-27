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
  name: RoundedTemplate.name,
  props: RoundedTemplate.props,
  update(node: CoreNode) {
    const rad = calcFactoredRadiusArray(
      this.props!.radius as Vec4,
      node.width,
      node.height,
    );
    console.log('rad', rad);
    this.uniform4fa(
      'u_radius',
      calcFactoredRadiusArray(
        this.props!.radius as Vec4,
        node.width,
        node.height,
      ),
    );
  },
  getCacheMarkers(props: RoundedProps) {
    return `radiusArray:${Array.isArray(props.radius)}`;
  },
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform vec2 u_resolution;
    uniform vec2 u_dimensions;
    uniform float u_pixelRatio;
    uniform vec4 u_radius;
    uniform sampler2D u_texture;

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;
    varying vec2 v_position;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x) + 2.0;
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
      vec2 dims = u_dimensions;
      vec2 halfDimensions = dims * 0.5;

      vec2 p = v_textureCoordinate.xy * dims - halfDimensions;
      vec4 r = u_radius;
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      p = abs(p) - halfDimensions + r.x;

      float dist = (min(max(p.x, p.y), 0.0) + length(max(p, 0.0)) - r.x) + 2.0;
      dist = 1.0 - smoothstep(0.0, u_pixelRatio, dist);
      gl_FragColor = mix(vec4(0.0), color, min(color.a, dist));
    }
  `,
};
