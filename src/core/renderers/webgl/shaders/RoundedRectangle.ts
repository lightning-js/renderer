import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import { WebGlCoreShader } from '../WebGlCoreShader.js';
import type { WebGlCoreCtxTexture } from '../WebGlCoreCtxTexture.js';
import type { ShaderProgramSources } from '../internal/ShaderUtils.js';
import type { WebGlCoreRenderOp } from '../WebGlCoreRenderOp.js';
import type { Dimensions } from '../../../utils.js';

const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

export interface RoundedRectangleProps {
  radius?: number;
}

export class RoundedRectangle extends WebGlCoreShader<
  'a_position' | 'a_textureCoordinate' | 'a_color',
  [
    { name: 'u_resolution'; uniform: 'uniform2f' },
    { name: 'u_texture'; uniform: 'uniform2f' },
    { name: 'u_dimensions'; uniform: 'uniform2f' },
    { name: 'u_radius'; uniform: 'uniform1f' },
    // { name: 'u_pixelRatio'; uniform: 'uniform1f' },
  ]
> {
  constructor(renderer: WebGlCoreRenderer) {
    const { gl } = renderer;
    super({
      renderer,
      attributes: [
        {
          name: 'a_position',
          size: 2, // 2 components per iteration
          type: gl.FLOAT, // the data is 32bit floats
          normalized: false, // don't normalize the data
          stride, // 0 = move forward size * sizeof(type) each iteration to get the next position
          offset: 0, // start at the beginning of the buffer
        },
        {
          name: 'a_textureCoordinate',
          size: 2,
          type: gl.FLOAT,
          normalized: false,
          stride,
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
        },
        {
          name: 'a_color',
          size: 4,
          type: gl.UNSIGNED_BYTE,
          normalized: true,
          stride,
          offset: 4 * Float32Array.BYTES_PER_ELEMENT,
        },
      ],
      uniforms: [
        { name: 'u_resolution', uniform: 'uniform2f' },
        { name: 'u_texture', uniform: 'uniform2f' },
        { name: 'u_dimensions', uniform: 'uniform2f' },
        { name: 'u_radius', uniform: 'uniform1f' },
        // { name: 'u_pixelRatio', uniform: 'uniform1f' },
      ],
    });
  }

  static z$__type__Props: RoundedRectangleProps;

  static override makeCacheKey(
    props: RoundedRectangleProps,
    dimensions: Dimensions,
  ): string {
    const resolvedProps = RoundedRectangle.resolveDefaults(props);
    return `RoundedRectangle,r:${resolvedProps.radius},w:${dimensions.width},h:${dimensions.height}`;
  }

  static override resolveDefaults(
    props: RoundedRectangleProps,
  ): Required<RoundedRectangleProps> {
    return {
      radius: props.radius || 0,
    };
  }

  override bindTextures(textures: WebGlCoreCtxTexture[]) {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]!.ctxTexture);
  }

  override bindUniforms(renderOp: WebGlCoreRenderOp) {
    super.bindUniforms(renderOp);
    const { width = 100, height = 100 } = renderOp.dimensions;
    this.setUniform('u_dimensions', width, height);
  }

  override bindProps(props: RoundedRectangleProps): void {
    for (const key in props) {
      // @ts-expect-error to fancy code
      this.setUniform(`u_${key}`, props[key]);
    }
  }

  static override shaderSources: ShaderProgramSources = {
    vertex: `
      # ifdef GL_FRAGMENT_PRESICISON_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      attribute vec2 a_position;
      attribute vec2 a_textureCoordinate;
      attribute vec4 a_color;

      uniform vec2 u_resolution;

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;

      void main() {
        vec2 normalized = a_position / u_resolution;
        vec2 zero_two = normalized * 2.0;
        vec2 clip_space = zero_two - 1.0;

        // pass to fragment
        v_color = a_color;
        v_textureCoordinate = a_textureCoordinate;

        // flip y
        gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
      }
    `,
    fragment: `
      # ifdef GL_FRAGMENT_PRESICISON_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      uniform vec2 u_resolution;
      uniform vec2 u_dimensions;
      uniform float u_radius;
      uniform sampler2D u_texture;

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;

      float boxDist(vec2 p, vec2 size, float radius){
        size -= vec2(radius);
        vec2 d = abs(p) - size;
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius;
      }

      float fillMask(float dist) {
        return clamp(-dist, 0.0, 1.0);
      }

      void main() {
        vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
        vec2 halfDimensions = u_dimensions * 0.5;
        float d = boxDist(v_textureCoordinate.xy * u_dimensions - halfDimensions, halfDimensions + 0.5, u_radius);
        gl_FragColor = mix(vec4(0.0), color, fillMask(d));
      }
    `,
  };
}
