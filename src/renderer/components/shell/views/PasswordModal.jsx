import React, { useState, useEffect, useRef } from 'react';
import { useShell } from '@/hooks/useShell';
import { ShellButton, ShellIcon } from '@/components/shell/components';
import { Input } from '@/components/ui/input';
import { AppIcon } from '@/components/shell/components/AppIcon';

import { getAppName } from '@/hooks/utils';

export function PasswordModal() {
  const {
    showPasswordModal,
    submitPassword,
    cancelPassword,
    activeTaskToken,
    activeTaskAction,
    items,
    __,
  } = useShell();

  const [password, setPassword] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (showPasswordModal) {
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 50);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancelPassword();
      }}
    >
      <div className="w-80 rounded-2xl border border-border bg-card p-5 shadow-2xl text-card-foreground select-none animate-in zoom-in-95 duration-150">
        <div className="flex flex-col items-center text-center">
          {cask ? (
            <AppIcon item={cask} size="lg" className="rounded-xl shadow-xs mb-3" />
          ) : (
            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <ShellIcon name="lock" className="size-6" />
            </div>
          )}

          <h3 className="font-semibold text-xs text-foreground mb-1 leading-snug">
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            {__('Type your password to allow this action.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={__('Password')}
            className="text-xs h-8 text-center"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <ShellButton
              type="button"
              variant="secondary"
              onClick={cancelPassword}
            >
              {__('Cancel')}
            </ShellButton>
            <ShellButton type="submit" variant="default">
              OK
            </ShellButton>
          </div>
        </form>
      </div>
    </div>
  );
}
