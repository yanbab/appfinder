const pty = require('./pseudo-pty');
const { TerminalBuffer } = require('./terminal-buffer');

const activeTasks = new Map();

/**
 * Runs a command using pseudo-terminal wrapper with streaming output into TerminalBuffer.
 *
 * @param {object} options
 * @param {string} options.taskId - Unique task identifier
 * @param {string} options.command - Executable path or full shell command string
 * @param {string[]} [options.args] - Command arguments (if provided, spawned directly)
 * @param {string} [options.cwd] - Working directory
 * @param {object} [options.env] - Environment variables
 * @param {object} [callbacks]
 * @param {Function} [callbacks.onLog] - Log callback ({ taskId, type, text, line, raw })
 * @param {Function} [callbacks.onComplete] - Completion callback ({ taskId, code, error, cancelled })
 */
function runTask({ taskId, command, args, shell, shellArgs, cwd, env }, callbacks = {}) {
  const { onLog, onComplete } = callbacks;

  const [execCmd, execArgs] = Array.isArray(args)
    ? [command, args]
    : [shell || pty.getDefaultShell(), shellArgs || ['-l', '-c', command]];

  console.log(`[MAIN TASK-RUNNER (${taskId})]:`, execCmd, execArgs);

  const term = pty.spawn(execCmd, execArgs, {
    cwd,
    env,
    cols: 80,
    rows: 24
  });

  const buffer = new TerminalBuffer();

  term.onData((raw) => {
    if (raw) {
      const { line, text } = buffer.write(raw);
      onLog?.({ taskId, type: 'stdout', text, line, raw });
    }
  });

  let finished = false;
  const finish = (code, error = null, cancelled = false) => {
    if (finished) return;
    finished = true;
    console.log(`[MAIN TASK-RUNNER EXIT (${taskId})]: code=${code}, error=${error}, cancelled=${cancelled}`);
    activeTasks.delete(taskId);
    onComplete?.({ taskId, code: code ?? 0, error, cancelled });
  };

  term.on('error', (err) => {
    console.error(`[MAIN TASK-RUNNER CHILD ERROR (${taskId})]:`, err);
    finish(1, err.message);
  });

  term.onExit(({ exitCode }) => {
    finish(exitCode ?? 0);
  });

  activeTasks.set(taskId, {
    pty: term,
    write: (data) => term.write(data),
    kill: (signal = 'SIGTERM') => term.kill(signal)
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
  getDefaultShell: pty.getDefaultShell
};
