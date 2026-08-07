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

/**
 * SdfShader supports multi-channel and single-channel signed distance field textures.
 *
 * @remarks
 * This Shader is used by the {@link SdfTextRenderer}. Do not use this Shader
 * directly. Instead create a Text Node and assign a SDF font family to it.
 *
 * All per-glyph data (world-pixel position, color, distance range, style) is
 * provided via vertex attributes so that multiple text nodes sharing the same
 * font atlas can be batched into a single draw call inside the renderer's
 * shared SDF buffer. Positions are pre-transformed to world pixel space on the
 * CPU (mirroring the old per-node `u_size` + `u_transform` uniforms), so the
 * only remaining uniforms are the resolution / pixel-ratio camera constants.
 *
 * @internalRemarks
 * The only thing this shader does to support multi-channel SDFs is to
 * add a median function to the fragment shader. If this one function call
 * ends up being a performance bottleneck we can always look at ways to
 * remove it.
 */

const sharedVertexAttributes = `
  // Pre-transformed world-pixel position
  attribute vec2 a_position;
  attribute vec2 a_textureCoords;
  // Per-vertex color (RGBA, unsigned byte, normalized). Carries the node tint
  // (with world alpha) merged with any span color override.
  attribute vec4 a_color;
  // Per-vertex SDF distance range (font-specific)
  attribute float a_distRange;

  uniform vec2 u_resolution;
  uniform float u_pixelRatio;

  varying vec2 v_texcoord;
  varying float v_scaledDistRange;
  varying vec4 v_color;
`;

const sharedVertexMain = `
  void main() {
    // a_position is already in world pixel space (pre-transformed on CPU)
    vec2 screenSpace = (a_position * u_pixelRatio / u_resolution * 2.0 - 1.0) * vec2(1, -1);

    gl_Position = vec4(screenSpace, 0.0, 1.0);
    v_texcoord = a_textureCoords;
    v_scaledDistRange = a_distRange * u_pixelRatio;
    v_color = a_color;
  }
`;

/**
 * Plain SDF shader — no per-vertex style attribute.
 *
 * Used when richText=false (the default). The vertex format is 6 floats/vertex
 * (x, y, u, v, packed_color, distRange) and the fragment shader is the minimal
 * SDF path with no solid-fill branch. This keeps the VBO smaller and the
 * fragment shader cheap for all ordinary text nodes.
 */
export const SdfPlain: WebGlShaderType = {
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    ${sharedVertexAttributes}
    ${sharedVertexMain}
  `,
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    uniform sampler2D u_texture;

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;
    varying vec4 v_color;

    float median(float r, float g, float b) {
        return clamp(b, min(r, g), max(r, g));
    }

    void main() {
        vec3 s = texture2D(u_texture, v_texcoord).rgb;
        float sigDist = v_scaledDistRange * (median(s.r, s.g, s.b) - 0.5);
        float opacity = clamp(sigDist + 0.5, 0.0, 1.0) * v_color.a;

        // IMPORTANT: We must premultiply the color by the alpha value before returning it.
        gl_FragColor = vec4(v_color.rgb * opacity, opacity);
    }
  `,
};

/**
 * Rich SDF shader — adds a per-vertex style attribute.
 *
 * Used when richText=true. The vertex format is 7 floats/vertex
 * (x, y, u, v, packed_color, style, distRange) and the fragment shader keeps
 * the rich-text features: `u = -1.0` decoration sentinel for solid-fill
 * underline/strikethrough quads and the bold SDF threshold shift.
 */
export const Sdf: WebGlShaderType = {
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    ${sharedVertexAttributes}
    // Per-vertex style flag: 0.0 = normal, 1.0 = bold.
    attribute float a_style;

    varying float v_style;

    void main() {
      vec2 screenSpace = (a_position * u_pixelRatio / u_resolution * 2.0 - 1.0) * vec2(1, -1);

      gl_Position = vec4(screenSpace, 0.0, 1.0);
      v_texcoord = a_textureCoords;
      v_scaledDistRange = a_distRange * u_pixelRatio;
      v_color = a_color;
      v_style = a_style;
    }
  `,
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    uniform sampler2D u_texture;

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;
    varying vec4 v_color;
    varying float v_style;

    float median(float r, float g, float b) {
        return clamp(b, min(r, g), max(r, g));
    }

    void main() {
        // Decoration quads use u = -1.0 as a sentinel for solid-fill (no SDF lookup).
        // step(0.5, -u): 1.0 when u <= -0.5 — safely catches only the -1.0 sentinel.
        // Cannot use step(0.0, -u) because that also catches u = 0.0, which is a
        // valid atlas coordinate for any glyph packed at the left edge of the atlas.
        float isSolid = step(0.5, -v_texcoord.x);

        // SDF path — runs unconditionally; result is masked out for solid quads via
        // mix() below. Sampling with u = -1.0 is safe: the atlas uses CLAMP_TO_EDGE
        // so it returns the leftmost texel column, but the result is zeroed by mix().
        vec3 s = texture2D(u_texture, v_texcoord).rgb;
        // Bold shifts the SDF threshold down by 0.05, expanding glyph edges.
        // v_style: 0.0 = normal, 1.0 = bold.
        float threshold = 0.5 - v_style * 0.05;
        float sigDist = v_scaledDistRange * (median(s.r, s.g, s.b) - threshold);
        // v_color already carries node tint × world alpha × span override.
        float opacity = clamp(sigDist + threshold, 0.0, 1.0) * v_color.a;
        vec3 col = v_color.rgb;
        // IMPORTANT: premultiply before returning.
        vec4 sdfResult = vec4(col * opacity, opacity);

        // Solid fill path — premultiplied alpha.
        vec4 fc = v_color;
        vec4 solidResult = vec4(fc.rgb * fc.a, fc.a);

        gl_FragColor = mix(sdfResult, solidResult, isSolid);
    }
  `,
};
