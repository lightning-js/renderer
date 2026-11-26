/*
 * Copyright 2026 Comcast Cable Communications, LLC
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
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  OutlineTemplate,
  type OutlineProps,
} from '../templates/OutlineTemplate.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

/**
 * Lightweight rectangular outline primitive (opt-in, WebGL only).
 *
 * @remarks
 * Renders a node's quad as a solid fill plus a uniform-width, hard-edged,
 * inside-aligned rectangular stroke. Unlike {@link Border} there is no
 * radius, gap, shadow or anti-aliasing: the stroke band is selected with a
 * `step()` in the fragment shader instead of a distance-field evaluation.
 *
 * Contract:
 * - Stroke width `w` is in node-local units (pixels at scale 1) and scales
 *   with the node's world transform.
 * - `w >= min(nodeW, nodeH) / 2` fills the whole node with the stroke color.
 * - `w <= 0` disables the stroke (fill only).
 * - Zero-width/height nodes produce degenerate (invisible) quads.
 * - Per-node dimensions travel in a dedicated vertex attribute
 *   (`a_dimensions`), so nodes of different sizes batch into a single draw
 *   call without per-node `u_dimensions` uniforms. Nodes using this shader
 *   are routed to the renderer's dedicated outline quad buffer
 *   (`usesOutlineBuffer`).
 * - Fill color/alpha comes from the premultiplied vertex color (which already
 *   includes world alpha); the stroke is modulated by the system `u_alpha`
 *   uniform, so render-op batching splits on world-alpha changes.
 *
 * This is NOT a drop-in replacement for the anti-aliased general Border
 * shader — pixels differ at the edges. Select it explicitly per node.
 */
export const Outline: WebGlShaderType<OutlineProps> = {
  props: OutlineTemplate.props,
  usesOutlineBuffer: true,
  update(_node) {
    this.uniform1f('u_outlineWidth', this.props!.w as number);
    this.uniformRGBA('u_outlineColor', this.props!.color);
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
    attribute vec2 a_dimensions;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;
    varying vec2 v_dims;

    void main() {
      vec2 normalized = a_position * u_pixelRatio / u_resolution;
      vec2 zero_two = normalized * 2.0;
      vec2 clip_space = zero_two - 1.0;

      v_color = a_color;
      v_textureCoords = a_textureCoords;
      v_nodeCoords = a_nodeCoords;
      v_dims = a_dimensions;

      gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
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
    uniform sampler2D u_texture;

    uniform float u_outlineWidth;
    uniform vec4 u_outlineColor;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;
    varying vec2 v_dims;

    void main() {
      // Premultiplied fill (vertex color already includes world alpha).
      vec4 fill = texture2D(u_texture, v_textureCoords) * v_color;

      // Distance to the nearest edge in node-local units. v_nodeCoords runs
      // 0..1 across the node, so scaling by the per-node dimensions yields
      // local pixels; this stays correct under any affine node transform.
      vec2 edgeDist = min(v_nodeCoords, 1.0 - v_nodeCoords) * v_dims;
      // Hard-edged inside stroke: 1 within u_outlineWidth of any edge.
      float stroke = max(
        step(edgeDist.x, u_outlineWidth),
        step(edgeDist.y, u_outlineWidth)
      );

      // Premultiplied stroke, modulated by world alpha.
      vec4 strokeColor = u_outlineColor * u_alpha;

      gl_FragColor = mix(fill, strokeColor, stroke);
    }
  `,
};
