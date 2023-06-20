import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import { WebGlCoreShader } from '../WebGlCoreShader.js';
import type { WebGlCoreCtxTexture } from '../WebGlCoreCtxTexture.js';
import type { ShaderProgramSources } from '../internal/ShaderUtils.js';
// import type { Texture } from '../textures/Texture';

const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

export class DefaultShaderBatched extends WebGlCoreShader<
  'a_position' | 'a_textureCoordinate' | 'a_color' | 'a_textureIndex',
  [
    { name: 'u_resolution'; uniform: 'uniform2f' },
    { name: 'u_pixelRatio'; uniform: 'uniform1f' },
    { name: 'u_textures[0]'; uniform: 'uniform1iv' },
  ]
> {
  override supportsIndexedTextures = true;

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
        {
          name: 'a_textureIndex',
          size: 1,
          type: gl.FLOAT,
          normalized: false,
          stride,
          offset: 5 * Float32Array.BYTES_PER_ELEMENT,
        },
      ],
      uniforms: [
        { name: 'u_resolution', uniform: 'uniform2f' },
        { name: 'u_pixelRatio', uniform: 'uniform1f' },
        { name: 'u_textures[0]', uniform: 'uniform1iv' },
      ],
    });
  }

  bindTextures(texture: WebGlCoreCtxTexture[]) {
    const { renderer, gl } = this;
    if (
      texture.length > renderer.system.parameters.MAX_VERTEX_TEXTURE_IMAGE_UNITS
    ) {
      throw new Error(
        `DefaultShaderBatched: Cannot bind more than ${renderer.system.parameters.MAX_VERTEX_TEXTURE_IMAGE_UNITS} textures`,
      );
    }
    texture.forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t.ctxTexture);
    });

    const samplers = Array.from(Array(texture.length).keys());
    this.setUniform('u_textures[0]', samplers);
  }

  // unbindTexture() {
  //   const { gl } = this;
  //   gl.bindTexture(gl.TEXTURE_2D, null);
  // }

  static override shaderSources: ShaderProgramSources = {
    vertex: `
      # ifdef GL_FRAGMENT_PRESICISON_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      attribute vec2 a_textureCoordinate;
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute float a_textureIndex;

      uniform vec2 u_resolution;
      uniform float u_pixelRatio;

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;
      varying float v_textureIndex;

      void main(){
        vec2 normalized = a_position * u_pixelRatio / u_resolution;
        vec2 zero_two = normalized * 2.0;
        vec2 clip_space = zero_two - 1.0;

        // pass to fragment
        v_color = a_color;
        v_textureCoordinate = a_textureCoordinate;
        v_textureIndex = a_textureIndex;

        // flip y
        gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
      }
    `,
    fragment: (textureUnits) => `
      #define txUnits ${textureUnits}
      # ifdef GL_FRAGMENT_PRESICISON_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      uniform vec2 u_resolution;
      uniform sampler2D u_image;
      uniform sampler2D u_textures[txUnits];

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;
      varying float v_textureIndex;

      vec4 sampleFromTexture(sampler2D textures[${textureUnits}], int idx, vec2 uv) {
        ${Array.from(Array(textureUnits).keys())
          .map(
            (idx) => `
          ${idx !== 0 ? 'else ' : ''}if (idx == ${idx}) {
            return texture2D(textures[${idx}], uv);
          }
        `,
          )
          .join('')}
        return texture2D(textures[0], uv);
      }

      void main(){
        gl_FragColor = vec4(v_color) * sampleFromTexture(u_textures, int(v_textureIndex), v_textureCoordinate);
      }
    `,
  };
}
