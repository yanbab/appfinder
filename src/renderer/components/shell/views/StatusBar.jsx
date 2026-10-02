import React from 'react';
import { useShell } from '@/hooks/useShell';
import { ShellButton, ShellIcon } from '@/components/shell/components';
import { Loader2 } from 'lucide-react';

export function StatusBar() {
  const {
    activeTaskId,
    drawerTitle,
    taskProgressPercent,
    cancelAction,
    showTerminal,
    toggleTerminal,
    showDrawer,
    alwaysShowStatusBar,
  } = useShell();

  // If there's no active task, no drawer title, and alwaysShowStatusBar is false, and drawer is hidden
  const isVisible = showDrawer || alwaysShowStatusBar || activeTaskId || showTerminal;
  if (!isVisible) return null;

  return (
    <footer className="app-footer h-7 shrink-0 flex items-center justify-between border-t border-border bg-card text-xs font-sans text-muted-foreground select-none overflow-hidden transition-opacity duration-150">
      {/* Left: Status message or running task indicator with live download progress */}
      <div className="h-full flex items-center gap-2 px-2.5 min-w-0 mr-2 select-none">
        {activeTaskId && (
          <>
            <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
            {drawerTitle && (
              <span className="truncate font-mono text-xs text-foreground/80">{drawerTitle}</span>
            )}

            {/* Live download percentage progress bar */}
            {taskProgressPercent !== null && (
              <div className="w-16 h-1.5 rounded-full bg-muted/80 overflow-hidden shrink-0 hidden sm:block">
                <div
                  className="h-full bg-primary transition-all duration-150 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, taskProgressPercent))}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>


      {/* Right: Actions */}
      <div className="h-full flex items-center shrink-0">
        {activeTaskId && (
          <ShellButton
            icon={<ShellIcon name="stop.circle" className="size-[18px] shrink-0 text-destructive" />}
            title="Cancel"
            onClick={cancelAction}
            className="h-full w-auto px-2.5 rounded-none text-destructive hover:bg-foreground/5 active:bg-foreground/10"
          />
        )}

        <ShellButton
          icon={<ShellIcon name="chevron.left.forwardslash.chevron.right" className="size-[18px] shrink-0" />}
          title={showTerminal ? "Hide Terminal" : "Show Terminal"}
          active={showTerminal}
          onClick={toggleTerminal}
          className="h-full w-auto px-2.5 rounded-none hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10 active:text-foreground"
        />
      </div>
    </footer>
  );
}
