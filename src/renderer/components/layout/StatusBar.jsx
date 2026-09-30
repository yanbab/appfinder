import React from 'react';
import { useShell } from '@/hooks/useShell';
import { Check, Loader2, SquareX, Terminal, RefreshCw } from 'lucide-react';

export function StatusBar() {
  const {
    activeTaskId,
    drawerTitle,
    taskProgressPercent,
    cancelAction,
    updatesCount,
    showTerminal,
    toggleTerminal,
    showDrawer,
    alwaysShowStatusBar,
    selectTab,
    __,
  } = useShell();

  const isVisible = showDrawer || alwaysShowStatusBar || activeTaskId || showTerminal;
  if (!isVisible) return null;

  const count = updatesCount || 0;

  return (
    <footer className="app-footer h-7 shrink-0 flex items-center justify-between border-t border-border bg-card text-xs font-sans text-muted-foreground select-none overflow-hidden transition-opacity duration-150">
      {/* Left: Status state (Task running, updates available clickable, or up-to-date) */}
      <div className="h-full flex items-center min-w-0 mr-2 select-none">
        {activeTaskId ? (
          <div className="h-full flex items-center gap-2 px-2.5 min-w-0">
            <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
            <span className="truncate font-mono text-xs text-foreground/80">{drawerTitle || __('Working...')}</span>

            {/* Live download percentage progress bar */}
            {taskProgressPercent !== null && (
              <div className="w-16 h-1.5 rounded-full bg-muted/80 overflow-hidden shrink-0 hidden sm:block">
                <div
                  className="h-full bg-primary transition-all duration-150 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, taskProgressPercent))}%` }}
                />
              </div>
            )}
          </div>
        ) : count > 0 ? (
          <button
            onClick={() => selectTab('updates')}
            className="h-full flex items-center gap-1.5 px-2.5 text-xs font-mono text-muted-foreground hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15 cursor-default transition-colors"
            title={count === 1 ? __('1 update available') : __('%d updates available').replace('%d', count)}
          >
            <RefreshCw className="size-4 shrink-0" />
            <span className="font-mono">{count}</span>
          </button>
        ) : (
          <div className="h-full flex items-center gap-1.5 px-2.5 text-muted-foreground">
            <Check className="size-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono">{__('Up to date')}</span>
          </div>
        )}
      </div>

      {/* Right: Actions (VS Code flat full-height style with hover states) */}
      <div className="h-full flex items-center shrink-0">
        {activeTaskId && (
          <button
            onClick={cancelAction}
            className="h-full px-2.5 flex items-center text-destructive hover:bg-destructive/10 active:bg-destructive/20 cursor-default transition-colors"
            title={__('Cancel')}
          >
            <SquareX className="size-4 shrink-0 text-destructive" />
          </button>
        )}

        <button
          onClick={toggleTerminal}
          className={`h-full px-2.5 flex items-center gap-1.5 cursor-default transition-colors ${showTerminal
            ? 'bg-foreground/10 text-foreground font-medium'
            : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15'
            }`}
          title={showTerminal ? "Hide Terminal" : "Show Terminal"}
        >
          <Terminal className="size-4" />
        </button>
      </div>
    </footer>
  );
}
