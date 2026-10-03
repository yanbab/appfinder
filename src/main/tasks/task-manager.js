const pty = require('../system/pty-process');
const { TerminalBuffer } = require('../system/terminal-buffer');
const { detectPrompt } = require('./prompt-handler');

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
 * @param {Function} [callbacks.onLog] - Log callback ({ taskId, type, text, line, raw, plainText })
 * @param {Function} [callbacks.onPrompt] - Prompt callback ({ taskId, type, isRetry, prompt, details, respond })
 * @param {Function} [callbacks.onComplete] - Completion callback ({ taskId, code, error, cancelled })
 */
function runTask({ taskId, command, args, shell, shellArgs, cwd, env }, callbacks = {}) {
  const { onLog, onComplete, onPrompt } = callbacks;

  const [execCmd, execArgs] = Array.isArray(args)
    ? [command, args]
    : [shell || pty.getDefaultShell(), shellArgs || ['-l', '-c', command]];

  console.log(`[TASK-MANAGER (${taskId})]:`, execCmd, execArgs);

  const term = pty.spawn(execCmd, execArgs, {
    cwd,
    env,
    cols: 80,
    rows: 24
  });

  const buffer = new TerminalBuffer();
  let waitingForPrompt = false;

  term.onData((raw) => {
    if (raw) {
      const { line, text, plainText } = buffer.write(raw);
      onLog?.({ taskId, type: 'stdout', text, line, raw, plainText });

      if (onPrompt && !waitingForPrompt) {
        const promptInfo = detectPrompt(raw || line);
        if (promptInfo.isPrompt && promptInfo.type) {
          waitingForPrompt = true;
          onPrompt({
            taskId,
            type: promptInfo.type,
            isRetry: promptInfo.isRetry,
            prompt: promptInfo.prompt,
            details: promptInfo.details,
            respond: (answer) => {
              waitingForPrompt = false;
              term.write(answer);
            }
          });
        }
      }
    }
  });

  let finished = false;
  const finish = (code, error = null, cancelled = false) => {
    if (finished) return;
    finished = true;
    waitingForPrompt = false;
    console.log(`[TASK-MANAGER EXIT (${taskId})]: code=${code}, error=${error}, cancelled=${cancelled}`);
    activeTasks.delete(taskId);
    onComplete?.({ taskId, code: code ?? 0, error, cancelled });
  };

  term.on('error', (err) => {
    console.error(`[TASK-MANAGER CHILD ERROR (${taskId})]:`, err);
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
