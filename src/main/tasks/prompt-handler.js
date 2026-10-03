const { stripAnsi } = require('../system/terminal-buffer');

const PROMPTS = {
  PASSWORD: /(?:password\s*[:?]|passphrase\s*[:?]|mot de passe\s*[:?]|(?:sudo|admin).*(?:password|passphrase))/i,
  RETRY: /(?:sorry, try again|incorrect password|authentication failure)/i,
  CONFIRM: /(?:\[y\/n\]|\(y\/n\)|press (?:return|enter) to continue)/i
};

/**
 * Detects interactive prompts (confirmations, passwords) in terminal output chunks.
 *
 * @param {string} text - Raw or stripped terminal chunk
 * @returns {{
 *   isPrompt: boolean,
 *   type: 'password' | 'confirm' | null,
 *   isRetry: boolean,
 *   prompt: string,
 *   details: string
 * }}
 */
function detectPrompt(text) {
  if (!text) {
    return { isPrompt: false, type: null, isRetry: false, prompt: '', details: '' };
  }

  const clean = stripAnsi(text);
  const isRetry = PROMPTS.RETRY.test(clean);
  const isPasswordPrompt = PROMPTS.PASSWORD.test(clean);
  const isConfirmPrompt = !isPasswordPrompt && PROMPTS.CONFIRM.test(clean);

  if (!isPasswordPrompt && !isConfirmPrompt && !isRetry) {
    return { isPrompt: false, type: null, isRetry: false, prompt: '', details: '' };
  }

  const lines = clean.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const promptLine = lines.slice().reverse().find(l =>
    PROMPTS.CONFIRM.test(l) || PROMPTS.PASSWORD.test(l)
  ) || lines[lines.length - 1] || '';

  const detailLines = lines
    .filter(l => !PROMPTS.CONFIRM.test(l) && !/password|passphrase/i.test(l) && (l.startsWith('==>') || /dependenc|install|require|package/i.test(l)))
    .slice(-5)
    .map(l => l.replace(/^==>\s*/, '• '))
    .join('\n');

  return {
    isPrompt: true,
    type: isPasswordPrompt ? 'password' : (isConfirmPrompt ? 'confirm' : null),
    isRetry,
    prompt: promptLine,
    details: detailLines
  };
}

module.exports = {
  PROMPTS,
  detectPrompt
};
