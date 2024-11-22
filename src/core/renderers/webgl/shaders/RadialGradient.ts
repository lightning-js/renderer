import { getNormalizedRgbaComponents } from '../../../lib/utils.js';
import type { WebGlContextWrapper } from '../../../lib/WebGlContextWrapper.js';
import {
  RadialGradientTemplate,
  type RadialGradientProps,
} from '../../../shaders/RadialGradientTemplate.js';
import { genGradientColors } from '../internal/ShaderUtils.js';
import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import type { WebGlRenderOpProps } from '../WebGlCoreRenderOp.js';
import type { WebGlShaderConfig } from '../WebGlShaderProgram.js';

export const RadialGradient: WebGlShaderConfig<RadialGradientProps> =
  Object.assign({}, RadialGradientTemplate, {
    update(glw: WebGlContextWrapper, renderOp: WebGlRenderOpProps) {
      const props = renderOp.shaderProps as Required<RadialGradientProps>;

      glw.uniform2f(
        'u_projection',
        props.pivot[0]! * renderOp.dimensions.width,
        props.pivot[1]! * renderOp.dimensions.height,
      );
      glw.uniform2f('u_size', props.width * 0.5, props.height * 0.5);
      glw.uniform1fv('u_stops', new Float32Array(props.stops));
      const colors: number[] = [];
      for (let i = 0; i < props.colors.length; i++) {
        const norm = getNormalizedRgbaComponents(props.colors[i]!);
        colors.push(norm[0], norm[1], norm[2], norm[3]);
      }
      glw.uniform4fv('u_colors', new Float32Array(colors));
    },
    getCacheMarkers(props: RadialGradientProps) {
      return `colors:${props.colors.length}`;
    },
    fragment(renderer: WebGlCoreRenderer, props: RadialGradientProps) {
      return `
      # ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      #define PI 3.14159265359

      uniform float u_alpha;
      uniform vec2 u_dimensions;

      uniform sampler2D u_texture;

      uniform vec2 u_projection;
      uniform vec2 u_size;
      uniform float u_stops[${props.stops.length}];
      uniform vec4 u_colors[${props.colors.length}];

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;

      vec2 calcPoint(float d, float angle) {
        return d * vec2(cos(angle), sin(angle)) + (u_dimensions * 0.5);
      }

      void main() {
        vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
        vec2 point = v_textureCoordinate.xy * u_dimensions;
        float dist = length((point - u_projection) / u_size);
        ${genGradientColors(props.stops.length)}
        gl_FragColor = mix(color, colorOut, clamp(colorOut.a, 0.0, 1.0));
      }
    `;
    },
  });
