/**
 * Strip ANSI escape codes from string
 * @param {string} str
 * @returns {string}
 */
function stripAnsi(str) {
  if (!str) return '';
  return str
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

/**
 * TerminalBuffer maintains an in-memory virtual terminal scrollback buffer.
 * It resolves ANSI cursor line resets (\r, \x1b[0G, \x1b[K), handles cursor-up (\x1b[A),
 * and commits lines on line feeds (\n).
 */
class TerminalBuffer {
  constructor(maxLines = 2000) {
    this.maxLines = maxLines;
    this.lines = [];
    this.currentLine = '';
    this.pendingOverwrite = false;
  }

  clear() {
    this.lines = [];
    this.currentLine = '';
    this.pendingOverwrite = false;
  }

  /**
   * Ingests a raw chunk of output from the terminal process.
   * @param {string} raw
   * @returns {{ line: string, text: string }}
   */
  write(raw) {
    if (!raw) return { line: '', text: this.toString() };

    // 1. Strip DEC 2026 synchronized output mode markers
    let text = raw.replace(/\x1b\[\?2026[hl]/g, '');

    // 2. Map cursor-up (\x1b[A, \x1b[1A)
    text = text.replace(/\x1b\[(?:1)?A/g, '\x1bA');

    // 3. Map cursor line-reset codes (\x1b[0G, \x1b[1G, \x1b[K) and \r to \r
    text = text.replace(/(?:\x1b\[[0-9]*[GgKk]|\r)+/g, '\r');

    // 4. Strip styling ANSI escapes (colors, bold, etc.)
    text = stripAnsi(text);

    // 5. Normalize CRLF to LF
    text = text.replace(/\r\n/g, '\n');

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\x1b' && text[i + 1] === 'A') {
        i++;
        if (this.lines.length > 0) {
          this.currentLine = this.lines.pop();
          this.pendingOverwrite = true;
        }
      } else if (ch === '\r') {
        this.pendingOverwrite = true;
      } else if (ch === '\n') {
        this.lines.push(this.currentLine);
        this.currentLine = '';
        this.pendingOverwrite = false;
        if (this.lines.length > this.maxLines) {
          this.lines.splice(0, this.lines.length - this.maxLines);
        }
      } else {
        if (this.pendingOverwrite) {
          this.currentLine = ch;
          this.pendingOverwrite = false;
        } else {
          this.currentLine += ch;
        }
      }
    }

    let rawLine = this.currentLine;
    if (!rawLine || !rawLine.trim()) {
      for (let j = this.lines.length - 1; j >= 0; j--) {
        if (this.lines[j] && this.lines[j].trim()) {
          rawLine = this.lines[j];
          break;
        }
      }
    }
    const activeLine = (rawLine || '').trimEnd();

    return {
      line: activeLine,
      text: this.toString()
    };
  }

  toString() {
    return this.currentLine ? [...this.lines, this.currentLine].join('\n') : this.lines.join('\n');
  }
}

module.exports = {
  TerminalBuffer,
  stripAnsi
};
