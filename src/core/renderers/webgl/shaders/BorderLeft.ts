import { getNormalizedRgbaComponents } from '../../../lib/utils.js';
import type { WebGlContextWrapper } from '../../../lib/WebGlContextWrapper.js';
import type { WebGlRenderOpProps } from '../WebGlCoreRenderOp.js';
import {
  BorderLeftTemplate,
  type BorderLeftProps,
} from '../../../shaders/BorderLeftTemplate.js';
import type { WebGlShaderConfig } from '../WebGlShaderProgram.js';

export const BorderLeft: WebGlShaderConfig<BorderLeftProps> = Object.assign(
  {},
  BorderLeftTemplate,
  {
    update(glw: WebGlContextWrapper, renderOp: WebGlRenderOpProps) {
      const props = renderOp.shaderProps as Required<BorderLeftProps>;
      glw.uniform1f('u_width', props.width);
      glw.uniform4fv('u_color', getNormalizedRgbaComponents(props.color));
    },
    fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform float u_alpha;
    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform float u_width;
    uniform vec4 u_color;

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;

      vec2 pos = vec2(u_width * 0.5, 0.0);
      vec2 p = v_textureCoordinate.xy * u_dimensions - pos;
      vec2 size = vec2(u_width * 0.5, u_dimensions.y);
      float dist = abs(p) - size;
      dist = min(max(dist.x, dist.y), 0.0) + length(max(d, 0.0));

      gl_FragColor = mix(color, u_color, clamp(-dist, 0.0, 1.0)) * u_alpha;
    }
  `,
  },
);
