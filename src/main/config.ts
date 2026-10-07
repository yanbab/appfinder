// Config

import fs from 'fs';
import path from 'path';
import { CONFIG_DIR } from './path';
import type { AppConfig } from '../types/cask';

const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const defaults: AppConfig = {
  zap: false,
  alwaysShowStatusBar: false,
  debug: true,
  language: 'system',
};

let config: AppConfig | null = null;

export function setupConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = { ...defaults, ...JSON.parse(raw) };
  } catch {
    config = { ...defaults };
  }
  return config!;
}

export function getConfig(): AppConfig {
  if (!config) setupConfig();
  return config!;
}

export function updateConfig(newConfig: Partial<AppConfig>): AppConfig {
  config = { ...getConfig(), ...newConfig };
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
  return config;
}


