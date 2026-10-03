import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useShell } from '@/hooks/useShell';
import { stripAnsi } from '@/hooks/utils';

/**
 * TerminalBuffer emulates a terminal text stream.
 * Overwrites the active line on carriage returns (\r, \x1b[0G, \x1b[K),
 * handles cursor-up rewrites (\x1b[A), and commits lines on line feeds (\n).
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

  write(raw) {
    if (!raw) return;

    // 1. Strip DEC 2026 synchronized output markers
    let text = raw.replace(/\x1b\[\?2026[hl]/g, '');

    // 2. Map cursor up (\x1b[A, \x1b[1A)
    text = text.replace(/\x1b\[(?:1)?A/g, '\x1bA');

    // 3. Map cursor line-reset codes (\x1b[0G, \x1b[1G, \x1b[K) and \r to \r
    text = text.replace(/(?:\x1b\[[0-9]*[GgKk]|\r)+/g, '\r');

    // 4. Strip ANSI color/styling codes
    text = stripAnsi(text);

    // 5. Normalize \r\n to \n
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
  }

  toString() {
    if (this.currentLine) {
      return [...this.lines, this.currentLine].join('\n');
    }
    return this.lines.join('\n');
  }
}

export function Console() {
  const {
    showTerminal,
    registerTerminalSubscriber,
    clearTerminal,
    activeTaskId,
    cancelAction,
    __,
  } = useShell();

  const [logs, setLogs] = useState('');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const bufferRef = useRef(null);

  if (!bufferRef.current) {
    bufferRef.current = new TerminalBuffer();
  }

  // Subscribe to live terminal log events
  useEffect(() => {
    const unsub = registerTerminalSubscriber((text, isClear) => {
      if (isClear) {
        bufferRef.current.clear();
        setLogs('');
        return;
      }
      bufferRef.current.write(text);
      setLogs(bufferRef.current.toString());
    });
    return unsub;
  }, [registerTerminalSubscriber]);

  // Keep scrolled to bottom if user hasn't manually scrolled up
  useEffect(() => {
    if (!showTerminal || !containerRef.current) return;
    if (shouldAutoScrollRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, showTerminal]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // User is considered "at the bottom" if within 30px of the end
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 30;
  }, []);

  const handleCopy = useCallback(async () => {
    if (!logs) return;
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) { }
  }, [logs]);

  const handleClear = useCallback(() => {
    bufferRef.current.clear();
    setLogs('');
    clearTerminal?.();
  }, [clearTerminal]);

  if (!showTerminal) return null;

  const isRunning = Boolean(activeTaskId);

  return (
    <div className="h-44 w-full border-t border-border bg-card dark:bg-[#18181b] shrink-0 flex flex-col overflow-hidden select-text text-left">
      {/* Console Header Bar */}
      <div className="h-6 shrink-0 px-3 bg-muted/30 border-b border-border flex items-center justify-between text-[11px] text-muted-foreground select-none">
        <div className="flex items-center gap-2">
          <span
            className={`size-2 rounded-full transition-colors duration-200 ${
              isRunning ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground/40'
            }`}
          />
          <span className="font-medium text-foreground/80">
            {__('Console Output')}
          </span>
          {isRunning && (
            <span className="text-[10px] text-muted-foreground">({__('Running...')})</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            disabled={!logs}
            className="hover:text-foreground disabled:opacity-40 transition-colors cursor-default"
          >
            {copied ? __('Copied!') : __('Copy')}
          </button>
          <button
            onClick={handleClear}
            disabled={!logs}
            className="hover:text-foreground disabled:opacity-40 transition-colors cursor-default"
          >
            {__('Clear')}
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 p-2.5 overflow-y-auto font-mono text-[11px] leading-[1.35] text-foreground/90 whitespace-pre-wrap break-all select-text"
      >
        {logs ? (
          logs
        ) : (
          <div className="text-muted-foreground/50 italic select-none py-1">
            {isRunning ? __('Executing task...') : __('No logs recorded.')}
          </div>
        )}
      </div>
    </div>
  );
}

// Backward-compatible alias
export const TerminalDrawer = Console;
