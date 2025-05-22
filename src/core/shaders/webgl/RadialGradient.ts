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
import { getNormalizedRgbaComponents } from '../../lib/utils.js';
import {
  RadialGradientTemplate,
  type RadialGradientProps,
} from '../templates/RadialGradientTemplate.js';
import { genGradientColors } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlRenderer } from '../../renderers/webgl/WebGlRenderer.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

export const RadialGradient: WebGlShaderType<RadialGradientProps> = {
  props: RadialGradientTemplate.props,
  update(node: CoreNode) {
    const props = this.props!;
    this.uniform2f(
      'u_projection',
      props.pivot[0] * node.width,
      props.pivot[1] * node.height,
    );
    this.uniform2f('u_size', props.width * 0.5, props.height * 0.5);
    this.uniform1fv('u_stops', new Float32Array(props.stops));
    const colors: number[] = [];
    for (let i = 0; i < props.colors.length; i++) {
      const norm = getNormalizedRgbaComponents(props.colors[i]!);
      colors.push(norm[0], norm[1], norm[2], norm[3]);
    }
    this.uniform4fv('u_colors', new Float32Array(colors));
  },
  getCacheMarkers(props: RadialGradientProps) {
    return `colors:${props.colors.length}`;
  },
  fragment(renderer: WebGlRenderer, props: RadialGradientProps) {
    return `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    #define PI 3.14159265359

    uniform float u_alpha;
    uniform vec2 u_dimensions;

    uniform sampler2D u_texture;

    uniform vec2 u_projection;
    uniform vec2 u_size;
    uniform float u_stops[${props.stops.length}];
    uniform vec4 u_colors[${props.colors.length}];

    varying vec4 v_color;
    varying vec2 v_textureCoords;

    vec2 calcPoint(float d, float angle) {
      return d * vec2(cos(angle), sin(angle)) + (u_dimensions * 0.5);
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 point = v_textureCoords.xy * u_dimensions;
      float dist = length((point - u_projection) / u_size);
      ${genGradientColors(props.stops.length)}
      gl_FragColor = mix(color, colorOut, clamp(colorOut.a, 0.0, 1.0));
    }
  `;
  },
};
