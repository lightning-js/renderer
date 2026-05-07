# Getting Started with Lightning 3 Renderer

## System Requirements

- **Node.js**: >= 18.0.0
- **pnpm**: >= 10.17.0
- Modern terminal/command line

We recommend using a Node version manager like [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage multiple Node versions.

## Installation

```bash
# Install all dependencies (renderer + examples)
pnpm install
```

This installs dependencies for the main renderer package and all sub-projects (examples, visual-regression testing, etc.).

## Building

### Standard Build

```bash
# Build the renderer (one-time)
pnpm build
```

Outputs compiled code to the `dist/` directory.

### Watch Mode (Development)

```bash
# Build in watch mode - automatically recompiles on file changes
pnpm watch
```

Useful during active development. The build process watches TypeScript files and rebuilds incrementally.

### TypeDoc API Documentation

```bash
# Generate HTML API documentation
pnpm typedoc
```

Documentation is built into the `typedocs/` folder. Open `typedocs/index.html` in a browser to view the complete API reference.

## Testing

### Unit Tests

```bash
# Run all unit tests (single run)
pnpm test

# Run unit tests in watch mode
pnpm test -- --watch
```

Uses [Vitest](https://vitest.dev/) for testing. Tests are defined alongside source code with `.test.ts` extensions.

### Visual Regression Tests

```bash
# Run visual regression suite
pnpm test:visual
```

This runs snapshots of visual tests and compares them against certified baselines. Requires Chromium browser (installed automatically by Playwright on first run).

See [Visual Regression Testing](../visual-regression/README.md) for detailed information about the visual testing pipeline, including how to create and update snapshots.

## Running Examples

The Lightning 3 Renderer includes an interactive example test suite. These examples demonstrate renderer features and can be used for manual testing across browsers and devices.

### Development Mode

```bash
# Launch example tests in watch mode
pnpm start
```

- Compiles the renderer in watch mode
- Starts a dev server (typically at `http://localhost:5173`)
- Hot reloads on code changes
- Loads examples in your browser

Useful for testing changes against multiple example cases during development.

### Production Mode

```bash
# Build and launch example tests in production mode
pnpm start:prod
```

**Important**: If testing on older embedded devices or Chrome 38+, you **must** use production mode. It applies necessary transpilation and polyfills that development mode skips.

### Example Documentation

See [examples/README.md](../examples/README.md) for:

- List of available example tests
- URL parameters for filtering and configuring examples
- Information about snapshot definitions
- Browser compatibility notes

## Development Workflow

### Typical Development Loop

```bash
# 1. Start watch mode (includes example reload)
pnpm watch

# 2. In another terminal, optionally run tests in watch mode
pnpm test -- --watch

# 3. Make changes to source code in `src/`
# Changes automatically trigger rebuilds and example reloads

# 4. When ready, run full test suite
pnpm test

# 5. Run visual regression tests to ensure no visual regressions
pnpm test:visual
```

### Project Structure

```
renderer/
├── src/                    # Source code (TypeScript)
├── test/                   # Test utilities and mock data
├── examples/               # Interactive example tests
├── visual-regression/      # Visual regression test configuration
├── docs/                   # Documentation
├── dist/                   # Compiled output (generated)
├── dist-vitest/            # Test build output (generated)
├── package.json            # Main package configuration
└── tsconfig.json           # TypeScript configuration
```

### Source Organization

```
src/
├── main-api/              # Public API exports
├── core/                  # Core rendering engine
├── common/                # Shared utilities
└── utils.ts               # Helper functions
```

## Configuration

### TypeScript

Main configuration files:

- `tsconfig.json` – Base TypeScript configuration
- `tsconfig.dist.json` – Configuration for release builds
- `tsconfig.vitest.json` – Configuration for tests

### Build Tools

- **Vite**: Used for examples and building
- **Vitest**: Test runner
- **TypeDoc**: API documentation generator
- **ESLint**: Code linting (config in `eslint.config.js`)

## Troubleshooting

### Build Issues

**"pnpm not found"**

```bash
# Install pnpm globally
npm install -g pnpm
```

**"Node version too old"**

```bash
# Check your Node version
node --version

# Upgrade Node to >= 18.0.0
# Using nvm:
nvm install 18
nvm use 18
```

### Test Issues

**Visual regression tests timeout**

- First run downloads Chromium: `pnpm test:visual` (may take several minutes)
- Subsequent runs are faster

**Unit tests fail after changes**

- Ensure you've run `pnpm build` or `pnpm watch` before testing
- Check that no other processes are locking files

### Example Server Issues

**Port already in use**

- Dev server typically uses port 5173
- Check for other services on that port
- Or specify a different port: `pnpm start -- --port 5174`

**Hot reload not working**

- Kill the dev server and restart: `pnpm start`
- Check browser console for errors

## Next Steps

- Explore [Platform Architecture](./PLATFORMS.md) to understand rendering options
- Review [Font Loading](./FONTS.md) if your app uses custom fonts
- Check [Browser Support](../BROWSERS.md) to understand device compatibility
- Read the [API Documentation](https://lightning-js.github.io/renderer-docs/) for detailed API reference
- Build with [Blits](https://lightningjs.io/v3-docs/blits/getting_started/intro.html) framework for easier application development

## Support

For issues, questions, or contributions:

- **Issue Tracker**: [GitHub Issues](https://github.com/lightning-js/renderer/issues)
- **Documentation**: [LightningJS.io](https://lightningjs.io)
- **Community**: [RDK Management](https://rdkmanagement.github.io/)
