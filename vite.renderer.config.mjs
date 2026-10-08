import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-font-thumbnails',
      configureServer(server) {
        server.middlewares.use('/font-thumbnails', (req, res, next) => {
          const cleanUrl = req.url ? req.url.split('?')[0].replace(/^\//, '') : '';
          const filePath = path.resolve(__dirname, 'docs/font-thumbnails', decodeURIComponent(cleanUrl));
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      },
    },
  ],
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
