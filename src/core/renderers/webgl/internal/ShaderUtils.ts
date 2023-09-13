/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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

import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';

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

export interface ShaderOptions {
  renderer: WebGlCoreRenderer;
  attributes: string[];
  uniforms: UniformInfo[];
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

type ShaderSource = string | ((textureUnits: number) => string);

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
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error();
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = gl.createProgram();
  if (!program) {
    throw new Error();
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return undefined;
}
