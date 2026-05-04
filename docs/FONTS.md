# Font Loading and Installation

Lightning 3 Renderer supports two types of fonts for rendering text: Canvas-based web fonts and SDF (Signed Distance Field) fonts. This guide covers how to load, install, and use both font types.

## Overview

The Renderer's Stage exposes a Font Manager that handles font installation and management. You can install fonts at application startup to ensure they're ready when needed.

### Font Types Supported

| Font Type            | Renderer           | Benefits                                                                        | Use Case                                       |
| -------------------- | ------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Canvas Web Fonts** | WebGL ✅ Canvas ✅ | Universal web font format support (.ttf, .woff, .woff2, etc.)                   | General text rendering, standard typography    |
| **SDF Fonts**        | WebGL ✅ Canvas ❌ | Better performance for scaled text, supports visual effects, crisp at any scale | Advanced typography, effects, large-scale text |

**Note**: The Canvas renderer only supports Canvas web fonts. The WebGL renderer supports both types.

## Canvas Web Fonts

Canvas web fonts use standard web font formats and provide universal compatibility with any font you can use on the web.

### Loading Canvas Fonts

```ts
import { RendererMain } from '@lightningjs/renderer';
import { WebGlCoreRenderer } from '@lightningjs/renderer/webgl';
import { CanvasTextRenderer } from '@lightningjs/renderer/canvas';

const renderer = new RendererMain(
  {
    appWidth: 1920,
    appHeight: 1080,
    renderEngine: WebGlCoreRenderer,
    fontEngines: [CanvasTextRenderer], // Enable Canvas font rendering
    // ...Other Renderer Config
  },
  'app',
);

// Load a Canvas web font at startup
const stage = renderer.stage;
await stage.loadFont('canvas', {
  fontFamily: 'MyFont',
  fontUrl: '/fonts/my-font.ttf',
});
```

### Canvas Font Options

```ts
await stage.loadFont('canvas', {
  // Required
  fontFamily: string;        // Name for the font (used in text rendering)
  fontUrl: string;           // URL to the font file (.ttf, .woff, .woff2, etc.)

  // Optional
  metrics?: {
    ascender: number;        // Height above baseline (in font units)
    descender: number;       // Depth below baseline (in font units)
    lineGap: number;         // Gap between lines (in font units)
    unitsPerEm: number;      // Font's units per em (typically 1000 or 2048)
  };
});
```

### Canvas Font Example

```ts
// Load a standard web font
await stage.loadFont('canvas', {
  fontFamily: 'RobotoRegular',
  fontUrl: '/fonts/Roboto-Regular.ttf',
});

// Load with custom metrics for precise layout
await stage.loadFont('canvas', {
  fontFamily: 'RobotoWithMetrics',
  fontUrl: '/fonts/Roboto-Regular.ttf',
  metrics: {
    ascender: 800,
    descender: -200,
    lineGap: 0,
    unitsPerEm: 1000,
  },
});

// Use the loaded font in your scene
const text = new TextNode(stage, {
  fontFamily: 'RobotoRegular',
  text: 'Hello, World!',
  fontSize: 24,
});
```

### Supported Font Formats

- `.ttf` – TrueType Font (most compatible)
- `.woff` – Web Open Font Format (compressed)
- `.woff2` – Web Open Font Format 2 (best compression)
- `.otf` – OpenType Font
- `.eot` – Embedded OpenType (legacy)

## SDF Fonts

SDF (Signed Distance Field) fonts offer superior performance for scaled text and support advanced visual effects. They require pre-generated atlas files but deliver excellent quality at any scale.

### Why Use SDF?

- **Better Performance**: Optimized for WebGL rendering
- **Scalability**: Crisp rendering at any text size without re-rasterizing
- **Effects Support**: Supports outlines, shadows, and other effects
- **Consistent Sizing**: No font rendering inconsistencies across browsers

### Loading SDF Fonts

```ts
import { RendererMain } from '@lightningjs/renderer';
import {
  WebGlCoreRenderer,
  SdfTextRenderer,
} from '@lightningjs/renderer/webgl';

const renderer = new RendererMain(
  {
    appWidth: 1920,
    appHeight: 1080,
    renderEngine: WebGlCoreRenderer,
    fontEngines: [SdfTextRenderer], // Enable SDF font rendering
    // ...Other Renderer Config
  },
  'app',
);

// Load an SDF font at startup
const stage = renderer.stage;
await stage.loadFont('sdf', {
  fontFamily: 'MySdfFont',
  atlasUrl: '/fonts/my-font-atlas.png',
  atlasDataUrl: '/fonts/my-font-data.json',
});
```

### SDF Font Options

```ts
await stage.loadFont('sdf', {
  // Required
  fontFamily: string;        // Name for the font (used in text rendering)
  atlasUrl: string;          // URL to the SDF atlas image (.png)
  atlasDataUrl: string;      // URL to the SDF glyph data (.json)

  // Optional
  metrics?: {
    ascender: number;        // Height above baseline
    descender: number;       // Depth below baseline
    lineGap: number;         // Gap between lines
    unitsPerEm: number;      // Font's units per em
  };
});
```

### SDF Font Example

```ts
// Load an SDF font
await stage.loadFont('sdf', {
  fontFamily: 'RobotoSDF',
  atlasUrl: '/fonts/roboto-sdf-atlas.png',
  atlasDataUrl: '/fonts/roboto-sdf-data.json',
});

// Use the loaded SDF font
const text = new TextNode(stage, {
  fontFamily: 'RobotoSDF',
  text: 'Hello with effects!',
  fontSize: 32,
  effects: [
    {
      type: 'outline',
      width: 2,
      color: 0xff0000ff,
    },
  ],
});
```

### Generating SDF Atlases

To generate SDF atlas files from a TrueType font, use tools like:

- **Hiero** – BMFont tool (Windows/Mac/Linux)
- **msdfgen** – Multi-channel SDF generator (command-line)
- **FontForge** – Font editor with SDF export

Example using `msdfgen`:

```bash
# Generate MSDF (multi-channel signed distance field)
msdfgen -font myfont.ttf -charset charset.txt -size 32 -o atlas.png -json data.json
```

## Font Installation at Startup

It's recommended to load and install fonts at application startup before rendering:

```ts
import { RendererMain } from '@lightningjs/renderer';
import {
  WebGlCoreRenderer,
  SdfTextRenderer,
} from '@lightningjs/renderer/webgl';
import { CanvasTextRenderer } from '@lightningjs/renderer/canvas';

async function initializeApp() {
  const renderer = new RendererMain(
    {
      appWidth: 1920,
      appHeight: 1080,
      renderEngine: WebGlCoreRenderer,
      fontEngines: [SdfTextRenderer, CanvasTextRenderer],
      // ...Other Renderer Config
    },
    'app', // id of div to insert Canvas
  );

  const stage = renderer.stage;

  // Load all fonts before rendering
  await Promise.all([
    // Canvas web fonts
    stage.loadFont('canvas', {
      fontFamily: 'OpenSans',
      fontUrl: '/fonts/OpenSans-Regular.ttf',
    }),
    stage.loadFont('canvas', {
      fontFamily: 'OpenSansBold',
      fontUrl: '/fonts/OpenSans-Bold.ttf',
    }),

    // SDF fonts for high-quality text
    stage.loadFont('sdf', {
      fontFamily: 'RobotoSDF',
      atlasUrl: '/fonts/roboto-atlas.png',
      atlasDataUrl: '/fonts/roboto-atlas.json',
    }),
  ]);

  // Fonts loaded; ready for rendering
  console.log('Fonts ready!');

  // Create your scene here
  // ...
}

initializeApp().catch(console.error);
```

## Font Metrics

Custom font metrics allow you to fine-tune text layout and sizing for specific fonts that may have non-standard metrics.

### Default Metrics

If you don't specify metrics, the Renderer uses default values based on the font format. Most fonts work well with defaults.

### Custom Metrics Example

```ts
// Load font with custom metrics for precise control
await renderer.stage.loadFont('canvas', {
  fontFamily: 'CustomFont',
  fontUrl: '/fonts/custom.ttf',
  metrics: {
    ascender: 900, // Height above baseline
    descender: -225, // Depth below baseline
    lineGap: 100, // Space between lines
    unitsPerEm: 1024, // Font's coordinate system units
  },
});
```

### Measuring Fonts

To determine correct metrics:

1. Use your font editor (FontForge, etc.) to check design metrics
2. Check the font's OpenType specification
3. Test rendering and adjust experimentally
4. Use browser DevTools to measure rendered text

## Performance Considerations

### Canvas Fonts Performance

- **Pros**: Universal format support, no pre-processing required
- **Cons**: Slower at large scales, potential inconsistencies across browsers
- **Best for**: Variable text, standard typography

### SDF Fonts Performance

- **Pros**: Optimized rendering, consistent quality, supports effects
- **Cons**: Requires pre-generated atlas files, larger file size
- **Best for**: App titles, large text, text with effects

### Optimization Tips

1. **Load fonts early**: Install all fonts before rendering starts
2. **Use appropriate font type**:
   - Canvas fonts for dynamic, varying text
   - SDF fonts for large-scale, effects-heavy text
3. **Limit font variety**: Fewer unique fonts = better performance
4. **Compress font files**: Use .woff2 format for smaller downloads
5. **Cache fonts**: Browser will cache font files; leverage this

## Troubleshooting

### Font Not Loading

```
Error: Font failed to load at URL
```

**Solutions:**

- Verify font file URL is correct and accessible
- Check browser console for CORS issues
- Ensure font format is supported
- Try a different font format (.ttf instead of .woff2)

### Text Rendering Issues

```
Text appears blurry or pixelated
```

**Solutions:**

- For Canvas fonts: Use SDF fonts for better quality at large scales
- Check font size and device pixel ratio
- Verify metrics are correct for your font

### SDF Font Problems

```
SDF atlas or data file not found
```

**Solutions:**

- Verify atlas and data file URLs are correct
- Ensure both PNG and JSON files are present
- Check that files are synchronized (generated from same font)

### Performance Issues

```
Rendering is slow, especially with many text nodes
```

**Solutions:**

- Use SDF fonts instead of Canvas fonts for better performance
- Reduce number of unique fonts
- Batch text updates instead of rendering individually
- Profile with browser DevTools to identify bottleneck

## Advanced Usage

### Dynamic Font Loading

```ts
// Load additional fonts on demand
async function loadAdditionalFont(fontName: string, url: string) {
  await renderer.stage.loadFont('canvas', {
    fontFamily: fontName,
    fontUrl: url,
  });
  console.log(`Font ${fontName} loaded successfully`);
}

// Later in your app
await loadAdditionalFont('DynamicFont', '/fonts/dynamic.ttf');
```

### Font Fallbacks

```ts
// Define multiple fonts for fallback scenario
const fonts = ['PreferredFont', 'FallbackFont', 'SystemFont'];

// Try loading preferred font; fall back if unavailable
for (const fontName of fonts) {
  try {
    const text = new TextNode(stage, {
      fontFamily: fontName,
      text: 'Some text',
    });
    console.log(`Using font: ${fontName}`);
    break;
  } catch (e) {
    console.warn(`Font ${fontName} not available, trying next...`);
  }
}
```

## See Also

- [Platform Architecture](./PLATFORMS.md) – Understanding renderer platforms and font support
- [Browser Support](../BROWSERS.md) – Font support by browser version
- [Getting Started](./GETTING-STARTED.md) – Installation and setup
- [API Documentation](https://lightning-js.github.io/renderer-docs/) – Complete Font API reference
- [LightningJS Typography Guide](https://lightningjs.io/v3-docs/) – Application-level font usage
