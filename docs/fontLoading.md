# Font Loading API Example

This document demonstrates how to use the new font loading API on the Stage.

## Basic Usage

```typescript
// Load fonts using the generic methods with auto-detection
await stage.loadFont({
  fontFamily: 'myCoolFont',
  fontUrl: '/fonts/my-font.ttf'  // Will use Canvas renderer
});

await stage.loadFont({
  fontFamily: 'myCoolFont',
  atlasUrl: '/fonts/my-font-atlas.png',
  atlasDataUrl: '/fonts/my-font-data.json'  // Will use SDF renderer
});

// Load fonts with explicit renderer selection
await stage.loadFontByRenderer('canvas', {
  fontFamily: 'myCoolFont',
  fontUrl: '/fonts/my-font.ttf'
});

await stage.loadFontByRenderer('sdf', {
  fontFamily: 'myCoolFont',
  atlasUrl: '/fonts/my-sdf-font-atlas.png',
  atlasDataUrl: '/fonts/my-sdf-font-data.json'
});

// Load fonts with custom metrics
await stage.loadFont({
  fontFamily: 'MyFontWithMetrics'
  fontUrl: '/fonts/my-font.ttf',
  ascender: 800,
  descender: -200,
  lineHeight: 1200,
});
```

## Performance Considerations

The `loadFont` method (without renderer specification) will automatically choose the best renderer:

1. **SDF first**: Better performance for scaled text and effects
2. **Canvas fallback**: Universal compatibility

If you know which renderer you want to use, `loadFontByRenderer` gives you explicit control.

Please note that the WebGL renderer supports both SDF Fonts and Web Fonts, however the
Canvas renderer only supports Web Fonts:

| Font Type Renderer | SDF Font | Web Font |
| ------------------ | -------- | -------- |
| WebGL              | Y        | Y        |
| Canvas             | N        | Y        |
