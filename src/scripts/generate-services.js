#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const formulaApiUrl = 'https://formulae.brew.sh/api/formula.json';
const cacheFile = path.resolve(__dirname, '../../cache/formula.json');

async function getFormulae() {
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    } catch (_) {}
  }

  const response = await fetch(formulaApiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch formula data: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function generateServices() {
  try {
    const formulae = await getFormulae();
    const services = formulae
      .filter(f => Boolean(f.service || f.plist))
      .map(f => ({
        name: f.name,
        desc: f.desc || '',
        homepage: f.homepage || '',
        version: f.versions?.stable || '',
        service: f.service || { plist: f.plist }
      }));

    console.log(JSON.stringify(services, null, 2));
  } catch (err) {
    console.error('Error generating services:', err);
    process.exit(1);
  }
}

generateServices();
