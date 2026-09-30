const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');

function getData(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  } catch (e) {
    console.error(`Failed to read data file ${file}:`, e);
    return [];
  }
}

function getApps() {
  return getData('apps.json');
}

function getCategories() {
  return getData('categories.json');
}

module.exports = {
  getApps,
  getCategories,
  getData
};
