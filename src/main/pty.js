const { spawn } = require('child_process');
const fs = require('fs');

let pty = null;
try {
  pty = require('node-pty');
} catch (_) { }

const { ensurePtyPermissions } = require('../main/utils/pty-permissions');

const activeTasks = new Map();

/**
 * Resolves default shell available on the system
 * @returns {string}
 */
function getDefaultShell() {
  if (fs.existsSync('/bin/zsh')) return '/bin/zsh';
  if (fs.existsSync('/bin/bash')) return '/bin/bash';
  return '/bin/sh';
}

/**
 * Runs a command in an interactive pseudo-terminal (PTY) with fallback to child_process.spawn
 * @param {object} options
 * @param {string} options.taskId - Unique task identifier
 * @param {string} options.command - Command line to execute
 * @param {string} [options.shell] - Shell path (defaults to zsh/bash/sh)
 * @param {string[]} [options.shellArgs] - Shell arguments (defaults to ['-l', '-c', command])
 * @param {string} [options.cwd] - Working directory (defaults to process.env.HOME or /tmp)
 * @param {object} [options.env] - Environment variables
 * @param {number} [options.cols=80] - Terminal columns
 * @param {number} [options.rows=15] - Terminal rows
 * @param {object} [callbacks]
 * @param {Function} [callbacks.onLog] - Log output callback ({ taskId, type, text })
 * @param {Function} [callbacks.onComplete] - Completion callback ({ taskId, code, error, cancelled })
 */
function runTask({ taskId, command, shell, shellArgs, cwd, env, cols = 80, rows = 15 }, callbacks = {}) {
  const { onLog, onComplete } = callbacks;

  const resolvedShell = shell || getDefaultShell();
  const resolvedShellArgs = shellArgs || ['-l', '-c', command];
  const resolvedEnv = env || process.env;
  const resolvedCwd = cwd || process.env.HOME || '/tmp';

  const onTaskFinished = (exitCode) => {
    activeTasks.delete(taskId);
    onComplete?.({ taskId, code: exitCode });
  };

  ensurePtyPermissions();

  let ptyProcess = null;
  if (pty && typeof pty.spawn === 'function') {
    try {
      ptyProcess = pty.spawn(resolvedShell, resolvedShellArgs, {
        name: 'xterm-color',
        cols,
        rows,
        cwd: resolvedCwd,
        env: resolvedEnv
      });
    } catch (err) {
      console.warn('node-pty spawn failed, falling back to child_process.spawn:', err);
    }
  }

  if (ptyProcess) {
    activeTasks.set(taskId, {
      write: (data) => { try { ptyProcess.write(data); } catch (_) { } },
      kill: () => { try { ptyProcess.kill(); } catch (_) { } }
    });

    ptyProcess.onData((data) => {
      onLog?.({ taskId, type: 'stdout', text: data });
    });

    ptyProcess.onExit(({ exitCode }) => {
      onTaskFinished(exitCode);
    });
  } else {
    const cp = spawn(resolvedShell, resolvedShellArgs, {
      cwd: resolvedCwd,
      env: resolvedEnv
    });

    activeTasks.set(taskId, {
      write: (data) => { try { cp.stdin.write(data); } catch (_) { } },
      kill: () => { try { cp.kill(); } catch (_) { } }
    });

    const forward = (stream) => stream.on('data', (data) => {
      onLog?.({ taskId, type: 'stdout', text: data.toString() });
    });

    forward(cp.stdout);
    forward(cp.stderr);

    cp.on('close', (exitCode) => {
      onTaskFinished(exitCode || 0);
    });
  }
}

function cancelTask(taskId, onComplete) {
  const task = activeTasks.get(taskId);
  if (task) {
    task.kill();
    activeTasks.delete(taskId);
    onComplete?.({ taskId, code: -1, cancelled: true });
  }
}

function writeTaskInput(taskId, text) {
  activeTasks.get(taskId)?.write?.(text);
}

function isTaskActive(taskId) {
  return activeTasks.has(taskId);
}

module.exports = {
  runTask,
  cancelTask,
  writeTaskInput,
  isTaskActive,
  getDefaultShell
};
