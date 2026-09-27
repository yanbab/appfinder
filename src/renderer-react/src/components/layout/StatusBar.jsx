import React from 'react';
import { useShell } from '@/store/useShell';
import { Button } from '@/components/ui/button';
import { Check, Loader2, X, Terminal as TerminalIcon, ChevronUp, ChevronDown } from 'lucide-react';

export function StatusBar() {
  const {
    activeTaskId,
    drawerTitle,
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
    <footer className="h-7 shrink-0 flex items-center justify-between px-3 border-t border-border bg-card/60 backdrop-blur-xs text-[11px] text-muted-foreground select-none">
      {/* Left: Status message or running task indicator */}
      <div className="flex items-center gap-2 min-w-0">
        {activeTaskId ? (
          <Loader2 className="size-3 text-primary animate-spin shrink-0" />
        ) : (
          <Check className="size-3 text-muted-foreground shrink-0" />
        )}
        <span className="truncate">{getStatusText()}</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {activeTaskId && (
          <Button
            size="xs"
            variant="ghost"
            onClick={cancelAction}
            className="h-5 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
          >
            <X className="size-2.5 mr-1" />
            <span>{__('Cancel')}</span>
          </Button>
        )}

        <Button
          size="icon-xs"
          variant="ghost"
          onClick={toggleTerminal}
          className="size-5 text-muted-foreground hover:text-foreground"
          title={showTerminal ? "Hide Terminal" : "Show Terminal"}
        >
          <TerminalIcon className="size-2.5" />
          {showTerminal ? <ChevronDown className="size-2 ml-0.5" /> : <ChevronUp className="size-2 ml-0.5" />}
        </Button>
      </div>
    </footer>
  );
}
