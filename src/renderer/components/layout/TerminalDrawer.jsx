import React, { useEffect, useRef } from 'react';
import { useShell } from '@/store/useShell';
import { useTheme } from '@/store/useTheme';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

export function TerminalDrawer() {
  const { showTerminal, registerTerminalSubscriber, activeTaskId, cancelAction } = useShell();
  const { isDark } = useTheme();
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);

  const termBg = isDark ? '#18181b' : '#f4f4f5';
  const termFg = isDark ? '#e4e4e7' : '#18181b';

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
      fontSize: 11,
      lineHeight: 1.25,
      cursorBlink: false,
      convertEol: true,
      scrollback: 1000,
      theme: isDark
        ? {
          background: '#18181b',
          foreground: '#e4e4e7',
          cursor: '#e4e4e7',
          selectionBackground: 'rgba(255, 255, 255, 0.2)',
          black: '#18181b',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f4f4f5',
        }
        : {
          background: '#f4f4f5',
          foreground: '#18181b',
          cursor: '#18181b',
          selectionBackground: 'rgba(0, 0, 0, 0.15)',
          black: '#18181b',
          red: '#dc2626',
          green: '#16a34a',
          yellow: '#ca8a04',
          blue: '#2563eb',
          magenta: '#9333ea',
          cyan: '#0891b2',
          white: '#fafafa',
        },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    try {
      fitAddon.fit();
    } catch (e) { }

    term.onData((data) => {
      if (data === '\x03') {
        cancelAction();
        return;
      }
      if (activeTaskId && window.ipc?.writePtyInput) {
        window.ipc.writePtyInput(activeTaskId, data);
      }
    });

    const unsub = registerTerminalSubscriber((text) => {
      term.write(text);
      term.scrollToBottom();
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (e) { }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      unsub();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [registerTerminalSubscriber, activeTaskId, cancelAction, isDark]);

  useEffect(() => {
    if (showTerminal && fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.scrollToBottom();
        } catch (e) { }
      }, 50);
    }
  }, [showTerminal]);

  return (
    <div
      className={
        showTerminal
          ? "h-44 w-full border-t border-border shrink-0 flex flex-col overflow-hidden"
          : "hidden"
      }
      style={{ backgroundColor: termBg }}
    >
      <div
        ref={containerRef}
        className="w-full h-full p-2.5 overflow-hidden select-text text-left font-mono"
        style={{ backgroundColor: termBg }}
      />
    </div>
  );
}
