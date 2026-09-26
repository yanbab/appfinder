// Config

const fs = require('fs');
const path = require('path');
const os = require('os');

const configDir = path.join(os.homedir(), '.config', 'appfinder');
const configPath = path.join(configDir, 'config.json');

const defaults = {
  zap: false,
  alwaysShowStatusBar: false,
  showDockBadge: true,
  showTrayIcon: true,
  autoCheckUpdates: true,
  debug: true,
  language: 'system'
};

let config = null;

function setupConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = { ...defaults, ...JSON.parse(raw) };
  } catch {
    config = { ...defaults };
  }
  return config;
}

function getConfig() {
  if (!config) setupConfig();
  return config;
}

function updateConfig(newConfig) {
  config = { ...getConfig(), ...newConfig };
  try {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
  return config;
}

module.exports = {
  setupConfig,
  getConfig,
  updateConfig
};
