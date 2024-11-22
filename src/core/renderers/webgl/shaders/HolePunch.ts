import {
  calcFactoredRadius,
  calcFactoredRadiusArray,
} from '../../../lib/utils.js';
import type { WebGlContextWrapper } from '../../../lib/WebGlContextWrapper.js';
import {
  HolePunchTemplate,
  type HolePunchProps,
} from '../../../shaders/HolePunchTemplate.js';
import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import type { WebGlRenderOpProps } from '../WebGlCoreRenderOp.js';
import type { WebGlShaderConfig } from '../WebGlShaderProgram.js';

export const HolePunch: WebGlShaderConfig<HolePunchProps> = Object.assign(
  {},
  HolePunchTemplate,
  {
    update(glw: WebGlContextWrapper, renderOp: WebGlRenderOpProps) {
      const props = renderOp.shaderProps as Required<HolePunchProps>;

      glw.uniform2f('u_pos', props.x, props.y);
      //precalculate to halfSize once instead of for every pixel
      glw.uniform2f('u_size', props.width * 0.5, props.height * 0.5);

      if (!Array.isArray(props.radius)) {
        glw.uniform1f(
          'u_radius',
          calcFactoredRadius(props.radius, props.width, props.height),
        );
      } else {
        const fRadius = calcFactoredRadiusArray(
          props.radius,
          props.width,
          props.height,
        );
        glw.uniform4f(
          'u_radius',
          fRadius[0],
          fRadius[1],
          fRadius[2],
          fRadius[3],
        );
      }
    },
    getCacheMarkers(props: HolePunchProps) {
      return `radiusArray:${Array.isArray(props.radius)}`;
    },
    fragment(renderer: WebGlCoreRenderer, props: HolePunchProps) {
      return `
      # ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      uniform float u_alpha;
      uniform vec2 u_dimensions;
      uniform sampler2D u_texture;

      uniform vec2 u_size;
      uniform vec2 u_pos;

      uniform ${Array.isArray(props.radius) ? 'vec4' : 'float'} u_radius;

      uniform vec4 u_color;
      varying vec4 v_color;
      varying vec2 v_textureCoordinate;

      void main() {
        vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
        vec2 basePos = v_textureCoordinate.xy * u_dimensions.xy - u_pos;
        vec2 pos = basePos - u_size;
        ${
          Array.isArray(props.radius)
            ? `
            float radius = u_radius[0] * step(pos.x, 0.5) * step(pos.y, 0.5);
            radius = radius + u_radius[1] * step(0.5, pos.x) * step(pos.y, 0.5);
            radius = radius + u_radius[2] * step(0.5, pos.x) * step(0.5, pos.y);
            radius = radius + u_radius[3] * step(pos.x, 0.5) * step(0.5, pos.y);
          `
            : `
            float radius = u_radius;
          `
        }

        vec2 size = u_size - vec2(radius);
        pos = abs(pos) - size;
        float dist = min(max(pos.x, pos.y), 0.0) + length(max(pos, 0.0)) - radius;
        gl_FragColor = mix(color, vec4(0.0), clamp(-dist, 0.0, 1.0));
      }
    `;
    },
  },
);
