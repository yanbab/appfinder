import fs from 'fs';
import { execFileSync } from 'child_process';
import { dialog } from 'electron';
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
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

export function checkCommandDialog(cmd: string): void {
  dialog.showErrorBox(
    i18n.__('Command "%s" not found', cmd),
    i18n.__('Please install "%s" and try again.', cmd)
  );
}


