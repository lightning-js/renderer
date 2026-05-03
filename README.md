# Lightning 3 Renderer

[![Build Status](https://github.com/lightning-js/renderer/actions/workflows/tests.yml/badge.svg)](https://github.com/lightning-js/renderer/actions)
[![Tests Passing](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![npm version](https://img.shields.io/npm/v/@lightningjs/renderer.svg)](https://www.npmjs.com/package/@lightningjs/renderer)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@lightningjs/renderer)](https://bundlephobia.com/package/@lightningjs/renderer)
[![npm downloads](https://img.shields.io/npm/dm/@lightningjs/renderer.svg)](https://www.npmjs.com/package/@lightningjs/renderer)

## The High-Performance 2D Renderer for Lightning 3

**Lightning 3 Renderer** is the core rendering engine that powers Lightning 3 applications. It enables highly performant user interfaces on web browsers, with specialized support for embedded devices using WebGL and Canvas rendering.

Lightning 3 Renderer is one component of the [Lightning 3 platform](https://lightningjs.io/v3-docs/). When building applications, you typically use it in combination with [Blits](https://lightningjs.io/v3-docs/blits/getting_started/intro.html), the application framework, which provides a higher-level API for building interactive user experiences.

## In Production

Lightning 3 Renderer is trusted by major broadcasters and streaming providers worldwide, eg:

- **Sky Sports+** – Sky Group
- **Xfinity Stream** – Comcast
- **Xfinity X1 Sports** - Comcast
- **Next-Generation Comcast/Sky Entertainment OS**

This project is the result of collaboration between **Sky Group**, **Comcast**, and **NBC Universal** teams, building on proven technology from Lightning 2 and refined for the modern web. Used on 10M+ embedded devices worldwide from STBs to various Smart TVs.

## Managed by RDK Management

Lightning 3 Renderer is managed through the [RDK Management Open Source](https://rdkcentral.com/) initiative, ensuring open governance and community collaboration.

## Key Capabilities

- **Cross-Device Support**: Optimized for everything from Chrome v38 (2014) to modern browsers
- **Platform Abstraction**: Intelligently adapts to browser capabilities with automatic fallbacks
- **Performance-First**: Engineered for embedded devices and streaming applications with minimal overhead
- **Multiple Rendering Modes**: WebGL for modern browsers, Canvas fallback for legacy systems
- **Advanced Typography**: Support for both SDF and Canvas-based font rendering
- **Modular Architecture**: Extensible platform system for custom optimizations

## Quick Start

### Requirements

- Node.js >= 18.0.0
- pnpm >= 10.17.0

### Install & Build

```bash
# Install dependencies
pnpm install

# Build the renderer
pnpm build

# Watch mode for development
pnpm watch

# Run tests
pnpm test

# Start example tests
pnpm start
```

For detailed setup instructions and development workflows, see [Getting Started](./docs/GETTING-STARTED.md).

## Documentation

- **[Getting Started](./docs/GETTING-STARTED.md)** – Installation, build commands, development workflow
- **[Platform Architecture](./docs/PLATFORMS.md)** – Understanding and selecting rendering platforms (WebGL, Canvas, legacy support)
- **[Font Loading](./docs/FONTS.md)** – Installing and using Canvas and SDF fonts
- **[Browser Support](./BROWSERS.md)** – Detailed browser compatibility and feature matrix
- **[Example Tests](./examples/README.md)** – Manual testing and visual examples
- **[Visual Regression Testing](./visual-regression/README.md)** – Automated visual regression test suite
- **[API Documentation](https://lightning-js.github.io/renderer-docs/)** – Complete API reference (generated via TypeDoc)
- **[Migration Guide](./docs/migration-2x-to-3.0.md)** – Upgrading from Lightning 3 v2.x

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) for details.

See [Browsers Supported](./BROWSERS.md) for a comprehensive list of tested browsers and their specific capabilities, including support for older embedded device browsers.

---

**Learn more:** Visit [LightningJS.io](https://lightningjs.io) for the full Lightning 3 documentation and Blits framework guide.
