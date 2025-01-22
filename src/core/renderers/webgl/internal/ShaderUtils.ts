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
