import { createServer } from 'vite';
import { spawn } from 'child_process';
import electron from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startDev() {
  const server = await createServer({
    configFile: path.resolve(__dirname, '../renderer/vite.config.mjs'),
    server: {
      port: 5173,
      strictPort: false,
    },
  });

  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  const devUrl = `http://localhost:${port}`;
  console.log(`\x1b[36m[Vite HMR]\x1b[0m Dev server active at \x1b[4m${devUrl}\x1b[0m`);
  console.log(`\x1b[36m[Electron]\x1b[0m Starting electron in development mode`);

  const child = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: devUrl,
    },
  });

  child.on('close', () => {
    server.close();
    process.exit();
  });
}

startDev().catch((err) => {
  console.error('[Dev Error]', err);
  process.exit(1);
});
