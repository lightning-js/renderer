# Font Loading API Example

This document demonstrates how to use the new font loading API on the Stage.

## Basic Usage

```typescript
// Load Canvas fonts by explicitly specifying the renderer type
await stage.loadFont('canvas', {
  fontFamily: 'myCoolFont',
  fontUrl: '/fonts/my-font.ttf',
});

// Load SDF fonts by explicitly specifying the renderer type
await stage.loadFont('sdf', {
  fontFamily: 'myCoolFont',
  atlasUrl: '/fonts/my-font-atlas.png',
  atlasDataUrl: '/fonts/my-font-data.json',
});

// Load fonts with custom metrics
await stage.loadFont('canvas', {
  fontFamily: 'MyFontWithMetrics',
  fontUrl: '/fonts/my-font.ttf',
  metrics: {
    ascender: 800,
    descender: -200,
    lineGap: 0,
    unitsPerEm: 1000,
  },
});
```

## API Requirements

The `loadFont` method requires explicit renderer type specification:

- **`rendererType`** (required): 'canvas' or 'sdf'
- **`options`** (required): Font loading options specific to the renderer type

### Canvas Font Options

- `fontFamily`: Name of the font family
- `fontUrl`: URL to the font file (.ttf, .woff, .woff2, etc.)
- `metrics`: Optional font metrics for layout calculations

### SDF Font Options

- `fontFamily`: Name of the font family
- `atlasUrl`: URL to the SDF atlas image (.png)
- `atlasDataUrl`: URL to the SDF glyph data (.json)
- `metrics`: Optional font metrics for layout calculations

## Performance Considerations

**SDF Fonts**: Better performance for scaled text and effects, but require pre-generated atlas files.

**Canvas Fonts**: Universal compatibility with any web font format, but may have lower performance for complex scaling.

Please note that the WebGL renderer supports both SDF Fonts and Web Fonts, however the
Canvas renderer only supports Web Fonts:

| Font Type Renderer | SDF Font | Web Font |
| ------------------ | -------- | -------- |
| WebGL              | Y        | Y        |
| Canvas             | N        | Y        |
