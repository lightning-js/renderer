import { defineConfig } from 'vite';
import * as path from 'path';

/**
 * Vite Config
 */
export default defineConfig(({ command, mode, ssrBuild }) => {
  return {
    build: {
      minify: false,
      sourcemap: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'test/index.html'),
      },
      outDir: path.resolve(__dirname, 'dist-test'),
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  };
});
