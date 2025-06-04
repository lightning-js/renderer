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

import type { WebGlContextWrapper } from '../../../lib/WebGlContextWrapper.js';

//#region Types
export interface AttributeInfo {
  name: string;
  size: number;
  type: number;
  normalized: boolean;
  stride: number;
  offset: number;
}

export interface UniformInfo {
  name: string;
  uniform: keyof UniformMethodMap;
}

export type SingleValue = number | Float32Array | Int32Array;
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export type UniformValue = SingleValue | Vec2 | Vec3 | Vec4;

export interface UniformCollection {
  single: Record<string, Uniform<SingleValue>>;
  vec2: Record<string, Uniform<Vec2>>;
  vec3: Record<string, Uniform<Vec3>>;
  vec4: Record<string, Uniform<Vec4>>;
}

export interface Uniform<T = UniformValue> {
  method: string;
  value: T;
}

export interface SupportedSetUniforms {
  uniform2fv: Float32Array;
  uniform2iv: Int32Array;
  uniform3fv:
    | 'uniform2iv'
    | 'uniform3fv'
    | 'uniform3iv'
    | 'uniform4fv'
    | 'uniform4iv'
    | 'uniformMatrix2fv'
    | 'uniformMatrix3fv'
    | 'uniformMatrix4fv'
    | 'uniform1f'
    | 'uniform1fv'
    | 'uniform1i'
    | 'uniform1iv'
    | 'uniform3fv'
    | 'uniform2f'
    | 'uniform2i'
    | 'uniform3f'
    | 'uniform3i'
    | 'uniform4f'
    | 'uniform4i';
}

type SupportSetUniforms =
  | 'uniform2fv'
  | 'uniform2iv'
  | 'uniform3fv'
  | 'uniform3iv'
  | 'uniform4fv'
  | 'uniform4iv'
  | 'uniformMatrix2fv'
  | 'uniformMatrix3fv'
  | 'uniformMatrix4fv'
  | 'uniform1f'
  | 'uniform1fv'
  | 'uniform1i'
  | 'uniform1iv'
  | 'uniform3fv'
  | 'uniform2f'
  | 'uniform2i'
  | 'uniform3f'
  | 'uniform3i'
  | 'uniform4f'
  | 'uniform4i';

export interface ShaderOptions {
  shaderSources?: ShaderProgramSources;
  supportsIndexedTextures?: boolean;
  webgl1Extensions?: string[];
  webgl2Extensions?: string[];
}

// prettier-ignore
type IsUniformMethod<MethodName, MethodType> = MethodName extends `uniform${string}`
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MethodType extends (location: WebGLUniformLocation | null, ...args: any[]) => void
  ? true
  : false
  : false;

// prettier-ignore
export type UniformMethodMap = {
  [Key in keyof WebGLRenderingContext as IsUniformMethod<Key, WebGLRenderingContext[Key]> extends true ? Key : never]: WebGLRenderingContext[Key] extends (
    location: WebGLUniformLocation | null,
    ...args: infer T
  ) => void
  ? T
  : never;
};

export type UniformSet1Param = Omit<
  UniformMethodMap,
  | 'uniform2f'
  | 'uniform2i'
  | 'uniform3f'
  | 'uniform3i'
  | 'uniform4f'
  | 'uniform4i'
>;
export type UniformSet2Params = Pick<
  UniformMethodMap,
  'uniform2f' | 'uniform2i'
>;
export type UniformSet3Params = Pick<
  UniformMethodMap,
  'uniform3f' | 'uniform3i'
>;
export type UniformSet4Params = Pick<
  UniformMethodMap,
  'uniform4f' | 'uniform4i'
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TupleToObject<T extends any[]> = Omit<T, keyof any[]>;

// Why the below has to be so insane is beyond me
// prettier-ignore
export type UniformTupleToMap<Uniforms extends [...UniformInfo[]]> = {
  [Key in keyof TupleToObject<Uniforms> as TupleToObject<Uniforms>[Key] extends {
    name: infer K extends string;
  }
  ? K
  : never]: TupleToObject<Uniforms>[Key] extends {
    uniform: infer T extends keyof UniformMethodMap;
  }
  ? UniformMethodMap[T]
  : never;
};

export type ShaderSource = string | ((textureUnits: number) => string);

export interface ShaderProgramSources {
  vertex: ShaderSource;
  fragment: ShaderSource;
  webGl2?: {
    vertex: ShaderSource;
    fragment: ShaderSource;
  };
}

//#endregion Types

export function createShader(
  glw: WebGlContextWrapper,
  type: number,
  source: string,
) {
  const shader = glw.createShader(type);
  if (!shader) {
    const glError = glw.getError();
    throw new Error(
      `Unable to create the shader: ${
        type === glw.VERTEX_SHADER ? 'VERTEX_SHADER' : 'FRAGMENT_SHADER'
      }.${glError ? ` WebGlContext Error: ${glError}` : ''}`,
    );
  }

  glw.shaderSource(shader, source);
  glw.compileShader(shader);
  const success = !!glw.getShaderParameter(shader, glw.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.error(glw.getShaderInfoLog(shader));
  glw.deleteShader(shader);
}

export function createProgram(
  glw: WebGlContextWrapper,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = glw.createProgram();
  if (!program) {
    throw new Error('Unable to create program');
  }

  glw.attachShader(program, vertexShader);
  glw.attachShader(program, fragmentShader);
  glw.linkProgram(program);
  const success = !!glw.getProgramParameter(program, glw.LINK_STATUS);
  if (success) {
    return program;
  }

  console.warn(glw.getProgramInfoLog(program));
  glw.deleteProgram(program);
  return undefined;
}

export const DefaultVertexSource = `
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
  uniform vec4 u_shadow;

  varying vec4 v_color;
  varying vec2 v_textureCoords;

  void main() {
    vec2 normalized = a_position * u_pixelRatio;
    vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);

    vec2 outerEdge = clamp(a_textureCoords * 2.0 - vec2(1.0), -1.0, 1.0);
    vec2 shadowEdge = outerEdge;
    vec2 vertexPos = normalized + outerEdge + shadowEdge;
    v_color = a_color;
    v_textureCoords = a_textureCoords;

    gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);
  }
`;

/**
 * generate fragment source for
 * @param stops
 * @returns
 */
export function genGradientColors(stops: number): string {
  let result = `
    float stopCalc = (dist - u_stops[0]) / (u_stops[1] - u_stops[0]);
    vec4 colorOut = mix(u_colors[0], u_colors[1], stopCalc);
  `;
  if (stops > 2) {
    for (let i = 2; i < stops; i++) {
      result += `colorOut = mix(colorOut, u_colors[${i}], clamp((dist - u_stops[${
        i - 1
      }]) / (u_stops[${i}] - u_stops[${i - 1}]), 0.0, 1.0));`;
    }
  }
  return result;
}
