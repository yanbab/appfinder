import { createServer, build } from 'vite';
import { spawn } from 'child_process';
import electron from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startDev() {
  let electronProcess = null;
  let devUrl = '';
  let isRestarting = false;
  let server = null;

  server = await createServer({
    configFile: path.resolve(__dirname, '../vite.renderer.config.mjs'),
    server: {
      port: 5173,
      strictPort: false,
    },
  });

  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  devUrl = `http://localhost:${port}`;
  console.log(`\x1b[36m[Vite HMR]\x1b[0m Dev server active at \x1b[4m${devUrl}\x1b[0m`);

  function launchElectron() {
    if (electronProcess) {
      isRestarting = true;
      electronProcess.removeAllListeners('close');
      electronProcess.kill('SIGTERM');
      electronProcess = null;
    }

    console.log(`\x1b[36m[Electron]\x1b[0m Starting electron in development mode...`);
    electronProcess = spawn(electron, ['.'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_DEV_SERVER_URL: devUrl,
      },
    });

    electronProcess.on('close', (code) => {
      if (!isRestarting) {
        server?.close();
        process.exit(code ?? 0);
      }
      isRestarting = false;
    });
  }

  let restartTimer = null;
  let isFirstBuild = true;

  console.log(`\x1b[36m[Electron]\x1b[0m Building and watching main process & preload bundle...`);
  await build({
    configFile: path.resolve(__dirname, '../vite.main.config.mjs'),
    build: {
      watch: {},
    },
    plugins: [
      {
        name: 'vite-plugin-electron-reload',
        closeBundle() {
          if (isFirstBuild) {
            isFirstBuild = false;
            launchElectron();
            return;
          }
          if (restartTimer) clearTimeout(restartTimer);
          restartTimer = setTimeout(() => {
            console.log(`\x1b[33m[Electron]\x1b[0m Main process updated, restarting Electron...`);
            launchElectron();
          }, 200);
        },
      },
    ],
  });

  const cleanup = () => {
    if (electronProcess) {
      try {
        electronProcess.kill('SIGTERM');
      } catch (_) {}
    }
    server?.close();
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

startDev().catch((err) => {
  console.error('[Dev Error]', err);
  process.exit(1);
});

