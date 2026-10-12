import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function serveLocalFontAssetsPlugin() {
  return {
    name: 'serve-local-font-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split('?')[0];
        if (rawUrl) {
          const isThumb = rawUrl.includes('/font-thumbnails/');
          const isPreview = rawUrl.includes('/font-previews/');
          if (isThumb || isPreview) {
            const subFolder = isThumb ? 'font-thumbnails' : 'font-previews';
            const fileName = rawUrl.split(`/${subFolder}/`).pop();
            if (fileName) {
              const docsDir = path.resolve(__dirname, 'docs', subFolder);
              const targetFile = path.resolve(docsDir, decodeURIComponent(fileName));
              if (targetFile.startsWith(docsDir) && fs.existsSync(targetFile)) {
                try {
                  const stat = fs.statSync(targetFile);
                  if (stat.isFile()) {
                    res.setHeader('Content-Type', 'image/png');
                    res.setHeader('Content-Length', stat.size);
                    res.setHeader('Cache-Control', 'no-cache');
                    fs.createReadStream(targetFile).pipe(res);
                    return;
                  }
                } catch (_) {}
              }
            }
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveLocalFontAssetsPlugin()],
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

