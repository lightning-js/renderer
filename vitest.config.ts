import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // visual-regression holds the snapshot tooling. Its tests run here rather
    // than in a separate project so `pnpm test` covers the tooling too; it is
    // deliberately left out of `coverage.include`, which tracks the shipped
    // renderer.
    include: ['src/**/*.test.ts', 'visual-regression/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
    },
  },
});
