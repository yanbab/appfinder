import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    target: 'node20',
    outDir: path.resolve(__dirname, '../../dist/main'),
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: {
        main: path.resolve(__dirname, 'main.js'),
        preload: path.resolve(__dirname, 'preload.js')
      },
      formats: ['cjs']
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-devtools-installer',
        'node:events',
        'node:child_process',
        'node:fs',
        'node:path',
        'node:os',
        'node:util',
        'node:crypto',
        'events',
        'child_process',
        'fs',
        'path',
        'os',
        'util',
        'crypto'
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        format: 'cjs'
      }
    }
  }
});
