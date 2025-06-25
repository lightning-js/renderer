import type { WebGlShaderType } from '../../dist/exports/webgl-shaders.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  renderer.stage.shManager.registerShaderType('Spinner', Spinner);

  renderer.createNode({
    x: 90,
    y: 90,
    width: 90,
    height: 90,
    color: 0xff0000ff,
    shader: renderer.createShader('Spinner'),
    parent: testRoot,
  });

  renderer.createNode({
    x: 290,
    y: 90,
    width: 90,
    height: 90,
    color: 0xff0000ff,
    shader: renderer.createShader('Spinner', {
      clockwise: false,
    }),
    parent: testRoot,
  });

  renderer.createNode({
    x: 490,
    y: 90,
    width: 90,
    height: 90,
    color: 0xff0000ff,
    shader: renderer.createShader('Spinner', {
      period: 0.4,
    }),
    parent: testRoot,
  });
}

export const Spinner: WebGlShaderType = {
  props: {
    clockwise: true,
    period: 1,
  },
  update() {
    this.uniform1f('u_clockwise', this.props!.clockwise === true ? 1 : -1);
    this.uniform1f('u_period', this.props!.period as number);
  },
  time: true,
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    attribute vec2 a_position;
    attribute vec2 a_textureCoords;
    attribute vec4 a_color;
    attribute vec2 a_nodeCoords;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform vec2 u_dimensions;
    uniform float u_time;

    uniform float u_period;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    varying vec2 v_innerSize;
    varying vec2 v_halfDimensions;
    varying float v_time;

    void main() {
      vec2 normalized = a_position * u_pixelRatio;
      vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);

      v_color = a_color;
      v_nodeCoords = a_nodeCoords;
      v_textureCoords = a_textureCoords;

      v_halfDimensions = u_dimensions * 0.5;

      v_time = u_time / 1000.0 / u_period;

      gl_Position = vec4(normalized.x * screenSpace.x - 1.0, normalized.y * -abs(screenSpace.y) + 1.0, 0.0, 1.0);
      gl_Position.y = -sign(screenSpace.y) * gl_Position.y;
    }
  `,
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    #define PI 3.14159265359

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform float u_alpha;
    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform float u_clockwise;

    varying vec4 v_color;
    varying vec2 v_nodeCoords;
    varying vec2 v_textureCoords;

    varying vec2 v_halfDimensions;
    varying float v_time;

    float circleDist(vec2 p, float radius){
      return length(p) - radius;
    }

    float fillMask(float dist){
      return clamp(-dist, 0.0, 1.0);
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 uv = v_nodeCoords.xy * u_dimensions - v_halfDimensions;

      float c = max(-circleDist(uv, v_halfDimensions.x - 10.0), circleDist(uv, v_halfDimensions.x));
      float r = -v_time * 6.0 * u_clockwise;

      uv *= mat2(cos(r), sin(r), -sin(r), cos(r));

      float a = u_clockwise * atan(uv.x, uv.y) * PI * 0.05 + 0.45;

      gl_FragColor = mix(vec4(0.0), color, fillMask(c) * a);
    }
  `,
};
