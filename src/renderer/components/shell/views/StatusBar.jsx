import React from 'react';
import { useShell } from '@/hooks/useShell';
import { ShellButton, ShellIcon } from '@/components/shell/components';
import { Check, Loader2 } from 'lucide-react';


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
    <footer className="app-footer h-7 shrink-0 flex items-center justify-between border-t border-border bg-card text-xs font-sans text-muted-foreground select-none overflow-hidden transition-opacity duration-150">
      {/* Left: Status message or running task indicator with live download progress */}
      <div className="h-full flex items-center gap-2 px-2.5 min-w-0 mr-2 select-none">
        {activeTaskId ? (
          <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
        ) : (
          <>{/*<Check className="size-3.5 text-muted-foreground shrink-0" />*/}</>
        )}
        <span className="truncate font-mono text-xs text-foreground/80">{/*getStatusText()*/}</span>

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
