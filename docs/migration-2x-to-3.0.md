# Migration Guide: Lightning 3 v2.x to v3.0

This guide helps you migrate from Lightning 3 version 2.x to the new 3.0 release. The 3.0 version introduces several breaking changes to improve performance, API consistency, and developer experience.

## Breaking Changes Overview

1. **New Font Loading API** - Explicit renderer type specification required
2. **Property Deprecation** - `width`/`height` properties deprecated in favor of `w`/`h
3. **Texture Memory Management** - New `doNotExceedCriticalThreshold` behavior
4. **New Shader Type API** - Refactored, optimised shader type api
5. **DynamicShader Deprecation** - had a lot of performance issues, and was overcomplicated to manage

## 1. Font Loading Changes

### What Changed

Lightning 3.0 introduces a new unified font loading API that requires explicit specification of the renderer type (`'canvas'` or `'sdf'`). This change improves type safety and makes font loading more predictable.

### v2.x Font Loading (Deprecated)

```typescript
// v2.x - Implicit font loading
await stage.fontManager.addFontFace({
  fontFamily: 'MyFont',
  fontUrl: '/fonts/my-font.ttf',
});

await stage.fontManager.addSdfFont({
  fontFamily: 'MySdfFont',
  atlasUrl: '/fonts/my-font-atlas.png',
  atlasDataUrl: '/fonts/my-font-data.json',
});
```

### v3.0 Font Loading (New API)

```typescript
// v3.0 - Explicit renderer type specification
await stage.loadFont('canvas', {
  fontFamily: 'MyFont',
  fontUrl: '/fonts/my-font.ttf',
  metrics: {
    // Optional but recommended
    ascender: 800,
    descender: -200,
    lineGap: 0,
    unitsPerEm: 1000,
  },
});

await stage.loadFont('sdf', {
  fontFamily: 'MySdfFont',
  atlasUrl: '/fonts/my-font-atlas.png',
  atlasDataUrl: '/fonts/my-font-data.json',
  metrics: {
    // Optional but recommended
    ascender: 800,
    descender: -200,
    lineGap: 0,
    unitsPerEm: 1000,
  },
});
```

### Migration Steps

1. **Replace `stage.fontManager.addFontFace()`** with `stage.loadFont('canvas', options)`
2. **Replace `stage.fontManager.addSdfFont()`** with `stage.loadFont('sdf', options)`
3. **Add explicit renderer type** as the first parameter
4. **Consider adding font metrics** for better text rendering quality

### Benefits of the New API

- **Type Safety**: Explicit renderer type prevents runtime errors
- **Consistency**: Single method for all font types
- **Better Performance**: Improved text rendering and font metrics handling

## 2. Width/Height Property Changes

### What Changed

The `width` and `height` properties are being deprecated in favor of shorter `w` and `h` properties for better performance and consistency.

### Migration Example

```typescript
// v2.x
const node = renderer.createNode({
  x: 100,
  y: 100,
  width: 200, // ⚠️ No longer available
  height: 150, // ⚠️ No longer available
  color: 0xff0000ff,
});

// v3.0
const node = renderer.createNode({
  x: 100,
  y: 100,
  w: 200, // ✅ Available
  h: 150, // ✅ Available
  color: 0xff0000ff,
});
```

### Texture Loaded Event Changes

The texture loaded event now reports dimensions using `w` and `h` properties:

```typescript
// v2.x - Dimensions with width/height
node.on('loaded', (event) => {
  if (event.type === 'texture') {
    console.log('Texture loaded:', {
      width: event.dimensions.width, // ⚠️ No longer available
      height: event.dimensions.height, // ⚠️ No longer available
    });
  }
});

// v3.0 - Dimensions with w/h
node.on('loaded', (event) => {
  if (event.type === 'texture') {
    console.log('Texture loaded:', {
      w: event.dimensions.w, // ✅ Available
      h: event.dimensions.h, // ✅ Available
    });
  }
});
```

### Migration Steps

1. **Search and replace** `width:` with `w:` in node creation and texture loaded events
2. **Search and replace** `height:` with `h:` in node creation and texture loaded events
3. **Update property access**: `node.width` → `node.w`, `node.height` → `node.h`
4. **Test thoroughly** to ensure no breaking changes

## 3. Texture Memory Management Changes

### What Changed

The `doNotExceedCriticalThreshold` setting now causes texture creation to fail when the memory threshold is exceeded, rather than just logging warnings. If you turn `doNotExceedCriticalThreshold` off you will mimic the behaviour of Lightning 2.

### v2.x Behavior

```typescript
// v2.x - Would log warnings but allow texture creation
const renderer = new RendererMain({
  textureMemory: {
    criticalThreshold: 100 * 1024 * 1024, // 100MB
    doNotExceedCriticalThreshold: true,
  },
});
// Textures would not be created but not return any feedback
```

### v3.0 Behavior

```typescript
// v3.0 - Texture creation fails when threshold exceeded
const renderer = new RendererMain({
  textureMemory: {
    criticalThreshold: 100 * 1024 * 1024, // 100MB
    doNotExceedCriticalThreshold: true, // Now enforced strictly
  },
});
// Textures will fail to load when threshold is exceeded
```

### Migration Steps

1. **Review your memory settings** and adjust `criticalThreshold` if needed
2. **Test with realistic workloads** to ensure thresholds are appropriate
3. **Implement error handling** for texture loading failures
4. **Consider memory optimization** strategies for your application

### Error Handling Example

```typescript
// Handle texture loading failures
node.on('failed', (event) => {
  if (event.type === 'texture') {
    console.error('Texture failed to load:', event.error);
    // Implement fallback strategy
  }
});

// Listen for critical cleanup events
renderer.on('criticalCleanupFailed', (event) => {
  console.warn('Memory threshold exceeded:', event);
  // Implement memory management strategy
});
```

## Additional Changes and Improvements

### Enhanced Font Metrics

Lightning 3.0 provides better font metrics support:

```typescript
// Recommended: Always provide font metrics for optimal rendering
await stage.loadFont('canvas', {
  fontFamily: 'MyFont',
  fontUrl: '/fonts/my-font.ttf',
  metrics: {
    ascender: 800, // Font ascender in font units
    descender: -200, // Font descender in font units
    lineGap: 0, // Additional line spacing
    unitsPerEm: 1000, // Font units per EM
  },
});
```

### Performance Improvements

- Faster property access with `w`/`h` instead of `width`/`height`
- Optimized font loading and rendering pipeline
- Better texture memory management with strict thresholds and failed texture signalling

## Getting Help

- **Documentation**: See [Font Loading Guide](./fontLoading.md) for detailed font API documentation
- **Examples**: Check the `examples/` directory for updated usage patterns
- **Issues**: Report migration issues on the Renderer GitHub repository

## 4. New Shader Type API

### What changed

Lightning 3.0 introduces a new way to create and inclue shader types for (mostly) WebGl and Canvas2d.

### v2.x WebGl Shader

The old way of creating shader had you do a lot of defining the same prop multiple times.

<details>
<summary>WebGl Shader in v2</summary>

```typescript
/**
 * Based on https://www.shadertoy.com/view/lsVSWW
 *
 * @module
 */
import {
  WebGlCoreShader,
  type DimensionsShaderProp,
  type WebGlCoreRenderer,
  type WebGlCoreCtxTexture,
  type ShaderProgramSources,
} from '@lightningjs/renderer';

export interface Point {
  x: number;
  y: number;
}

declare module '@lightningjs/renderer' {
  interface ShaderMap {
    MyCustomShader: typeof MyCustomShader;
  }
}

/**
 * Properties of the {@link CustomShaderProps} shader
 */
export interface CustomShaderProps extends DimensionsShaderProp {
  /**
   * Use normalized values rather than pixle values
   * @default false
   */
  normalized?: boolean;

  /**
   * x & y coordinates of the top left point
   * @default null
   */
  topLeft?: Point | null;

  /**
   * x & y coordinates of the top right point
   * @default null
   */
  topRight?: Point | null;

  /**
   * x & y coordinates of the bottom right point
   * @default null
   */
  bottomRight?: Point | null;

  /**
   * x & y coordinates of the bottom left point
   * @default null
   */
  bottomLeft?: Point | null;
}

export class MyCustomShader extends WebGlCoreShader {
  constructor(renderer: WebGlCoreRenderer) {
    super({
      renderer,
      attributes: ['a_position', 'a_textureCoordinate', 'a_color'],
      uniforms: [
        { name: 'u_resolution', uniform: 'uniform2fv' },
        { name: 'u_pixelRatio', uniform: 'uniform1f' },
        { name: 'u_texture', uniform: 'uniform2f' },
        { name: 'u_dimensions', uniform: 'uniform2fv' },
        { name: 'u_topLeft', uniform: 'uniform2fv' },
        { name: 'u_topRight', uniform: 'uniform2fv' },
        { name: 'u_bottomRight', uniform: 'uniform2fv' },
        { name: 'u_bottomLeft', uniform: 'uniform2fv' },
      ],
    });
  }

  static z$__type__Props: CustomShaderProps;

  static override resolveDefaults(
    props: CustomShaderProps,
  ): Required<CustomShaderProps> {
    return {
      normalized: props.normalized || false,
      topLeft: props.topLeft || null,
      topRight: props.topRight || null,
      bottomRight: props.bottomRight || null,
      bottomLeft: props.bottomLeft || null,
      $dimensions: {
        width: 0,
        height: 0,
      },
    };
  }

  override bindTextures(textures: WebGlCoreCtxTexture[]) {
    const { glw } = this;
    glw.activeTexture(0);
    glw.bindTexture(textures[0]!.ctxTexture);
  }

  protected override bindProps(props: Required<CustomShaderProps>): void {
    const width = props.normalized ? 1 : props.$dimensions.width;
    const height = props.normalized ? 1 : props.$dimensions.height;

    const topLeft = [
      (props.topLeft?.x || 0) / width,
      (props.topLeft?.y || 0) / height,
    ];

    const topRight = [
      (props.topRight?.x || width) / width,
      (props.topRight?.y || 0) / height,
    ];

    const bottomRight = [
      (props.bottomRight?.x || width) / width,
      (props.bottomRight?.y || height) / height,
    ];

    const bottomLeft = [
      (props.bottomLeft?.x || 0) / width,
      (props.bottomLeft?.y || height) / height,
    ];

    this.setUniform('u_topLeft', new Float32Array(topLeft));
    this.setUniform('u_topRight', new Float32Array(topRight));
    this.setUniform('u_bottomRight', new Float32Array(bottomRight));
    this.setUniform('u_bottomLeft', new Float32Array(bottomLeft));
  }

  override canBatchShaderProps(
    propsA: Required<CustomShaderProps>,
    propsB: Required<CustomShaderProps>,
  ): boolean {
    return JSON.stringify(propsA) === JSON.stringify(propsB);
  }

  static override shaderSources: ShaderProgramSources = {
    vertex: `
      # ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      attribute vec2 a_position;
      attribute vec2 a_textureCoordinate;
      attribute vec4 a_color;

      uniform vec2 u_resolution;
      uniform float u_pixelRatio;

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;

      void main() {
        vec2 normalized = a_position * u_pixelRatio / u_resolution;
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
      # ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      uniform sampler2D u_texture;
      uniform vec2 u_topLeft;
      uniform vec2 u_topRight;
      uniform vec2 u_bottomLeft;
      uniform vec2 u_bottomRight;

      varying vec2 v_textureCoordinate;
      varying vec4 v_color;

      float xross(in vec2 a, in vec2 b) {
        return a.x * b.y - a.y * b.x;
      }

      vec2 invBilinear(in vec2 p, in vec2 a, in vec2 b, in vec2 c, in vec2 d ){
        vec2 e = b-a;
        vec2 f = d-a;
        vec2 g = a-b+c-d;
        vec2 h = p-a;

        float k2 = xross(g, f);
        float k1 = xross(e, f) + xross(h, g);
        float k0 = xross(h, e);

        float w = k1*k1 - 4.0*k0*k2;

        if( w<0.0 ) return vec2(-1.0);

        w = sqrt(w);

        // will fail for k0=0, which is only on the ba edge
        float v = 2.0*k0/(-k1 - w);
        if( v<0.0 || v>1.0 ) v = 2.0*k0/(-k1 + w);

        float u = (h.x - f.x*v)/(e.x + g.x*v);
        if( u<0.0 || u>1.0 || v<0.0 || v>1.0 ) return vec2(-1.0);
        return vec2( u, v );
      }

      void main(void){
        vec4 color = vec4(0.0);
        vec2 texUv = invBilinear(v_textureCoordinate, u_topLeft, u_topRight, u_bottomRight, u_bottomLeft);

        if (texUv.x > -0.5) {
          color = texture2D(u_texture, texUv) * v_color;
        }

        gl_FragColor = color;
      }
    `,
  };
}
```

</details>

### v3.0 Shader Type

In v3.0 you can create a Shader Type object to define your shader.

<details>
<summary>WebGl Shader Type in v3</summary>

```typescript
export interface Point {
  x: number;
  y: number;
}

/**
 * Properties of the {@link CustomShaderProps} shader
 */
export interface CustomShaderProps {
  /**
   * Use normalized values rather than pixle values
   * @default false
   */
  normalized?: boolean;

  /**
   * x & y coordinates of the top left point
   * @default null
   */
  topLeft?: Point | null;

  /**
   * x & y coordinates of the top right point
   * @default null
   */
  topRight?: Point | null;

  /**
   * x & y coordinates of the bottom right point
   * @default null
   */
  bottomRight?: Point | null;

  /**
   * x & y coordinates of the bottom left point
   * @default null
   */
  bottomLeft?: Point | null;
}

export const MyCustomShader: WebGlShaderType<CustomShaderProps> = {
  props: {
    normalized: false,
    topLeft: null,
    topRight: null,
    bottomRight: null,
    bottomLeft: null,
  },
  update(node) {
    const props = this.props!;
    const width = props.normalized ? 1 : node.w;
    const height = props.normalized ? 1 : node.h;

    const topLeft = [
      (props.topLeft?.x || 0) / width,
      (props.topLeft?.y || 0) / height,
    ] as [number, number];

    const topRight = [
      (props.topRight?.x || width) / width,
      (props.topRight?.y || 0) / height,
    ] as [number, number];

    const bottomRight = [
      (props.bottomRight?.x || width) / width,
      (props.bottomRight?.y || height) / height,
    ] as [number, number];

    const bottomLeft = [
      (props.bottomLeft?.x || 0) / width,
      (props.bottomLeft?.y || height) / height,
    ] as [number, number];

    this.uniform2fa('u_topLeft', topLeft);
    this.uniform2fa('u_topRight', topRight);
    this.uniform2fa('u_bottomRight', bottomRight);
    this.uniform2fa('u_bottomLeft', bottomLeft);
  },
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform sampler2D u_texture;
    uniform vec2 u_topLeft;
    uniform vec2 u_topRight;
    uniform vec2 u_bottomLeft;
    uniform vec2 u_bottomRight;

    varying vec2 v_textureCoords;
    varying vec4 v_color;

    float xross(in vec2 a, in vec2 b) {
      return a.x * b.y - a.y * b.x;
    }

    vec2 invBilinear(in vec2 p, in vec2 a, in vec2 b, in vec2 c, in vec2 d ){
      vec2 e = b-a;
      vec2 f = d-a;
      vec2 g = a-b+c-d;
      vec2 h = p-a;

      float k2 = xross(g, f);
      float k1 = xross(e, f) + xross(h, g);
      float k0 = xross(h, e);

      float w = k1*k1 - 4.0*k0*k2;

      if( w<0.0 ) return vec2(-1.0);

      w = sqrt(w);

      // will fail for k0=0, which is only on the ba edge
      float v = 2.0*k0/(-k1 - w);
      if( v<0.0 || v>1.0 ) v = 2.0*k0/(-k1 + w);

      float u = (h.x - f.x*v)/(e.x + g.x*v);
      if( u<0.0 || u>1.0 || v<0.0 || v>1.0 ) return vec2(-1.0);
      return vec2( u, v );
    }

    void main(void){
      vec4 color = vec4(0.0);
      vec2 texUv = invBilinear(v_textureCoords, u_topLeft, u_topRight, u_bottomRight, u_bottomLeft);

      if (texUv.x > -0.5) {
        color = texture2D(u_texture, texUv) * v_color;
      }

      gl_FragColor = color;
    }
  `,
};
```

</details>

### "Shaders" for Canvas

Lightning 3.0 also supports shader types for Canvas

### Shader Type Documentaion

We have the following documentation available for the new Shader Types here;

- **[Shader Type basics](./custom-shader-types.md)**
- **[WebGl Shader Types](./webgl-shader-types.md)**
- **[Canvas Shader Types](./canvas-shader-types.md)**

## 5. DynamicShader Deprecation

The DynamicShader has been deprecated. It had a lot of performance issues, and the generated shader code had a lot of code overhead even for the most simple shader effects.

The most used shader effects have been ported to single shader types for you to use.

### DynamicShader to Shader Types Conversion

Here are some examples on changing common used effects to new Shader Types.

(Make sure these Shader Types are registered)

### Rounded(radius)

Rounded corners on Node:

```ts
const v2 = renderer.createNode({
  x: 200,
  y: 100,
  width: 250,
  height: 500,
  shader: renderer.createShader('DynamicShader', {
    effects: [
      {
        type: 'radius',
        props: {
          radius: 50,
        },
      },
    ],
  }),
});

//to

const v3 = renderer.createNode({
  x: 200,
  y: 100,
  width: 250,
  height: 500,
  shader: renderer.createShader('Rounded', {
    radius: 50,
  }),
});
```

### Border

Border on node:

```ts
const v2 = renderer.createNode({
  x: 200,
  y: 100,
  width: 250,
  height: 500,
  shader: renderer.createShader('DynamicShader', {
    effects: [
      {
        type: 'border',
        props: {
          width: 30,
          color: 0xffffffff,
        },
      },
    ],
  }),
});

//to

const v3 = renderer.createNode({
  x: 200,
  y: 100,
  width: 250,
  height: 500,
  shader: renderer.createShader('Border', {
    width: 30,
    color: 0xffffffff,
  }),
});
```

Border with different widths on same node:

```ts
const v2 = renderer.createNode({
  x: 200,
  y: 100,
  width: 250,
  height: 500,
  shader: renderer.createShader('DynamicShader', {
    effects: [
      {
        type: 'borderTop',
        props: {
          width: 30,
          color: 0xff0000ff,
        },
      },
      {
        type: 'borderBottom',
        props: {
          width: 10,
          color: 0xff0000ff,
        },
      },
    ],
  }),
});

//to

const v3 = renderer.createNode({
  x: 200,
  y: 100,
  width: 250,
  height: 500,
  shader: renderer.createShader('Border', {
    top: 30,
    bottom: 10,
    color: 0xffffffff,
  }),
});
```

### Gradients

```ts
const v2 = renderer.createNode({
  x: 200,
  y: 100,
  width: 250,
  height: 500,
  shader: renderer.createShader('DynamicShader', {
    effects: [
      {
        type: 'linearGradient',
        props: {
          angle: degToRad(180),
          stops: [0.4, 0.8],
          colors: [0x0000ffff, 0x00000000],
        },
      },
    ],
  }),
});

//to

const v3 = renderer.createNode({
  x: 200,
  y: 100,
  width: 250,
  height: 500,
  shader: renderer.createShader('LinearGradient', {
    angle: degToRad(180),
    stops: [0.4, 0.8],
    colors: [0x0000ffff, 0x00000000],
  }),
});
```

For RadialGradient it works similar with the extra props that it has!

Important to note is that Gradients can't overlap out of the box anymore, you will have to make several nodes in order to do so.

### Combining Shader Types

Following are a few examples of combining shader types, and adjust fragment source accordingly, start by getting the [source](https://github.com/lightning-js/renderer/blob/main/src/core/shaders/webgl/Rounded.ts) of the Rounded shader from the Renderer repository.

You will use this as a base to add the `linearGradient` effect onto. ([source](https://github.com/lightning-js/renderer/blob/main/src/core/shaders/webgl/LinearGradient.ts))

For this example we used a fixed amount of color stops to make the example a more readable.

Now that you have the base code for our shader you can start adding the `linearGradient` related uniforms and functions.

```glsl
//...default rounded uniforms, varyings, functions

//add linearGradient uniforms
//angle in degrees
uniform float u_angle;
uniform float u_stops[3];
uniform vec4 u_colors[3];

vec2 calcPoint(float d, float angle) {
  return d * vec2(cos(angle), sin(angle)) + (u_dimensions * 0.5);
}

vec4 linearGradientColor(vec4 colors[3], float stops[3], float angle) {
  //line the gradient follows
  float lineDist = abs(u_dimensions.x * cos(angle)) + abs(u_dimensions.y * sin(angle));
  vec2 f = calcPoint(lineDist * 0.5, angle);
  vec2 t = calcPoint(lineDist * 0.5, a + PI);
  vec2 gradVec = t - f;
  float dist = dot(v_textureCoords.xy * u_dimensions - f, gradVec) / dot(gradVec, gradVec);

  float stopCalc = (dist - stops[0]) / (stops[1] - stops[0]);
  vec4 colorOut = mix(colors[0], colors[1], stopCalc);
  colorOut = mix(colorOut, colors[2], clamp((dist - stops[1]) / (stops[2] - stops[1]), 0.0, 1.0));
  return colorOut;
}

//...main function
```

Now that we've added this, we can start using the `linearGradientColor` in the main function of the fragment shader. We'll focus on this part:

```glsl
vec4 resColor = vec4(0.0);
resColor = mix(resColor, color, roundedAlpha);
gl_FragColor = resColor * u_alpha;
```

What you want to alter is the color value. This contains the color of a Node, or the color of a texture. You want to overlay the gradient color on top of this value:

```glsl
vec4 gradient = linearGradient(u_colors, u_stops, u_angle);
color = mix(color, gradient, clamp(gradient.a, 0.0, 1.0));
vec4 resColor = vec4(0.0);
resColor = mix(resColor, color, roundedAlpha);
gl_FragColor = resColor * u_alpha;
```

Now you have a shader with a LinearGradient overlay on top of a texture or default color, and rounded corners.

### Borders + Linear Gradient

Want a border to have a gradient effect? You can use the same principle we used earlier with the rounded version. Checkout the Border [source](https://github.com/lightning-js/renderer/blob/main/src/core/shaders/webgl/Border.ts) and add the LinearGradient stuff you added to the Rounded shader. Once you've added this you can alter the border color from:

```glsl
vec4 resColor = mix(u_borderColor, color, innerAlpha);
gl_FragColor = resColor * u_alpha;
```

to

```glsl
vec4 gradient = linearGradient(u_colors, u_stops, u_angle);
vec4 bColor = mix(u_borderColor, gradient, clamp(gradient.a, 0.0, 1.0));
vec4 resColor = mix(bColor, color, innerAlpha);
gl_FragColor = resColor * u_alpha;
```
