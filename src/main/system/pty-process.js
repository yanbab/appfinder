const EventEmitter = require('events');
const { spawn: nodeSpawn } = require('child_process');
const fs = require('fs');

/**
 * Resolves default shell available on macOS / Linux
 * @returns {string}
 */
function getDefaultShell() {
  if (fs.existsSync('/bin/zsh')) return '/bin/zsh';
  if (fs.existsSync('/bin/bash')) return '/bin/bash';
  return '/bin/sh';
}

/**
 * Minimal node-pty compatible pseudo-terminal wrapper using native OS tools.
 * On macOS / Linux, uses /usr/bin/script to allocate a pseudo-terminal for authentic TTY output.
 */
class PseudoTerminal extends EventEmitter {
  constructor(file, args = [], options = {}) {
    super();

    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    this.process = file;

    const cwd = options.cwd || (typeof process.cwd === 'function' ? process.cwd() : (fs.existsSync(process.env.HOME || '') ? process.env.HOME : '/tmp'));
    const env = {
      TERM: options.name || 'xterm-256color',
      COLUMNS: String(this.cols),
      LINES: String(this.rows),
      ...(options.env || process.env)
    };

    const isDarwin = process.platform === 'darwin' && fs.existsSync('/usr/bin/script');
    const isLinux = process.platform === 'linux' && fs.existsSync('/usr/bin/script');

    let child;

    if (isDarwin) {
      child = nodeSpawn('/usr/bin/script', [
        '-q', '-t', '0', '/dev/null',
        '/bin/sh', '-c', `stty rows ${this.rows} cols ${this.cols} 2>/dev/null; exec "$@"`, '--',
        file, ...args
      ], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    } else if (isLinux) {
      // Linux script syntax: script -q -c "..." /dev/null
      const cmdStr = [file, ...args].map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ');
      child = nodeSpawn('/usr/bin/script', [
        '-q', '-c', `stty rows ${this.rows} cols ${this.cols} 2>/dev/null; exec ${cmdStr}`, '/dev/null'
      ], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    } else {
      child = nodeSpawn(file, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    }

    this.child = child;
    this.pid = child.pid;
    this._killed = false;

    const handleChunk = (chunk) => {
      let raw = chunk.toString().replace(/^\x04\s*/, '');
      if (raw) {
        this.emit('data', raw);
      }
    };

    if (child.stdout) child.stdout.on('data', handleChunk);
    if (child.stderr) child.stderr.on('data', handleChunk);

    child.on('error', (err) => {
      this.emit('error', err);
      this._handleExit(1, null);
    });

    child.on('close', (code, signal) => {
      this._handleExit(code ?? 0, signal);
    });
  }

  _handleExit(exitCode, signal) {
    if (this._exited) return;
    this._exited = true;
    this.emit('exit', { exitCode, signal });
  }

  /**
   * Register a listener for output data (node-pty API compatible)
   * @param {function(string): void} listener
   * @returns {{ dispose: function(): void }}
   */
  onData(listener) {
    this.on('data', listener);
    return {
      dispose: () => this.off('data', listener)
    };
  }

  /**
   * Register a listener for process exit (node-pty API compatible)
   * @param {function({ exitCode: number, signal?: number }): void} listener
   * @returns {{ dispose: function(): void }}
   */
  onExit(listener) {
    this.on('exit', listener);
    return {
      dispose: () => this.off('exit', listener)
    };
  }

  /**
   * Write input text/keystrokes to the terminal process
   * @param {string} data
   */
  write(data) {
    try {
      if (this.child?.stdin && !this.child.stdin.destroyed) {
        this.child.stdin.write(data);
      }
    } catch (_) {}
  }

  /**
   * Resize terminal columns and rows
   * @param {number} cols
   * @param {number} rows
   */
  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
  }

  /**
   * Terminate the terminal process
   * @param {string} [signal='SIGTERM']
   */
  kill(signal = 'SIGTERM') {
    if (this._killed) return;
    this._killed = true;
    try {
      this.child?.kill(signal);
    } catch (_) {}
  }
}

/**
 * Spawns a pseudo-terminal process with node-pty compatible API.
 * @param {string} file
 * @param {string[]} args
 * @param {object} options
 * @returns {PseudoTerminal}
 */
function spawn(file, args = [], options = {}) {
  return new PseudoTerminal(file, args, options);
}

module.exports = {
  spawn,
  PseudoTerminal,
  getDefaultShell
};
