const test = require('node:test');
const assert = require('node:assert/strict');
const { TerminalBuffer, stripAnsi } = require('../src/main/backend/terminal-buffer');
const { detectPrompt } = require('../src/main/backend/task-runner');
const brew = require('../src/main/backend/brew');

let formatStatusBarMessage;
test.before(async () => {
  const utils = await import('../src/renderer/hooks/utils.js');
  formatStatusBarMessage = utils.formatStatusBarMessage;
});

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

test('detectPrompt correctly parses dependency confirmation with target app and dependencies', () => {
  const output = [
    '==> Would install 1 cask:',
    'ace-link',
    '==> Would install 1 dependency for ace-link:',
    'docker-desktop',
    '==> Do you want to proceed with the installation? [y/n]'
  ].join('\n');

  const result = detectPrompt(output);
  assert.equal(result.isPrompt, true);
  assert.equal(result.type, 'confirm');
  assert.equal(result.isDependency, true);
  assert.equal(result.targetApp, 'ace-link');
  assert.equal(result.dependencies, 'docker-desktop');
  assert.equal(result.details, 'docker-desktop');
  assert.equal(result.prompt, '==> Do you want to proceed with the installation? [y/n]');
});

test('detectPrompt correctly parses multiple dependencies', () => {
  const output = [
    '==> Would install 2 dependencies for my-tool:',
    'pkg-a',
    'pkg-b',
    '==> Do you want to proceed with the installation? [y/n]'
  ].join('\n');

  const result = detectPrompt(output);
  assert.equal(result.isPrompt, true);
  assert.equal(result.type, 'confirm');
  assert.equal(result.isDependency, true);
  assert.equal(result.targetApp, 'my-tool');
  assert.equal(result.dependencies, 'pkg-a, pkg-b');
  assert.equal(result.details, 'pkg-a, pkg-b');
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

test('brew getActionArgs returns correct arguments for actions', () => {
  assert.deepEqual(brew.getActionArgs('install', 'vlc'), ['install', '--force', '--cask', 'vlc']);
  assert.deepEqual(brew.getActionArgs('upgrade', 'vlc'), ['upgrade', '--force', '--cask', 'vlc']);
  assert.deepEqual(brew.getActionArgs('uninstall', 'vlc', true), ['uninstall', '--force', '--zap', '--cask', 'vlc']);
  assert.deepEqual(brew.getActionArgs('refresh'), ['update']);
  assert.deepEqual(brew.getActionArgs('cleanup'), ['cleanup', '--prune=all']);
  assert.equal(brew.getActionArgs('unknown'), null);
});

test('pseudo-pty spawns with declared terminal size (cols/rows) and authentic TTY environment', async () => {
  const pty = require('../src/main/backend/pseudo-pty');
  const term = pty.spawn(process.execPath, [
    '-e',
    'console.log(JSON.stringify({ isTTY: Boolean(process.stdout.isTTY), cols: process.stdout.columns || 0, rows: process.stdout.rows || 0, envCols: process.env.COLUMNS, envLines: process.env.LINES, term: process.env.TERM }))'
  ], { cols: 80, rows: 24 });

  let output = '';
  await new Promise((resolve) => {
    term.onData((data) => { output += data; });
    term.onExit(resolve);
  });

  const jsonMatch = output.match(/\{[^{}]*\}/);
  assert.ok(jsonMatch, 'Child process must output JSON with environment info');
  const info = JSON.parse(jsonMatch[0]);

  // Terminal size must be declared in environment so tools like curl/brew calculate progress layout
  assert.equal(info.envCols, '80', 'COLUMNS env must be 80');
  assert.equal(info.envLines, '24', 'LINES env must be 24');
  assert.equal(info.term, 'xterm-256color', 'TERM env must be xterm-256color');
  if (process.platform === 'darwin' || process.platform === 'linux') {
    assert.equal(info.isTTY, true, 'Process spawned via pseudo-terminal must report isTTY=true for authentic progress rendering');
  }
});

test('TerminalBuffer resolves complex terminal progress streams with cursor resets, DEC 2026, and cursor-up', () => {
  const buffer = new TerminalBuffer();

  // 1. Initial output with synchronized output markers (DEC 2026) and ANSI color
  const chunk1 = '==> \x1b[34mDownloading https://example.com/cask.dmg\x1b[0m\n\x1b[?2026h';
  const res1 = buffer.write(chunk1);
  assert.equal(res1.line, '==> Downloading https://example.com/cask.dmg');

  // 2. Carriage return progress bar with cursor resets (\x1b[0G, \x1b[K, \r)
  const chunk2 = '\x1b[0G\x1b[K##\x1b[?2026l\r\x1b[K### 25.0% 25M/100M';
  const res2 = buffer.write(chunk2);
  assert.equal(res2.line, '### 25.0% 25M/100M');

  // 3. Next progress tick overwriting the line
  const chunk3 = '\r\x1b[K####### 75.0% 75M/100M';
  const res3 = buffer.write(chunk3);
  assert.equal(res3.line, '####### 75.0% 75M/100M');

  // 4. Final 100% tick and commit newline
  const chunk4 = '\r\x1b[K########## 100.0% 100M/100M\n';
  const res4 = buffer.write(chunk4);
  assert.equal(res4.line, '########## 100.0% 100M/100M');

  // 5. Next step begins
  const chunk5 = '==> \x1b[32mInstalling App.pkg\x1b[0m\n';
  const res5 = buffer.write(chunk5);
  assert.equal(res5.line, '==> Installing App.pkg');

  // Verify buffer text does NOT contain repetitive overwritten lines
  const plainText = buffer.toPlainText();
  assert.ok(plainText.includes('==> Downloading https://example.com/cask.dmg'));
  assert.ok(plainText.includes('########## 100.0% 100M/100M'));
  assert.ok(plainText.includes('==> Installing App.pkg'));
  assert.ok(!plainText.includes('25.0%'), 'Overwritten progress ticks should not clutter committed lines');
});

test('TerminalBuffer cursor-up (\\x1b[A) replaces previous line for multi-line progress updates', () => {
  const buffer = new TerminalBuffer();

  buffer.write('Component A: Downloading...\n');
  buffer.write('Component B: Downloading...\n');

  // Cursor-up moves up one line to update Component B or A
  buffer.write('\x1b[A\rComponent B: Done (100%)\n');

  const text = buffer.toString();
  assert.ok(text.includes('Component A: Downloading...'));
  assert.ok(text.includes('Component B: Done (100%)'));
  const occurrences = text.split('Component B').length - 1;
  assert.equal(occurrences, 1, 'Cursor-up should replace the previous line rather than appending a duplicate');
});

test('taskRunner streams live carriage-return progress events through onLog', async () => {
  const taskRunner = require('../src/main/backend/task-runner');
  const taskId = 'test-progress-' + Date.now();
  const capturedLines = [];

  await new Promise((resolve, reject) => {
    taskRunner.runTask(
      {
        taskId,
        command: process.execPath,
        args: [
          '-e',
          'process.stdout.write("Step 1: Init\\n"); ' +
          'setTimeout(() => process.stdout.write("Downloading 10%\\r"), 20); ' +
          'setTimeout(() => process.stdout.write("Downloading 50%\\r"), 40); ' +
          'setTimeout(() => process.stdout.write("Downloading 100%\\nStep 2: Complete\\n"), 60);'
        ]
      },
      {
        onLog: ({ line }) => {
          if (line && (!capturedLines.length || capturedLines[capturedLines.length - 1] !== line)) {
            capturedLines.push(line);
          }
        },
        onComplete: ({ code, error }) => {
          if (error || code !== 0) reject(error || new Error(`Exit code ${code}`));
          else resolve();
        }
      }
    );
  });

  assert.ok(capturedLines.some(l => l.includes('Step 1: Init')), 'Must capture Step 1');
  assert.ok(capturedLines.some(l => l.includes('Downloading')), 'Must capture live download progress line');
  assert.ok(capturedLines.some(l => l.includes('Step 2: Complete')), 'Must capture Step 2');
});

test('formatStatusBarMessage extracts lines starting with ==> and strips prefix', () => {
  assert.equal(
    formatStatusBarMessage('==> Fetching downloads for: codex'),
    'Fetching downloads for: codex'
  );
  assert.equal(
    formatStatusBarMessage('==> \x1b[1mInstalling Cask google-chrome\x1b[0m'),
    'Installing Cask google-chrome'
  );
  assert.equal(
    formatStatusBarMessage('==> Caveats'),
    'Caveats'
  );
});

test('formatStatusBarMessage extracts download, verify, and extract progress keyword and rest of line', () => {
  assert.equal(
    formatStatusBarMessage('\x1b[34m⠙\x1b[0m Cask codex (0.160.0)                                                              Downloading  28.7KB/141.3MB'),
    'Downloading 28.7KB/141.3MB'
  );
  assert.equal(
    formatStatusBarMessage('⠦ Cask codex (0.160.0)                                                              Downloaded  141.3MB/141.3MB'),
    'Downloaded 141.3MB/141.3MB'
  );
  assert.equal(
    formatStatusBarMessage('⠴ Cask codex (0.160.0)                                                              Verifying   141.3MB/141.3MB'),
    'Verifying 141.3MB/141.3MB'
  );
  assert.equal(
    formatStatusBarMessage('⠙ Cask codex (0.160.0)                                                              Verified    141.3MB/141.3MB'),
    'Verified 141.3MB/141.3MB'
  );
  assert.equal(
    formatStatusBarMessage('⠙ Cask codex (0.160.0)                                                              Extracting  141.3MB/141.3MB'),
    'Extracting 141.3MB/141.3MB'
  );
  assert.equal(
    formatStatusBarMessage('==> Downloading https://ghcr.io/v2/homebrew/cask/codex'),
    'Downloading https://ghcr.io/v2/homebrew/cask/codex'
  );
});

test('formatStatusBarMessage ignores arbitrary and non-progress output', () => {
  assert.equal(formatStatusBarMessage('Warning: You are using macOS 13.'), null);
  assert.equal(formatStatusBarMessage('We (and Apple) do not provide support for this old version.'), null);
  assert.equal(formatStatusBarMessage(''), null);
  assert.equal(formatStatusBarMessage('   \n  '), null);
  assert.equal(formatStatusBarMessage(null), null);
  assert.equal(formatStatusBarMessage(undefined), null);
});

test('taskRunner marks completion as cancelled: true when user declines confirmation prompt', async () => {
  const taskRunner = require('../src/main/backend/task-runner');
  const taskId = 'test-cancel-prompt-' + Date.now();

  const result = await new Promise((resolve) => {
    taskRunner.runTask(
      {
        taskId,
        command: process.execPath,
        args: [
          '-e',
          'process.stdout.write("==> Would install 1 dependency for ace-link:\\ndocker-desktop\\n==> Do you want to proceed with the installation? [y/n]\\n");' +
          'process.stdin.setEncoding("utf8");' +
          'process.stdin.on("data", (chunk) => {' +
          '  if (chunk.trim() === "n") { process.exit(1); } else { process.exit(0); }' +
          '});'
        ]
      },
      {
        onPrompt: ({ respond, isDependency, targetApp, dependencies }) => {
          assert.equal(isDependency, true);
          assert.equal(targetApp, 'ace-link');
          assert.equal(dependencies, 'docker-desktop');
          // Decline confirmation
          respond('n\r', true);
        },
        onComplete: (res) => {
          resolve(res);
        }
      }
    );
  });

  assert.equal(result.cancelled, true, 'Result must have cancelled: true when user declines confirmation');
});


