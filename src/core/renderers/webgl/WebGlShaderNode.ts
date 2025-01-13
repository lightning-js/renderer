import type { CoreNode } from '../../CoreNode.js';
import { getNormalizedRgbaComponents } from '../../lib/utils.js';
import type { Stage } from '../../Stage.js';
import type { QuadOptions } from '../CoreRenderer.js';
import { CoreShaderNode, type CoreShaderType } from '../CoreShaderNode.js';
import type { UniformCollection } from './internal/ShaderUtils.js';
import type { WebGlRenderer } from './WebGlRenderer.js';
import type { WebGlShaderProgram } from './WebGlShaderProgram.js';

type ShaderSource<T> = string | ((renderer: WebGlRenderer, props: T) => string);

export type WebGlShaderType<T extends object = Record<string, unknown>> =
  CoreShaderType<T> & {
    /**
     * fragment shader source for WebGl or WebGl2
     */
    fragment: ShaderSource<T>;
    /**
     * vertex shader source for WebGl or WebGl2
     */
    vertex?: ShaderSource<T>;
    /**
     * This function is called when one of the props is changed, here you can update the uniforms you use in the fragment / vertex shader.
     * @param node WebGlContextWrapper with utilities to update uniforms, and other actions.
     * @returns
     */
    update?: (this: WebGlShaderNode<T>, node: CoreNode) => void;
    /**
     * This function is used to check if the shader can bereused based on quad info
     * @param props
     * @returns
     */
    canBatch?: (renderOpA: QuadOptions, renderOpB: QuadOptions) => boolean;
    /**
     * extensions required for specific shader?
     */
    webgl1Extensions?: string[];
    webgl2Extensions?: string[];
    supportsIndexedTextures?: boolean;
  };

export class WebGlShaderNode<
  Props extends object = Record<string, unknown>,
> extends CoreShaderNode<Props> {
  declare readonly program: WebGlShaderProgram;
  private updater: ((node: CoreNode) => void) | undefined = undefined;
  private valueKey: string | undefined = '';
  uniforms: UniformCollection = {
    single: {},
    vec2: {},
    vec3: {},
    vec4: {},
  };

  constructor(
    shaderKey: string,
    config: WebGlShaderType<Props>,
    program: WebGlShaderProgram,
    stage: Stage,
    props?: Props,
  ) {
    super(shaderKey, config, program, stage, props);
    if (config.update !== undefined) {
      this.updater = config.update;

      this.update = () => {
        if (this.props === undefined) {
          this.updater!(this.node as CoreNode);
          return;
        }

        this.valueKey = '';
        for (const key in this.resolvedProps) {
          this.valueKey += `${key}:${this.resolvedProps[key]!};`;
        }
        const values = this.stage.shManager.getShaderValues(
          this.valueKey,
        ) as unknown as UniformCollection;
        if (values !== undefined) {
          this.uniforms = values;
          return;
        }
        //create empty uniform collection when calculating new values
        this.uniforms = {
          single: {},
          vec2: {},
          vec3: {},
          vec4: {},
        };
        this.updater!(this.node as CoreNode);
        this.stage.shManager.setShaderValues(
          this.valueKey,
          this.uniforms as unknown as Record<string, unknown>,
        );
      };
    }
  }

  /**
   * Sets the value of a RGBA variable
   * @param location
   * @param value
   */
  uniformRGBA(location: string, value: number) {
    this.uniform4fv(
      location,
      new Float32Array(getNormalizedRgbaComponents(value)),
    );
  }

  /**
   * Sets the value of a single float uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The value to set.
   */
  uniform1f(location: string, value: number) {
    this.uniforms.single[location] = {
      method: 'uniform1f',
      value,
    };
  }

  /**
   * Sets the value of a float array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of values to set.
   */
  uniform1fv(location: string, value: Float32Array) {
    this.uniforms.single[location] = {
      method: 'uniform1fv',
      value,
    };
  }

  /**
   * Sets the value of a single integer uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The value to set.
   */
  uniform1i(location: string, value: number) {
    this.uniforms.single[location] = {
      method: 'uniform1i',
      value,
    };
  }

  /**
   * Sets the value of an integer array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of values to set.
   */
  uniform1iv(location: string, value: Int32Array) {
    this.uniforms.single[location] = {
      method: 'uniform1iv',
      value,
    };
  }

  /**
   * Sets the value of a vec2 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   */
  uniform2f(location: string, v0: number, v1: number) {
    this.uniforms.vec2[location] = {
      method: 'uniform2f',
      value: [v0, v1],
    };
  }

  /**
   * Sets the value of a vec2 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec2 values to set.
   */
  uniform2fv(location: string, value: Float32Array) {
    this.uniforms.single[location] = {
      method: 'uniform2fv',
      value,
    };
  }

  /**
   * Sets the value of a ivec2 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   */
  uniform2i(location: string, v0: number, v1: number) {
    this.uniforms.vec2[location] = {
      method: 'uniform2i',
      value: [v0, v1],
    };
  }

  /**
   * Sets the value of an ivec2 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec2 values to set.
   */
  uniform2iv(location: string, value: Int32Array) {
    this.uniforms.single[location] = {
      method: 'uniform2iv',
      value,
    };
  }

  /**
   * Sets the value of a vec3 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   */
  uniform3f(location: string, v0: number, v1: number, v2: number) {
    this.uniforms.vec3[location] = {
      method: 'uniform3f',
      value: [v0, v1, v2],
    };
  }

  /**
   * Sets the value of a vec3 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec3 values to set.
   */
  uniform3fv(location: string, value: Float32Array) {
    this.uniforms.single[location] = {
      method: 'uniform3fv',
      value,
    };
  }

  /**
   * Sets the value of a ivec3 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   */
  uniform3i(location: string, v0: number, v1: number, v2: number) {
    this.uniforms.vec3[location] = {
      method: 'uniform3i',
      value: [v0, v1, v2],
    };
  }

  /**
   * Sets the value of an ivec3 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec3 values to set.
   */
  uniform3iv(location: string, value: Int32Array) {
    this.uniforms.single[location] = {
      method: 'uniform3iv',
      value,
    };
  }

  /**
   * Sets the value of a vec4 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   * @param v3 - The fourth component of the vector.
   */
  uniform4f(location: string, v0: number, v1: number, v2: number, v3: number) {
    this.uniforms.vec4[location] = {
      method: 'uniform4f',
      value: [v0, v1, v2, v3],
    };
  }

  /**
   * Sets the value of a vec4 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec4 values to set.
   */
  uniform4fv(location: string, value: Float32Array) {
    this.uniforms.single[location] = {
      method: 'uniform4fv',
      value,
    };
  }

  /**
   * Sets the value of a ivec4 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   * @param v3 - The fourth component of the vector.
   */
  uniform4i(location: string, v0: number, v1: number, v2: number, v3: number) {
    this.uniforms.vec4[location] = {
      method: 'uniform4i',
      value: [v0, v1, v2, v3],
    };
  }

  /**
   * Sets the value of an ivec4 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec4 values to set.
   */
  uniform4iv(location: string, value: Int32Array) {
    this.uniforms.single[location] = {
      method: 'uniform4iv',
      value,
    };
  }

  /**
   * Sets the value of a mat2 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param transpose - Whether to transpose the matrix.
   * @param value - The array of mat2 values to set.
   */
  uniformMatrix2fv(location: string, value: Float32Array) {
    this.uniforms.single[location] = {
      method: 'uniformMatrix2fv',
      value,
    };
  }

  /**
   * Sets the value of a mat2 uniform variable.
   * @param location - The location of the uniform variable.
   * @param value - The array of mat2 values to set.
   */
  uniformMatrix3fv(location: string, value: Float32Array) {
    this.uniforms.single[location] = {
      method: 'uniformMatrix3fv',
      value,
    };
  }

  /**
   * Sets the value of a mat4 uniform variable.
   * @param location - The location of the uniform variable.
   * @param value - The array of mat4 values to set.
   */
  uniformMatrix4fv(location: string, value: Float32Array) {
    this.uniforms.single[location] = {
      method: 'uniformMatrix4fv',
      value,
    };
  }
}
