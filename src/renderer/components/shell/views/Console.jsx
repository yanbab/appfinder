import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useShell } from '@/hooks/useShell';
import { stripAnsi } from '@/hooks/utils';

/**
 * Handles terminal carriage returns (\r) by overwriting the current line in-place,
 * exactly like a native terminal progress bar.
 */
function applyCarriageReturns(prev, incoming) {
  // Convert terminal cursor resets (\x1b[0G, \x1b[1G, \x1b[K) and \r to carriage returns
  const withCR = incoming
    .replace(/\x1b\[\?2026[hl]/g, '')
    .replace(/(?:\x1b\[[0-9]*[GgKk]|\r)+/g, '\r');
  const clean = stripAnsi(withCR);
  // Normalize \r\n to \n first so standard terminal line endings don't wipe lines
  const normalized = (prev + clean).replace(/\r\n/g, '\n');
  if (!normalized.includes('\r')) return normalized;

  const lines = normalized.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('\r')) {
      const parts = lines[i].split('\r');
      let chosen = '';
      for (let j = parts.length - 1; j >= 0; j--) {
        const seg = parts[j];
        if (seg.trim().length > 0) {
          chosen = seg;
          break;
        }
      }
      lines[i] = chosen;
    }
  }
  return lines.join('\n');
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

  // Subscribe to live terminal log events
  useEffect(() => {
    const unsub = registerTerminalSubscriber((text, isClear) => {
      if (isClear) {
        setLogs('');
        return;
      }
      setLogs((prev) => applyCarriageReturns(prev, text));
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
