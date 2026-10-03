import React from 'react';
import { useShell } from '@/hooks/useShell';
import { ShellButton, ShellIcon } from '@/components/shell/components';
import { Loader2 } from 'lucide-react';

export function StatusBar() {
  const {
    activeTaskId,
    drawerTitle,
    cancelAction,
    showTerminal,
    toggleTerminal,
    showDrawer,
    alwaysShowStatusBar,
  } = useShell();

  // If there's no active task and alwaysShowStatusBar is false, and drawer is hidden
  const isVisible = showDrawer || alwaysShowStatusBar || activeTaskId || showTerminal;
  if (!isVisible) return null;

  return (
    <footer className="app-footer h-7 shrink-0 flex items-center justify-between border-t border-border bg-card text-xs font-sans text-muted-foreground select-none overflow-hidden transition-opacity duration-150 px-2">
      {/* Left: Status message or running task indicator with live download progress */}
      <div className="h-full flex items-center gap-2 min-w-0 mr-2 select-none">
        {activeTaskId && (
          <>
            <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
            {drawerTitle && (
              <span className="overflow-hidden text-ellipsis whitespace-pre text-[11px] font-mono text-foreground/80">{drawerTitle}</span>
            )}
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {activeTaskId && (
          <ShellButton
            size="icon-xs"
            icon={<ShellIcon name="stop.circle" className="size-4 shrink-0 text-destructive" />}
            title="Cancel"
            onClick={cancelAction}
          />
        )}

        <ShellButton
          size="icon-xs"
          icon={<ShellIcon name={showTerminal ? "apple.terminal.fill" : "apple.terminal"} className="size-4 shrink-0" />}
          title={showTerminal ? "Hide Terminal" : "Show Terminal"}
          active={showTerminal}
          onClick={toggleTerminal}
        />
      </div>
    </footer>
  );
}
