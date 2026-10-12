import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCommandsData } from '../scripts/generate-commands.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('generate-commands metadata detection', () => {
  it('extracts command packages and runnable user command binaries', async () => {
    const { totalFormulaeWithCommands, totalExecutables, items } = await generateCommandsData({ limit: 10 });

    assert.ok(totalFormulaeWithCommands > 1000, 'Should find thousands of formulae with commands');
    assert.ok(totalExecutables > totalFormulaeWithCommands, 'Total executables should exceed formula count');
    assert.equal(items.length, 10, 'Should respect limit parameter');

    const first = items[0];
    assert.ok(first.token, 'Should have a token');
    assert.ok(first.category === 'commands', 'Category should be commands');
    assert.ok(Array.isArray(first.commands) && first.commands.length > 0, 'Should have commands array');
    assert.ok(first.primaryCommand, 'Should have a primaryCommand');
  });

  it('correctly maps known tool tokens to primary executables', async () => {
    const { items: rgItems } = await generateCommandsData({ lookup: 'ripgrep' });
    assert.ok(rgItems.length >= 1, 'Should find ripgrep');
    const rg = rgItems.find((i) => i.token === 'ripgrep');
    assert.ok(rg, 'Should find ripgrep formula');
    assert.equal(rg.primaryCommand, 'rg', 'ripgrep primary command should be rg');
    assert.ok(rg.commands.includes('rg'), 'commands should include rg');
  });

  it('generated data/commands.json exists and contains valid JSON metadata', () => {
    const commandsPath = path.join(ROOT_DIR, 'data', 'commands.json');
    assert.ok(fs.existsSync(commandsPath), 'data/commands.json should exist');

    const content = fs.readFileSync(commandsPath, 'utf8');
    const parsed = JSON.parse(content);
    assert.ok(Array.isArray(parsed), 'commands.json should be an array');
    assert.ok(parsed.length > 5000, 'Should contain over 5,000 command packages');

    const sample = parsed.find((item) => item.token === 'ripgrep');
    assert.ok(sample, 'Should include ripgrep in commands.json');
    assert.equal(sample.primaryCommand, 'rg');
  });
});
