import React, { useState, useEffect, useRef } from 'react';
import { useShell } from '@/hooks/useShell';

export function Console() {
  const {
    showTerminal,
    registerTerminalSubscriber,
    activeTaskId,
    __,
  } = useShell();

  const [logs, setLogs] = useState('');
  const containerRef = useRef(null);
  const endRef = useRef(null);

  // Subscribe to live terminal log events
  useEffect(() => {
    const unsub = registerTerminalSubscriber((text, isClear) => {
      setLogs(isClear ? '' : text);
    });
    return unsub;
  }, [registerTerminalSubscriber]);

  // Keep scrolled to bottom on output
  useEffect(() => {
    if (!showTerminal) return;
    const scrollDown = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      if (endRef.current) {
        endRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    };
    scrollDown();
    const raf = requestAnimationFrame(scrollDown);
    return () => cancelAnimationFrame(raf);
  }, [logs, showTerminal]);

  if (!showTerminal) return null;

  const isRunning = Boolean(activeTaskId);

  return (
    <div className="h-44 w-full border-t border-border/80 bg-black/50 shrink-0 flex flex-col overflow-hidden select-text text-left">
      {/* Log Output Body */}
      <div
        ref={containerRef}
        className="flex-1 p-2.5 overflow-y-auto font-mono text-[11px] leading-[1.35] text-zinc-100 whitespace-pre-wrap break-all select-text"
      >
        {logs ? (
          <>
            {logs}
            <div ref={endRef} />
          </>
        ) : (
          <div className="text-zinc-400/60 italic select-none py-1">
            {isRunning ? __('Executing task...') : __('No logs recorded.')}
          </div>
        )}
      </div>
    </div>
  );
}

// Backward-compatible alias
export const TerminalDrawer = Console;
