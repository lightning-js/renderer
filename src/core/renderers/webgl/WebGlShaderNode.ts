import type { CoreNode } from '../../CoreNode.js';
import type { Stage } from '../../Stage.js';
import { CoreShaderNode } from '../CoreShaderNode.js';
import type { Uniform, UniformCollection } from './internal/ShaderUtils.js';
import type {
  WebGlShaderConfig,
  WebGlShaderProgram,
} from './WebGlShaderProgram.js';

export class WebGlShaderNode<
  Props = Record<string, unknown>,
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
    config: WebGlShaderConfig<Props>,
    program: WebGlShaderProgram,
    stage: Stage,
    props?: Props,
  ) {
    super(config, program, stage, props);
    if (config.update !== undefined) {
      this.updater = config.update;

      this.update = () => {
        if (this.props === undefined) {
          this.updater!(this.node as CoreNode);
          return;
        }
        this.valueKey = '';
        for (const key in this.props) {
          this.valueKey += `${key}:${this.props[key]!};`;
        }
        const values = this.stage.shManager.getShaderValues(this.valueKey);
        if (values !== undefined) {
          this.uniforms = values as UniformCollection;
          return;
        }
        this.updater!(this.node as CoreNode);
        this.stage.shManager.setShaderValues(this.valueKey, this.uniforms);
      };
    }
  }

  /**
   * Sets the value of a single float uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The value to set.
   */
  uniform1f(location: string, value: number) {
    this.uniforms.single[location] = {
      method: 'uniform1',
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
