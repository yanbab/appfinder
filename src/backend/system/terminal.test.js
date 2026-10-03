const test = require('node:test');
const assert = require('node:assert/strict');
const { TerminalBuffer, stripAnsi } = require('../../main/terminal-buffer');
const { detectPrompt } = require('../../main/prompt-detector');

test('stripAnsi removes color and control escapes', () => {
  const colored = '\x1b[32mSuccess\x1b[0m: Installed \x1b[1mApp\x1b[0m';
  assert.equal(stripAnsi(colored), 'Success: Installed App');
});

test('TerminalBuffer handles plain lines and carriage return overwrites', () => {
  const buffer = new TerminalBuffer();
  
  // Normal line push
  buffer.write('Line 1\n');
  assert.equal(buffer.toString(), 'Line 1');
  
  // Overwriting line with \r
  buffer.write('Downloading 10%\r');
  assert.equal(buffer.write('Downloading 50%\r').line, 'Downloading 50%');
  assert.equal(buffer.write('Downloading 100%\n').line, 'Downloading 100%');
  
  // Full text contains Line 1 and the final committed line
  assert.ok(buffer.toString().includes('Line 1'));
  assert.ok(buffer.toString().includes('Downloading 100%'));
  assert.ok(!buffer.toString().includes('Downloading 10%'));
});

test('TerminalBuffer toPlainText and line extraction', () => {
  const buffer = new TerminalBuffer();
  const res = buffer.write('==> \x1b[34mUpdating Homebrew...\x1b[0m\n');
  assert.equal(res.line, '==> Updating Homebrew...');
  assert.equal(res.plainText, '==> Updating Homebrew...');
});

test('detectPrompt identifies [y/n] confirmation prompts and extracts details', () => {
  const output = [
    '==> Satisfying dependencies',
    '==> Downloading https://example.com/app.dmg',
    'Do you want to proceed with uninstallation? [y/N]'
  ].join('\n');

  const result = detectPrompt(output);
  assert.equal(result.isPrompt, true);
  assert.equal(result.type, 'confirm');
  assert.equal(result.isRetry, false);
  assert.equal(result.prompt, 'Do you want to proceed with uninstallation? [y/N]');
  assert.ok(result.details.includes('• Satisfying dependencies'));
  assert.ok(result.details.includes('• Downloading https://example.com/app.dmg'));
});

test('detectPrompt identifies lowercase (y/n) prompts', () => {
  const output = 'Uninstall cask and all files? (y/n)';
  const result = detectPrompt(output);
  assert.equal(result.isPrompt, true);
  assert.equal(result.type, 'confirm');
});

test('detectPrompt identifies password prompts and retry messages', () => {
  const pwPrompt = '==> Running sudo installer\nPassword:';
  const result1 = detectPrompt(pwPrompt);
  assert.equal(result1.isPrompt, true);
  assert.equal(result1.type, 'password');
  assert.equal(result1.isRetry, false);

  const retryPrompt = 'Sorry, try again.\nPassword:';
  const result2 = detectPrompt(retryPrompt);
  assert.equal(result2.isPrompt, true);
  assert.equal(result2.type, 'password');
  assert.equal(result2.isRetry, true);
});

test('detectPrompt returns non-prompt for regular logs', () => {
  const normalLog = '==> Downloading https://example.com/pkg.tar.gz\nAlready downloaded: /tmp/pkg.tar.gz';
  const result = detectPrompt(normalLog);
  assert.equal(result.isPrompt, false);
  assert.equal(result.type, null);
});

test('brewService getActionArgs returns correct arguments for actions', () => {
  const brewService = require('../../main/services/brew-service');
  assert.deepEqual(brewService.getActionArgs('install', 'vlc'), ['install', '--force', '--cask', 'vlc']);
  assert.deepEqual(brewService.getActionArgs('upgrade', 'vlc'), ['upgrade', '--force', '--cask', 'vlc']);
  assert.deepEqual(brewService.getActionArgs('uninstall', 'vlc', true), ['uninstall', '--force', '--zap', '--cask', 'vlc']);
  assert.deepEqual(brewService.getActionArgs('refresh'), ['update']);
  assert.deepEqual(brewService.getActionArgs('cleanup'), ['cleanup', '--prune=all']);
  assert.equal(brewService.getActionArgs('unknown'), null);
});

