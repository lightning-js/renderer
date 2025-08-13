# Migration Guide: Lightning 3 v2.x to v3.0

This guide helps you migrate from Lightning 3 version 2.x to the new 3.0 release. The 3.0 version introduces several breaking changes to improve performance, API consistency, and developer experience.

## Breaking Changes Overview

1. **New Font Loading API** - Explicit renderer type specification required
2. **Property Deprecation** - `width`/`height` properties deprecated in favor of `w`/`h`
3. **Texture Memory Management** - New `doNotExceedCriticalThreshold` behavior

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
