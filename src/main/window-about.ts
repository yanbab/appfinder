import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export function setupAboutWindow(): void {
  let creditsText = 'Made with 🍺 by YanBab';
  try {
    const candidatePaths = [
      path.join(app.getAppPath(), 'Credits.html'),
      path.join(__dirname, '../../Credits.html'),
      path.join(__dirname, '../Credits.html'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        creditsText = fs.readFileSync(p, 'utf8');
        break;
      }
    }
  } catch (_) {}

  app.setAboutPanelOptions({
    applicationName: app.getName() || 'AppFinder',
    applicationVersion: app.getVersion() || '0.9.12',
    copyright: 'Copyright © 2026 Yan Bab',
    version: app.getVersion() || '0.9.12',
    credits: creditsText,
  });
}

export function showAboutWindow(): void {
  app.showAboutPanel();
}
