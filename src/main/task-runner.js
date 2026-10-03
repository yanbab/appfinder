const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
 * Runs a command using macOS /usr/bin/script (allocates pseudo-terminal for authentic TTY progress)
 * with direct streaming output.
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

  const useScript = process.platform === 'darwin' && fs.existsSync('/usr/bin/script');

  let child;
  if (Array.isArray(args)) {
    if (useScript) {
      console.log(`[MAIN TASK-RUNNER (${taskId}) SPAWN SCRIPT]:`, command, args);
      // Set pseudo-terminal window dimensions (rows/cols) via stty.
      // Without this, macOS BSD script defaults to 0 rows and 0 cols, which causes
      // Homebrew's DownloadQueue (max_lines = [concurrency, Tty.height].min) to equal 0
      // and suppress all download progress text!
      child = spawn('/usr/bin/script', [
        '-q', '-t', '0', '/dev/null',
        '/bin/sh', '-c', 'stty rows 24 cols 80 2>/dev/null; exec "$@"', '--',
        command, ...args
      ], {
        cwd: resolvedCwd,
        env: resolvedEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      console.log(`[MAIN TASK-RUNNER (${taskId}) SPAWN DIRECT]:`, command, args);
      child = spawn(command, args, { cwd: resolvedCwd, env: resolvedEnv, stdio: ['pipe', 'pipe', 'pipe'] });
    }
  } else {
    const resolvedShell = shell || getDefaultShell();
    const resolvedArgs = shellArgs || ['-l', '-c', command];
    if (useScript) {
      console.log(`[MAIN TASK-RUNNER (${taskId}) SPAWN SCRIPT SHELL]:`, resolvedShell, resolvedArgs);
      child = spawn('/usr/bin/script', [
        '-q', '-t', '0', '/dev/null',
        '/bin/sh', '-c', 'stty rows 24 cols 80 2>/dev/null; exec "$@"', '--',
        resolvedShell, ...resolvedArgs
      ], {
        cwd: resolvedCwd,
        env: resolvedEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      console.log(`[MAIN TASK-RUNNER (${taskId}) SPAWN DIRECT SHELL]:`, resolvedShell, resolvedArgs);
      child = spawn(resolvedShell, resolvedArgs, {
        cwd: resolvedCwd,
        env: resolvedEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }
  }

  const handleStdout = (chunk) => {
    let text = chunk.toString();
    text = text.replace(/^\x04\s*/, '');
    if (text) {
      console.log(`[MAIN TASK-RUNNER STDOUT (${taskId})]:`, JSON.stringify(text));
      onLog?.({ taskId, type: 'stdout', text });
    }
  };

  const handleStderr = (chunk) => {
    let text = chunk.toString();
    text = text.replace(/^\x04\s*/, '');
    if (text) {
      console.error(`[MAIN TASK-RUNNER STDERR (${taskId})]:`, JSON.stringify(text));
      onLog?.({ taskId, type: 'stderr', text });
    }
  };

  if (child.stdout) child.stdout.on('data', handleStdout);
  if (child.stderr) child.stderr.on('data', handleStderr);

  let finished = false;
  const finish = (code, error = null, cancelled = false) => {
    if (finished) return;
    finished = true;
    console.log(`[MAIN TASK-RUNNER EXIT (${taskId})]: code=${code}, error=${error}, cancelled=${cancelled}`);
    activeTasks.delete(taskId);
    onComplete?.({ taskId, code: code ?? 0, error, cancelled });
  };

  child.on('error', (err) => {
    console.error(`[MAIN TASK-RUNNER CHILD ERROR (${taskId})]:`, err);
    finish(1, err.message);
  });
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
