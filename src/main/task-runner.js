const { spawn } = require('child_process');
const fs = require('fs');

const activeTasks = new Map();

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
 * Runs a command using child_process.spawn with direct streaming output.
 *
 * @param {object} options
 * @param {string} options.taskId - Unique task identifier
 * @param {string} options.command - Executable path or full shell command string
 * @param {string[]} [options.args] - Command arguments (if provided, spawned directly)
 * @param {string} [options.cwd] - Working directory
 * @param {object} [options.env] - Environment variables
 * @param {object} [callbacks]
 * @param {Function} [callbacks.onLog] - Log callback ({ taskId, type, text })
 * @param {Function} [callbacks.onComplete] - Completion callback ({ taskId, code, error, cancelled })
 */
function runTask({ taskId, command, args, shell, shellArgs, cwd, env }, callbacks = {}) {
  const { onLog, onComplete } = callbacks;

  const resolvedCwd = cwd || (fs.existsSync(process.env.HOME || '') ? process.env.HOME : '/tmp');
  const resolvedEnv = {
    TERM: 'xterm-256color',
    COLUMNS: '80',
    LINES: '24',
    ...(env || process.env)
  };

  const child = Array.isArray(args)
    ? spawn(command, args, { cwd: resolvedCwd, env: resolvedEnv, stdio: ['pipe', 'pipe', 'pipe'] })
    : spawn(shell || getDefaultShell(), shellArgs || ['-l', '-c', command], {
        cwd: resolvedCwd,
        env: resolvedEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

  const handleData = (chunk) => {
    const text = chunk.toString();
    if (text) {
      onLog?.({ taskId, type: 'stdout', text });
    }
  };

  if (child.stdout) child.stdout.on('data', handleData);
  if (child.stderr) child.stderr.on('data', handleData);

  let finished = false;
  const finish = (code, error = null, cancelled = false) => {
    if (finished) return;
    finished = true;
    activeTasks.delete(taskId);
    onComplete?.({ taskId, code: code ?? 0, error, cancelled });
  };

  child.on('error', (err) => finish(1, err.message));
  child.on('close', (code) => finish(code ?? 0));

  activeTasks.set(taskId, {
    child,
    write: (data) => {
      try {
        if (child.stdin && !child.stdin.destroyed) {
          child.stdin.write(data);
        }
      } catch (_) {}
    },
    kill: (signal = 'SIGTERM') => {
      try {
        child.kill(signal);
      } catch (_) {}
    }
  });
}

function cancelTask(taskId, onComplete) {
  const task = activeTasks.get(taskId);
  if (task) {
    task.kill('SIGTERM');
    setTimeout(() => {
      if (activeTasks.has(taskId)) {
        task.kill('SIGKILL');
        activeTasks.delete(taskId);
      }
    }, 1500);

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
