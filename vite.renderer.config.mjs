import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, 'src/renderer'),
  cacheDir: path.resolve(__dirname, 'node_modules/.vite-renderer'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/vite-renderer'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@/types': path.resolve(__dirname, 'src/types'),
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
});
