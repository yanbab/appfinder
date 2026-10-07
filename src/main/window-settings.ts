import type { BrowserWindow } from 'electron';
import { createWindow } from './window';
import { __ } from './i18n';

let settingsWindow: BrowserWindow | null = null;

export function createSettingsWindow(parentWindow?: BrowserWindow): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = createWindow({
    title: __('Settings'),
    width: 380,
    height: 200,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    parent: parentWindow || undefined,
    modal: false,
    viewQuery: 'view=settings',
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

export const openSettingsWindow = createSettingsWindow;
