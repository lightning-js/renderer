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
import { getNormalizedRgbaComponents } from '../../lib/utils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

const IDENTITY_MATRIX_3x3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
/**
 * Properties of the {@link SdfShader}
 */
export interface SdfShaderProps {
  transform: Float32Array;
  /**
   * Color in RGBA format
   *
   * @remarks
   * Color channels must NOT be premultiplied by alpha for best blending results.
   */
  color: number;
  size: number;
  distanceRange: number;
}
/**
 * SdfShader supports multi-channel and single-channel signed distance field textures.
 *
 * @remarks
 * This Shader is used by the {@link SdfTextRenderer}. Do not use thie Shader
 * directly. Instead create a Text Node and assign a SDF font family to it.
 *
 * @internalRemarks
 * The only thing this shader does to support multi-channel SDFs is to
 * add a median function to the fragment shader. If this one function call
 * ends up being a performance bottleneck we can always look at ways to
 * remove it.
 */
/**
 * Plain SDF shader — no per-vertex color or style attributes.
 *
 * Used when richText=false (the default). Matches the v3.0.6 vertex format
 * (4 floats/vertex: x, y, u, v) and the original simple fragment path with
 * no solid-fill branch. This keeps the VBO 33% smaller and the fragment
 * shader minimal for all ordinary text nodes.
 */
export const SdfPlain: WebGlShaderType<SdfShaderProps> = {
  props: {
    transform: IDENTITY_MATRIX_3x3,
    color: 0xffffffff,
    size: 16,
    distanceRange: 1.0,
  },
  onSdfBind(props) {
    this.uniformMatrix3fv('u_transform', props.transform);
    this.uniform4fa('u_color', getNormalizedRgbaComponents(props.color));
    this.uniform1f('u_size', props.size);
    this.uniform1f('u_distanceRange', props.distanceRange);
  },
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    attribute vec2 a_position;
    attribute vec2 a_textureCoords;

    uniform vec2 u_resolution;
    uniform mat3 u_transform;
    uniform float u_pixelRatio;
    uniform float u_size;
    uniform float u_distanceRange;

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;

    void main() {
      vec2 scrolledPosition = a_position * u_size;
      vec2 transformedPosition = (u_transform * vec3(scrolledPosition, 1)).xy;

      // Calculate screen space with pixel ratio
      vec2 screenSpace = (transformedPosition * u_pixelRatio / u_resolution * 2.0 - 1.0) * vec2(1, -1);

      gl_Position = vec4(screenSpace, 0.0, 1.0);
      v_texcoord = a_textureCoords;
      v_scaledDistRange = u_distanceRange * u_pixelRatio;
    }
  `,
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    uniform vec4 u_color;
    uniform sampler2D u_texture;

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;

    float median(float r, float g, float b) {
        return clamp(b, min(r, g), max(r, g));
    }

    void main() {
        vec3 sample = texture2D(u_texture, v_texcoord).rgb;
        float sigDist = v_scaledDistRange * (median(sample.r, sample.g, sample.b) - 0.5);
        float opacity = clamp(sigDist + 0.5, 0.0, 1.0) * u_color.a;

        // IMPORTANT: We must premultiply the color by the alpha value before returning it.
        gl_FragColor = vec4(u_color.r * opacity, u_color.g * opacity, u_color.b * opacity, opacity);
    }
  `,
};

export const Sdf: WebGlShaderType<SdfShaderProps> = {
  props: {
    transform: IDENTITY_MATRIX_3x3,
    color: 0xffffffff,
    size: 16,
    distanceRange: 1.0,
  },
  onSdfBind(props) {
    this.uniformMatrix3fv('u_transform', props.transform);
    this.uniform4fa('u_color', getNormalizedRgbaComponents(props.color));
    this.uniform1f('u_size', props.size);
    this.uniform1f('u_distanceRange', props.distanceRange);
  },
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    // an attribute is an input (in) to a vertex shader.
    // It will receive data from a buffer
    attribute vec2 a_position;
    attribute vec2 a_textureCoords;
    // Per-vertex span color (UNSIGNED_BYTE normalized). White = no override.
    attribute vec4 a_color;
    // Per-vertex style flag: 0.0 = normal, 1.0 = bold.
    attribute float a_style;

    uniform vec2 u_resolution;
    uniform mat3 u_transform;
    uniform float u_pixelRatio;
    uniform float u_size;
    uniform float u_distanceRange;

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;
    varying vec4 v_color;
    varying float v_style;

    void main() {
      vec2 scrolledPosition = a_position * u_size;
      vec2 transformedPosition = (u_transform * vec3(scrolledPosition, 1)).xy;

      // Calculate screen space with pixel ratio
      vec2 screenSpace = (transformedPosition * u_pixelRatio / u_resolution * 2.0 - 1.0) * vec2(1, -1);

      gl_Position = vec4(screenSpace, 0.0, 1.0);
      v_texcoord = a_textureCoords;
      v_scaledDistRange = u_distanceRange * u_pixelRatio;
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
    uniform vec4 u_color;
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
        // u_color carries node tint + worldAlpha; v_color carries span color override.
        float opacity = clamp(sigDist + threshold, 0.0, 1.0) * u_color.a * v_color.a;
        vec3 col = u_color.rgb * v_color.rgb;
        // IMPORTANT: premultiply before returning.
        vec4 sdfResult = vec4(col * opacity, opacity);

        // Solid fill path — premultiplied alpha.
        vec4 fc = u_color * v_color;
        vec4 solidResult = vec4(fc.rgb * fc.a, fc.a);

        gl_FragColor = mix(sdfResult, solidResult, isSolid);
    }
  `,
};
