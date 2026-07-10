import type { Texture } from '../../dist/exports/index.js';
import {
  Rounded,
  type WebGlShaderType,
} from '../../dist/exports/webgl-shaders.js';
import { calcFactoredRadiusArray } from '../../dist/src/core/lib/utils.js';
import type { Vec4 } from '../../dist/src/core/renderers/webgl/internal/ShaderUtils.js';
import { validateArrayLength4 } from '../../dist/src/core/shaders/utils.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import premium from '../assets/premium.png';
import elevator from '../assets/elevator.png';
interface ShaderProps {
  radius: number | number[];
  textureAlpha: number;
  texture: Texture;
}

const WatermarkShader: WebGlShaderType<ShaderProps> = {
  props: {
    radius: {
      default: [0, 0, 0, 0],
      resolve(value) {
        if (value !== undefined) {
          return validateArrayLength4(value);
        }
        return ([] as number[]).concat(this.default);
      },
    },
    textureAlpha: 1,
    texture: null as unknown as Texture,
  },
  beforeDraw(node) {
    this.bindTexture('u_watermark', this.props!.texture);
    this.uniform1f('u_imageHeight', 48);
  },
  update(node) {
    this.uniform4fa(
      'u_radius',
      calcFactoredRadiusArray(this.props!.radius as Vec4, node.w, node.h),
    );
    this.uniform1f('u_textureAlpha', this.props!.textureAlpha);
  },
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

  varying vec4 v_color;
  varying vec2 v_textureCoords;
  varying vec2 v_nodeCoords;

  void main() {
    vec2 normalized = a_position * u_pixelRatio;
    vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);

    v_color = a_color;
    v_nodeCoords = a_nodeCoords;
    v_textureCoords = a_textureCoords;

    gl_Position = vec4(normalized.x * screenSpace.x - 1.0, normalized.y * -abs(screenSpace.y) + 1.0, 0.0, 1.0);
    gl_Position.y = -sign(screenSpace.y) * gl_Position.y;
  }`,
  fragment: `
   # ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  # else
  precision mediump float;
  # endif

    //renderer applies these uniforms automatically
    uniform vec2 u_resolution;
    uniform vec2 u_dimensions;
    uniform float u_alpha;
    uniform float u_pixelRatio;
    uniform sampler2D u_texture;

    //custom uniforms
    uniform vec4 u_radius;
    uniform sampler2D u_watermark;
    uniform float u_textureAlpha;
    uniform float u_imageHeight;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    float sdRoundBox(vec2 coord, vec2 size, vec4 radius) {
      vec2 r = mix(radius.yw, radius.xz, step(coord.x, 0.5));
      r.x = mix(r.y, r.x, step(coord.y, 0.5));

      vec2 d = (abs(coord - 0.5) - 0.5) * size + r.x;
      float p = min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r.x;
      return clamp(-p, 0.0, 1.0);
    }

    vec4 roundedRectangleWithWatermark(vec4 radius, float imageAlpha) {
      float p = sdRoundBox(v_nodeCoords, u_dimensions, radius);
      vec2 scaledResolution = v_nodeCoords * u_dimensions / u_imageHeight;

      vec4 watermarkColor = texture2D(u_watermark, scaledResolution);
      watermarkColor = mix(watermarkColor, vec4(watermarkColor.rgb, 0.0), imageAlpha);

      return mix(texture2D(u_texture, v_textureCoords), watermarkColor, watermarkColor.a) * v_color * p;
    }

    void main() {
      gl_FragColor = roundedRectangleWithWatermark(u_radius, u_textureAlpha);
    }
  `,
};

export default async function ({ renderer, testRoot }: ExampleSettings) {
  renderer.stage.shManager.registerShaderType(
    'WatermarkShader',
    WatermarkShader,
  );
  const watermark = renderer.createTexture('ImageTexture', {
    src: premium,
  });
  watermark.preventCleanup = true;
  watermark.load();

  renderer.createNode({
    autosize: true,
    parent: testRoot,
    src: elevator,
    w: 400,
    h: 400,
    shader: renderer.createShader('WatermarkShader', {
      radius: 20,
      textureAlpha: 0,
      texture: watermark,
    }),
  });

  renderer.createNode({
    autosize: true,
    parent: testRoot,
    x: 400,
    texture: watermark,
  });
}
