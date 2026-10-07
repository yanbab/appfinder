// Config

const fs = require('fs');
const path = require('path');
const { CONFIG_DIR } = require('./path');

const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const defaults = {
  zap: false,
  alwaysShowStatusBar: false,
  debug: true,
  language: 'system'
};

let config = null;

function setupConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
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
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
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
