import React from 'react';
import { useShell } from '@/store/useShell';
import { Check, Loader2, X } from 'lucide-react';

function TerminalPromptIcon({ className = "size-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 12 4 7" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export function StatusBar() {
  const {
    activeTaskId,
    drawerTitle,
    taskProgressPercent,
    cancelAction,
    updatesCount,
    lastCheckedTime,
    showTerminal,
    toggleTerminal,
    showDrawer,
    alwaysShowStatusBar,
    __,
  } = useShell();

  // If there's no active task, no drawer title, and alwaysShowStatusBar is false, and drawer is hidden
  const isVisible = showDrawer || alwaysShowStatusBar || activeTaskId || showTerminal;
  if (!isVisible) return null;

  const getStatusText = () => {
    if (activeTaskId && drawerTitle) return drawerTitle;
    if (drawerTitle) return drawerTitle;

    const count = updatesCount || 0;
    const updateText = count > 0
      ? (count === 1 ? __('1 update available') : __('%d updates available').replace('%d', count))
      : __('Up to date');

    if (!lastCheckedTime) return updateText;

    const timeStr = lastCheckedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${updateText} • ${__('Checked at %s').replace('%s', timeStr)}`;
  };

  return (
    <footer className="h-6 shrink-0 flex items-center justify-between border-t border-border bg-card text-[11px] font-mono text-muted-foreground select-none overflow-hidden">
      {/* Left: Status message or running task indicator with live download progress */}
      <div className="h-full flex items-center gap-2 px-2.5 min-w-0 mr-2 hover:bg-white/5 cursor-default transition-colors">
        {activeTaskId ? (
          <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
        ) : (
          <Check className="size-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="truncate text-foreground/80">{getStatusText()}</span>

        {/* Live download percentage progress bar */}
        {activeTaskId && taskProgressPercent !== null && (
          <div className="w-16 h-1.5 rounded-full bg-muted/80 overflow-hidden shrink-0 hidden sm:block">
            <div
              className="h-full bg-primary transition-all duration-150 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, taskProgressPercent))}%` }}
            />
          </div>
        )}
      </div>

      {/* Right: Actions (VS Code flat full-height style) */}
      <div className="h-full flex items-center shrink-0">
        {activeTaskId && (
          <button
            onClick={cancelAction}
            className="h-full px-2.5 flex items-center gap-1 text-xs text-destructive hover:bg-destructive/15 transition-colors cursor-default"
          >
            <X className="size-3" />
            <span>{__('Cancel')}</span>
          </button>
        )}

        <button
          onClick={toggleTerminal}
          className={`h-full px-2.5 flex items-center gap-1.5 transition-colors cursor-default ${
            showTerminal
              ? 'bg-white/15 text-foreground'
              : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
          }`}
          title={showTerminal ? "Hide Terminal" : "Show Terminal"}
        >
          <TerminalPromptIcon className="size-4" />
        </button>
      </div>
    </footer>
  );
}
