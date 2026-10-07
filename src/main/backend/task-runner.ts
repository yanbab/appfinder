import * as pty from './pseudo-pty';
import { TerminalBuffer, stripAnsi } from './terminal-buffer';

export interface PromptDetectionResult {
  isPrompt: boolean;
  type: 'password' | 'confirm' | null;
  isRetry: boolean;
  isDependency: boolean;
  targetApp: string;
  dependencies: string;
  prompt: string;
  details: string;
}

export interface RunTaskOptions {
  taskId: string;
  command: string;
  args?: string[];
  shell?: string;
  shellArgs?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface TaskLogCallbackPayload {
  taskId: string;
  type: string;
  text: string;
  line: string;
  raw: string;
  plainText: string;
}

export interface TaskPromptCallbackPayload {
  taskId: string;
  type: string;
  isRetry: boolean;
  isDependency: boolean;
  targetApp: string;
  dependencies: string;
  prompt: string;
  details: string;
  respond: (answer: string, userCancelled?: boolean) => void;
}

export interface TaskCompleteCallbackPayload {
  taskId: string;
  code: number;
  error?: string | null;
  cancelled?: boolean;
}

export interface RunTaskCallbacks {
  onLog?: (payload: TaskLogCallbackPayload) => void;
  onPrompt?: (payload: TaskPromptCallbackPayload) => void;
  onComplete?: (payload: TaskCompleteCallbackPayload) => void;
}

interface ActiveTask {
  pty: pty.PseudoTerminal;
  write: (data: string) => void;
  kill: (signal?: NodeJS.Signals | number) => void;
}

const activeTasks = new Map<string, ActiveTask>();

const PROMPTS = {
  PASSWORD: /(?:password\s*[:?]|passphrase\s*[:?]|mot de passe\s*[:?]|(?:sudo|admin).*(?:password|passphrase))/i,
  RETRY: /(?:sorry, try again|incorrect password|authentication failure)/i,
  CONFIRM: /(?:\[y\/n\]|\(y\/n\)|press (?:return|enter) to continue)/i,
};

export function detectPrompt(text: string): PromptDetectionResult {
  if (!text) {
    return { isPrompt: false, type: null, isRetry: false, isDependency: false, targetApp: '', dependencies: '', prompt: '', details: '' };
  }

  const clean = stripAnsi(text);
  const lines = clean.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { isPrompt: false, type: null, isRetry: false, isDependency: false, targetApp: '', dependencies: '', prompt: '', details: '' };
  }

  const tailLines = lines.slice(-2);
  const promptLine = tailLines.slice().reverse().find(l =>
    PROMPTS.CONFIRM.test(l) || PROMPTS.PASSWORD.test(l)
  );

  const isRetry = tailLines.some(l => PROMPTS.RETRY.test(l));
  const isPasswordPrompt = promptLine ? PROMPTS.PASSWORD.test(promptLine) : false;
  const isConfirmPrompt = !isPasswordPrompt && promptLine ? PROMPTS.CONFIRM.test(promptLine) : false;

  if (!isPasswordPrompt && !isConfirmPrompt && !isRetry) {
    return { isPrompt: false, type: null, isRetry: false, isDependency: false, targetApp: '', dependencies: '', prompt: '', details: '' };
  }

  let isDependency = false;
  let targetApp = '';
  const depList: string[] = [];

  const depHeaderIdx = lines.findIndex(l => /Would install \d+ dependenc/i.test(l));
  if (depHeaderIdx !== -1) {
    isDependency = true;
    const match = lines[depHeaderIdx].match(/for ([^:]+):/i);
    if (match) {
      targetApp = match[1].trim();
    } else {
      const caskHeaderIdx = lines.findIndex(l => /Would install \d+ cask/i.test(l));
      if (caskHeaderIdx !== -1 && lines[caskHeaderIdx + 1] && !lines[caskHeaderIdx + 1].startsWith('==>')) {
        targetApp = lines[caskHeaderIdx + 1].trim();
      }
    }

    for (let i = depHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('==>') || PROMPTS.CONFIRM.test(line)) break;
      if (line) depList.push(line);
    }
  }

  const dependencies = depList.join(', ');

  const detailLines = isDependency && dependencies
    ? dependencies
    : lines
        .filter(l => !PROMPTS.CONFIRM.test(l) && !/password|passphrase/i.test(l) && (l.startsWith('==>') || /dependenc|install|require|package/i.test(l)))
        .slice(-5)
        .map(l => l.replace(/^==>\s*/, '• '))
        .join('\n');

  return {
    isPrompt: true,
    type: isPasswordPrompt ? 'password' : (isConfirmPrompt ? 'confirm' : null),
    isRetry,
    isDependency,
    targetApp,
    dependencies,
    prompt: promptLine || lines[lines.length - 1] || '',
    details: detailLines,
  };
}

export function runTask(
  { taskId, command, args, shell, shellArgs, cwd, env }: RunTaskOptions,
  callbacks: RunTaskCallbacks = {}
): void {
  const { onLog, onComplete, onPrompt } = callbacks;

  const [execCmd, execArgs] = Array.isArray(args)
    ? [command, args]
    : [shell || pty.getDefaultShell(), shellArgs || ['-l', '-c', command]];

  console.log(`[TASK-RUNNER (${taskId})]:`, execCmd, execArgs);

  let term: pty.PseudoTerminal;
  try {
    term = pty.spawn(execCmd, execArgs, {
      cwd,
      env,
      cols: 80,
      rows: 24,
    });
  } catch (err: any) {
    console.error(`[TASK-RUNNER SPAWN ERROR (${taskId})]:`, err);
    onComplete?.({ taskId, code: 1, error: err.message, cancelled: false });
    return;
  }

  const buffer = new TerminalBuffer();
  const handledPrompts = new Set<string>();
  let waitingForPrompt = false;
  let isCancelledByUser = false;

  term.onData((raw: string) => {
    if (raw) {
      const { line, text, plainText } = buffer.write(raw);
      onLog?.({ taskId, type: 'stdout', text, line, raw, plainText });

      if (onPrompt && !waitingForPrompt) {
        const promptInfo = detectPrompt(plainText || text || raw || line);
        if (promptInfo.isPrompt && promptInfo.type) {
          const promptKey = `${promptInfo.type}:${promptInfo.prompt}:${promptInfo.dependencies || ''}`;
          if (!handledPrompts.has(promptKey)) {
            waitingForPrompt = true;
            onPrompt({
              taskId,
              type: promptInfo.type,
              isRetry: promptInfo.isRetry,
              isDependency: promptInfo.isDependency,
              targetApp: promptInfo.targetApp,
              dependencies: promptInfo.dependencies,
              prompt: promptInfo.prompt,
              details: promptInfo.details,
              respond: (answer: string, userCancelled: boolean = false) => {
                handledPrompts.add(promptKey);
                waitingForPrompt = false;
                if (userCancelled || answer === 'n\r' || answer === 'n') {
                  isCancelledByUser = true;
                }
                term.write(answer);
              },
            });
          }
        }
      }
    }
  });

  let finished = false;
  const finish = (code: number, error: string | null = null, cancelled: boolean = false) => {
    if (finished) return;
    finished = true;
    waitingForPrompt = false;
    const finalCancelled = cancelled || isCancelledByUser;
    console.log(`[TASK-RUNNER EXIT (${taskId})]: code=${code}, error=${error}, cancelled=${finalCancelled}`);
    activeTasks.delete(taskId);
    onComplete?.({ taskId, code: code ?? 0, error, cancelled: finalCancelled });
  };

  term.on('error', (err: any) => {
    console.error(`[TASK-RUNNER CHILD ERROR (${taskId})]:`, err);
    finish(1, err.message);
  });

  term.onExit(({ exitCode }) => {
    finish(exitCode ?? 0);
  });

  activeTasks.set(taskId, {
    pty: term,
    write: (data: string) => term.write(data),
    kill: (signal: NodeJS.Signals | number = 'SIGTERM') => {
      isCancelledByUser = true;
      term.kill(signal);
    },
  });
}

export function cancelTask(
  taskId: string,
  onComplete?: (payload: { taskId: string; code: number; cancelled: boolean }) => void
): void {
  const task = activeTasks.get(taskId);
  if (task) {
    try {
      task.kill('SIGTERM');
      setTimeout(() => {
        if (activeTasks.has(taskId)) {
          try { task.kill('SIGKILL'); } catch (_) {}
          activeTasks.delete(taskId);
        }
      }, 1500);
    } catch (_) {}

    activeTasks.delete(taskId);
  }
  onComplete?.({ taskId, code: -1, cancelled: true });
}

export function writeTaskInput(taskId: string, text: string): void {
  activeTasks.get(taskId)?.write?.(text);
}

export function isTaskActive(taskId: string): boolean {
  return activeTasks.has(taskId);
}


