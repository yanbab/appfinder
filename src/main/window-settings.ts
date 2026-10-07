import type { BrowserWindow } from 'electron';
import { Window } from './window';
import { __ } from './i18n';

let settingsWindow: SettingsWindow | null = null;

export class SettingsWindow extends Window {
  constructor(parentWindow?: BrowserWindow) {
    super({
      title: __('Settings'),
      width: 380,
      height: 200,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      parent: parentWindow || undefined,
      modal: false,
    });

    this.loadAppView('view=settings');

    this.on('closed', () => {
      settingsWindow = null;
    });
  }
}

export function createSettingsWindow(parentWindow?: BrowserWindow): SettingsWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new SettingsWindow(parentWindow);
  return settingsWindow;
}

export const openSettingsWindow = createSettingsWindow;



