import { getNormalizedRgbaComponents } from '../../../lib/utils.js';
import type { WebGlContextWrapper } from '../../../lib/WebGlContextWrapper.js';
import {
  LinearGradientTemplate,
  type LinearGradientProps,
} from '../../../shaders/LinearGradientTemplate.js';
import { genGradientColors } from '../internal/ShaderUtils.js';
import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import type { WebGlRenderOpProps } from '../WebGlCoreRenderOp.js';
import type { WebGlShaderConfig } from '../WebGlShaderProgram.js';

export const LinearGradient: WebGlShaderConfig<LinearGradientProps> =
  Object.assign({}, LinearGradientTemplate, {
    update(glw: WebGlContextWrapper, renderOp: WebGlRenderOpProps) {
      const props = renderOp.shaderProps as Required<LinearGradientProps>;
      glw.uniform1f('u_angle', props.angle - (Math.PI / 180) * 90);
      glw.uniform1fv('u_stops', new Float32Array(props.stops));
      const colors: number[] = [];
      for (let i = 0; i < props.colors.length; i++) {
        const norm = getNormalizedRgbaComponents(props.colors[i]!);
        colors.push(norm[0], norm[1], norm[2], norm[3]);
      }
      glw.uniform4fv('u_colors', new Float32Array(colors));
    },
    getCacheMarkers(props: LinearGradientProps) {
      return `colors:${props.colors.length}`;
    },
    fragment(renderer: WebGlCoreRenderer, props: LinearGradientProps) {
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

      uniform float u_angle;
      uniform float u_stops[${props.stops.length}];
      uniform vec4 u_colors[${props.colors.length}];

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;

      vec2 calcPoint(float d, float angle) {
        return d * vec2(cos(angle), sin(angle)) + (u_dimensions * 0.5);
      }

      void main() {
        vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
        float a = u_angle;
        float lineDist = abs(u_dimensions.x * cos(a)) + abs(u_dimensions.y * sin(a));
        vec2 f = calcPoint(lineDist * 0.5, a);
        vec2 t = calcPoint(lineDist * 0.5, a + PI);
        vec2 gradVec = t - f;
        float dist = dot(v_textureCoordinate.xy * u_dimensions - f, gradVec) / dot(gradVec, gradVec);
        ${genGradientColors(props.stops.length)}
        gl_FragColor = mix(color, colorOut, clamp(colorOut.a, 0.0, 1.0));
      }
    `;
    },
  });
