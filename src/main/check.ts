import fs from 'fs';
import { execSync } from 'child_process';
import i18n from './i18n';

export function checkCommand(cmd: string): boolean {
  const paths = [
    `/opt/homebrew/bin/${cmd}`,
    `/usr/local/bin/${cmd}`,
    `/usr/bin/${cmd}`,
    `/bin/${cmd}`
  ];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return true;
    } catch (_) { }
  }
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

export function checkCommandDialog(cmd: string): void {
  const { dialog } = require('electron');
  dialog.showErrorBox(
    i18n.__('Command "%s" not found', cmd),
    i18n.__('Please install "%s" and try again.', cmd)
  );
}


