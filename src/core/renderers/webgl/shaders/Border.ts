import { getNormalizedRgbaComponents } from '../../../lib/utils.js';
import type { WebGlContextWrapper } from '../../../lib/WebGlContextWrapper.js';
import {
  BorderTemplate,
  type BorderProps,
} from '../../../shaders/BorderTemplate.js';
import type { WebGlRenderOpProps } from '../WebGlCoreRenderOp.js';
import type { WebGlShaderConfig } from '../WebGlShaderProgram.js';

export const Border: WebGlShaderConfig<BorderProps> = Object.assign(
  {},
  BorderTemplate,
  {
    update(glw: WebGlContextWrapper, renderOp: WebGlRenderOpProps) {
      const props = renderOp.shaderProps as Required<BorderProps>;
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

      vec2 pos = v_textureCoordinate.xy * u_dimensions - u_dimensions * 0.5;
      vec2 dist = abs(pos) - (u_dimensions) * 0.5;
      dist = min(max(dist.x, dist.y), 0.0) + length(max(dist, 0.0)) + 1.0;
      dist = clamp(dist + u_width, 0.0, 1.0) - clamp(dist, 0.0, 1.0);
      gl_FragColor = mix(color, mix(color, u_color, u_color.a), dist) * u_alpha;
    }
  `,
  },
);
