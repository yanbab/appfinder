import { app, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

// TEMPORARILY NEEDED FOR LOCAL FONT THUMBNAILS

export function registerSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'font-thumbnail',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

export function setupProtocols(): void {
  protocol.handle('font-thumbnail', (req) => {
    const parsed = new URL(req.url);
    const fileName = (parsed.host ? `${parsed.host}${parsed.pathname}` : parsed.pathname).replace(/^\/+/, '');
    const fontPath = app.isPackaged
      ? path.join(process.resourcesPath, 'docs', 'font-thumbnails', fileName)
      : path.join(__dirname, '../../docs/font-thumbnails', fileName);

    if (fs.existsSync(fontPath)) {
      return net.fetch(pathToFileURL(fontPath).toString());
    }
    return new Response('Not Found', { status: 404 });
  });
}
