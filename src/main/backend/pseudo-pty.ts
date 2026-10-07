import { EventEmitter } from 'events';
import { spawn as nodeSpawn, type ChildProcess } from 'child_process';
import fs from 'fs';

export function getDefaultShell(): string {
  if (fs.existsSync('/bin/zsh')) return '/bin/zsh';
  if (fs.existsSync('/bin/bash')) return '/bin/bash';
  return '/bin/sh';
}

export interface PseudoTerminalOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  name?: string;
}

export interface ExitPayload {
  exitCode: number;
  signal?: string | number | null;
}

export class PseudoTerminal extends EventEmitter {
  cols: number;
  rows: number;
  process: string;
  child: ChildProcess;
  pid?: number;
  private _killed: boolean = false;
  private _exited: boolean = false;

  constructor(file: string, args: string[] = [], options: PseudoTerminalOptions = {}) {
    super();

    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    this.process = file;

    const cwd = options.cwd || (typeof process.cwd === 'function' ? process.cwd() : (fs.existsSync(process.env.HOME || '') ? process.env.HOME! : '/tmp'));
    const env = {
      ...(options.env || process.env),
      TERM: options.name || (options.env?.TERM || 'xterm-256color'),
      COLUMNS: String(this.cols),
      LINES: String(this.rows),
    };

    const isDarwin = process.platform === 'darwin' && fs.existsSync('/usr/bin/script');

    let child: ChildProcess;

    if (isDarwin) {
      child = nodeSpawn('/usr/bin/script', [
        '-q', '-t', '0', '/dev/null',
        '/bin/sh', '-c', `stty rows ${this.rows} cols ${this.cols} 2>/dev/null; exec "$@"`, '--',
        file, ...args,
      ], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    } else {
      child = nodeSpawn(file, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    }

    this.child = child;
    this.pid = child.pid;

    const handleChunk = (chunk: Buffer | string) => {
      const raw = chunk.toString().replace(/^\x04\s*/, '');
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

  private _handleExit(exitCode: number, signal: string | number | null): void {
    if (this._exited) return;
    this._exited = true;
    this.emit('exit', { exitCode, signal });
  }

  onData(listener: (data: string) => void): { dispose: () => void } {
    this.on('data', listener);
    return {
      dispose: () => this.off('data', listener),
    };
  }

  onExit(listener: (payload: ExitPayload) => void): { dispose: () => void } {
    this.on('exit', listener);
    return {
      dispose: () => this.off('exit', listener),
    };
  }

  write(data: string): void {
    try {
      if (this.child?.stdin && !this.child.stdin.destroyed) {
        this.child.stdin.write(data);
      }
    } catch (_) { }
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
  }

  kill(signal: NodeJS.Signals | number = 'SIGTERM'): void {
    if (this._killed) return;
    this._killed = true;
    try {
      this.child?.kill(signal as any);
    } catch (_) { }
  }
}

export function spawn(file: string, args: string[] = [], options: PseudoTerminalOptions = {}): PseudoTerminal {
  return new PseudoTerminal(file, args, options);
}


