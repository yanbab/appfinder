import React, { useState, useEffect, useRef } from 'react';
import { useTermStore, useShellStore, useAppStore } from '@/stores';
import { ShellButton, ShellIcon } from '@/components/shell/components';
import { Input } from '@/components/ui/input';
import { getAppName } from '@/hooks/utils';

export function PasswordModal() {
  const showPasswordModal = useTermStore((s) => s.showPasswordModal);
  const submitPassword = useTermStore((s) => s.submitPassword);
  const cancelPassword = useTermStore((s) => s.cancelPassword);
  const activeTaskToken = useTermStore((s) => s.activeTaskToken);
  const activeTaskAction = useTermStore((s) => s.activeTaskAction);

  const items = useAppStore((s) => s.items);
  const __ = useShellStore((s) => s.__);

  const [password, setPassword] = useState('');
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showPasswordModal) {
      previousActiveElementRef.current = document.activeElement;
      setPassword('');
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch (_) {
          dialog.setAttribute('open', '');
        }
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      if (dialog.open) {
        dialog.close();
      }
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    }
  }, [showPasswordModal]);

  if (!showPasswordModal) return null;

  const cask = items.find((c) => c.token === activeTaskToken);
  const name = cask ? getAppName(cask) : activeTaskToken || 'Homebrew';

  const title = activeTaskAction === 'uninstall'
    ? __('%s removal requires your password').replace('%s', name)
    : __('%s installation requires your password').replace('%s', name);

  const handleSubmit = (e) => {
    e.preventDefault();
    submitPassword(password);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelPassword();
      return;
    }

    // Strict Tab & Shift+Tab focus trap inside modal
    if (e.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll('input, button:not([disabled])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
      aria-describedby="password-modal-desc"
      onCancel={(e) => {
        e.preventDefault();
        cancelPassword();
      }}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[100] m-auto flex items-center justify-center bg-black/40 backdrop:bg-black/40 border-0 p-0 outline-none select-none w-screen h-screen animate-in fade-in duration-150"
    >
      <div className="w-[280px] max-w-[280px] rounded-2xl border border-border bg-card p-4.5 shadow-2xl text-card-foreground select-none animate-in zoom-in-95 duration-150">
        <div className="flex flex-col items-center text-center">
          {/* AppFinder App icon with lock emblem in the bottom-right corner */}
          <div className="relative mb-3 flex items-center justify-center">
            <ShellIcon name="appfinder" className="size-16 drop-shadow-xs" />
            <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-secondary dark:bg-[#18181b] border border-black/10 dark:border-white/15 shadow-sm flex items-center justify-center text-foreground">
              <ShellIcon name="lock" className="size-3.5 text-foreground" />
            </div>
          </div>

          <h3 id="password-modal-title" className="font-semibold text-xs text-foreground mb-1 leading-snug">
            {title}
          </h3>
          <p id="password-modal-desc" className="text-[11px] text-muted-foreground mb-3.5">
            {__('Type your password to allow this action.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={__('Password')}
            aria-label={__('Password')}
            className="h-7 text-xs text-left px-2.5 bg-black/[0.06] dark:bg-white/[0.08] focus:bg-black/[0.09] dark:focus:bg-white/[0.12] border-0 border-none shadow-none rounded-[var(--radius-btn)] placeholder:text-muted-foreground/70"
          />

          <div className="flex items-center gap-2 pt-1 w-full">
            <ShellButton
              type="button"
              variant="secondary"
              onClick={cancelPassword}
              className="flex-1 w-1/2 justify-center"
            >
              {__('Cancel')}
            </ShellButton>
            <ShellButton
              type="submit"
              variant="default"
              className="flex-1 w-1/2 justify-center"
            >
              OK
            </ShellButton>
          </div>
        </form>
      </div>
    </dialog>
  );
}
