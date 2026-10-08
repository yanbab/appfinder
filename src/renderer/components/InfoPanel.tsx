import React, { useRef, useEffect, useMemo } from 'react';
import { useShellStore, useAppStore } from '@/stores';
import { AppIcon } from './AppIcon';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';
import { AppButtons } from './AppButtons';
import { Card } from './Card';
import {
  getAppName,
  formatVersion,
  formatCountK,
  formatDate,
  formatReason,
} from '@/hooks/utils';
import type { CaskItem } from '@/types';

export function InfoPanel() {
  const selectedApp = useShellStore((s) => s.selectedApp);
  const appDetails = useShellStore((s) => s.appDetails);
  const loadingAppDetails = useShellStore((s) => s.loadingAppDetails);
  const closeAppInfo = useShellStore((s) => s.closeAppInfo);
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const __ = useShellStore((s) => s.__);

  const items = useAppStore((s) => s.items);
  const installed = useAppStore((s) => s.installed);
  const installedVersions = useAppStore((s) => s.installedVersions);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const categories = useAppStore((s) => s.categories);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const isOpen = Boolean(selectedApp);

  // Steal focus on open & restore previous focus on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      // Focus the dialog container itself
      const focusTimer = setTimeout(() => {
        dialogRef.current?.focus();
      }, 30);
      return () => clearTimeout(focusTimer);
    } else if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen, selectedApp?.token]);

  // Global Escape key listener to close panel
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeAppInfo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isOpen, closeAppInfo]);

  // Click / pointerdown outside panel listener to close panel
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the info panel dialog
      if (dialogRef.current && dialogRef.current.contains(target)) {
        return;
      }

      closeAppInfo();
    };

    // Small timeout ensures the opening click event doesn't immediately trigger close
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handlePointerDownOutside, true);
      window.addEventListener('touchstart', handlePointerDownOutside, true);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handlePointerDownOutside, true);
      window.removeEventListener('touchstart', handlePointerDownOutside, true);
    };
  }, [isOpen, closeAppInfo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAppInfo();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
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

  const isInstalled = selectedApp ? installed.includes(selectedApp.token) : false;
  const isOutdated = selectedApp ? Boolean(outdatedMap[selectedApp.token]) : false;

  const name = selectedApp ? getAppName(selectedApp) : '';

  const latestVersion = useMemo(() => {
    if (!selectedApp) return '';
    return (
      outdatedMap[selectedApp.token]?.currentVersion ||
      appDetails?.version ||
      selectedApp.version ||
      ''
    );
  }, [selectedApp, outdatedMap, appDetails?.version]);

  const installedVersion = useMemo(() => {
    if (!selectedApp) return '';
    return (
      outdatedMap[selectedApp.token]?.installedVersion ||
      installedVersions[selectedApp.token] ||
      (typeof appDetails?.installed === 'string' ? appDetails.installed : appDetails?.installed?.[0]?.version) ||
      (isInstalled ? latestVersion : '')
    );
  }, [selectedApp, outdatedMap, installedVersions, appDetails?.installed, isInstalled, latestVersion]);

  const reqText = appDetails?.reqText || null;
  const reqMet = appDetails?.reqMet !== false;
  const archCompat = appDetails?.archCompat || { status: 'universal', label: 'Universal' };
  const depCasks: string[] = appDetails?.dependencies?.casks || [];
  const depFormulae: string[] = appDetails?.dependencies?.formulae || [];
  const caskStatus = appDetails?.status || { isDisabled: false, isDeprecated: false };

  // App categories (up to 3)
  const appCategories = useMemo(() => {
    if (!selectedApp) return [];
    const raw = [
      selectedApp.category,
      selectedApp.secondCategory,
      selectedApp.thirdCategory,
      selectedApp.secondaryCategory,
      ...(selectedApp.categories || []),
      ...(appDetails?.categories || []),
    ].filter(Boolean);

    const unique = Array.from(new Set(raw.map((k) => String(k).trim())));
    return unique
      .map((catName) => {
        const found = categories.find(
          (c) => c.name.toLowerCase() === catName.toLowerCase() || (c.displayName && c.displayName.toLowerCase() === catName.toLowerCase())
        );
        return found || {
          name: catName,
          displayName: catName,
          symbolName: 'square.grid.2x2',
        };
      })
      .filter(Boolean)
      .slice(0, 3);
  }, [selectedApp, appDetails?.categories, categories]);

  if (!selectedApp) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 animate-in fade-in duration-150"
        onClick={closeAppInfo}
        aria-hidden="true"
      />

      <dialog
        ref={dialogRef}
        open={isOpen}
        tabIndex={-1}
        onCancel={(e) => {
          e.preventDefault();
          closeAppInfo();
        }}
        onKeyDown={handleKeyDown}
        aria-label={name || __('Infos')}
        className="info-panel-dialog animate-in slide-in-from-right duration-200"
        style={{ backgroundColor: 'var(--background)' }}
        data-drawer-content="true"
      >
        {/* Header with Close Button on the Left */}
        <div className="app-header h-[52px] shrink-0 px-3 border-b border-border flex items-center justify-between select-none [-webkit-app-region:drag]">
        <div className="flex items-center gap-2 min-w-0 flex-1 h-full [-webkit-app-region:drag]">
          <Button
            icon={<ShellIcon name="xmark" className="size-[18px]" />}
            onClick={closeAppInfo}
            className="rounded-sm shrink-0 !outline-none !ring-0 focus:!outline-none focus-visible:!outline-none [-webkit-app-region:no-drag]"
            style={{ outline: 'none', boxShadow: 'none' }}
            title={__('Close')}
            aria-label={__('Close')}
          />
          <h2 className="text-sm font-semibold text-foreground truncate cursor-default select-none [-webkit-app-region:drag]">
            {__('Infos')}
          </h2>
        </div>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* App Hero: Centered Icon, Name, Description before Version */}
        <div className="flex flex-col items-center text-center pt-1 pb-0.5 space-y-2">
          <AppIcon item={selectedApp} size="hero" className="size-32 rounded-[28px] shrink-0" />
          <div className="space-y-1 w-full px-1">
            <h3 className="font-bold text-base text-foreground leading-tight truncate">
              {name}
            </h3>
            {selectedApp.desc && (
              <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                {selectedApp.desc}
              </p>
            )}
            {isOutdated && installedVersion && latestVersion && installedVersion !== latestVersion ? (
              <div className="text-xs text-muted-foreground font-normal">
                {__('Version')} {formatVersion(installedVersion)} → {formatVersion(latestVersion)}
              </div>
            ) : latestVersion ? (
              <div className="text-xs text-muted-foreground font-normal">
                {__('Version')} {formatVersion(latestVersion)}
              </div>
            ) : null}
          </div>
        </div>

        {/* Primary Actions */}
        <AppButtons item={selectedApp} variant="panel" caskStatus={caskStatus} />

        {/* Metadata Section in Card */}
        <Card padding="default" className="text-xs space-y-1.5">
          {/* 1. Website / Homepage */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Homepage')}</span>
            {selectedApp.homepage ? (
              <button
                type="button"
                onClick={() => window.ipc?.openExternal?.(selectedApp.homepage!)}
                className="text-primary hover:underline flex items-center gap-1 max-w-[150px] truncate cursor-default"
              >
                <ShellIcon name="arrow.up.right.square" className="size-3 shrink-0" />
                <span className="truncate">{selectedApp.homepage.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
              </button>
            ) : (
              <span className="text-muted-foreground/60">—</span>
            )}
          </div>

          {/* 2. Categories */}
          {appCategories.length > 0 && (
            <div className="flex items-start justify-between py-0.5 gap-2">
              <span className="text-muted-foreground shrink-0">{appCategories.length > 1 ? __('Categories') : __('Category')}</span>
              <div className="flex flex-wrap gap-1.5 justify-end max-w-[160px]">
                {appCategories.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1 text-xs text-foreground font-medium"
                  >
                    <ShellIcon name={c.symbolName} className="size-[14px] text-muted-foreground shrink-0" />
                    <span className="truncate">{__(c.displayName)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. Token */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Token')}</span>
            <span className="text-foreground select-text truncate max-w-[150px]">{selectedApp.token}</span>
          </div>

          {/* 4. Added */}
          {selectedApp.added && (
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Added')}</span>
              <span className="text-foreground">{formatDate(selectedApp.added, __)}</span>
            </div>
          )}

          {/* 5. Count */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Monthly Installs')}</span>
            <div className="flex items-center gap-1 text-foreground">
              <ShellIcon name="arrow.down" className="size-3 text-muted-foreground shrink-0" />
              <span>{formatCountK(selectedApp.count)}</span>
            </div>
          </div>

          {/* 6. Platform */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Platform', 'Platform')}</span>
            {loadingAppDetails ? (
              <span className="text-muted-foreground text-xs font-normal">…</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium">
                {reqMet ? (
                  <ShellIcon name="checkmark" className="size-[14px] text-muted-foreground shrink-0" />
                ) : (
                  <ShellIcon name="exclamationmark.triangle" className="size-[14px] text-amber-500 shrink-0" />
                )}
                <span>{reqText || 'macOS'}</span>
              </span>
            )}
          </div>

          {/* 7. Architecture */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Architecture')}</span>
            {loadingAppDetails ? (
              <span className="text-muted-foreground text-xs font-normal">…</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium">
                {archCompat.status === 'incompatible' ? (
                  <ShellIcon name="exclamationmark.triangle" className="size-[14px] text-destructive shrink-0" />
                ) : archCompat.status === 'rosetta' ? (
                  <ShellIcon name="info.circle" className="size-[14px] text-blue-500 shrink-0" />
                ) : (
                  <ShellIcon name="checkmark" className="size-[14px] text-muted-foreground shrink-0" />
                )}
                <span>{__(archCompat.label)}</span>
              </span>
            )}
          </div>

          {/* 8. Dependencies */}
          {(depCasks.length > 0 || depFormulae.length > 0) && (
            <div className="flex items-start justify-between py-0.5 gap-2">
              <span className="text-muted-foreground shrink-0">{__('Dependencies')}</span>
              <div className="flex flex-wrap gap-1.5 justify-end max-w-[160px]">
                {depCasks.map((depToken) => {
                  const depApp = items.find((c: CaskItem) => c.token === depToken);
                  const depName = depApp ? getAppName(depApp) : depToken;
                  const isDepInstalled = installed.includes(depToken);
                  return (
                    <button
                      key={depToken}
                      type="button"
                      onClick={() => openAppInfo(depToken)}
                      className="inline-flex items-center gap-1 text-xs text-foreground hover:underline transition-colors cursor-default"
                      title={`${depName} (${isDepInstalled ? __('Installed') : __('Platform', 'Platform')})`}
                    >
                      {isDepInstalled ? (
                        <ShellIcon name="checkmark" className="size-3 text-muted-foreground shrink-0" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                      )}
                      <span className="truncate max-w-[110px]">{depName}</span>
                    </button>
                  );
                })}
                {depFormulae.map((form) => (
                  <span
                    key={form}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono"
                  >
                    <span>{form}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Caveats / Warnings */}
        {caskStatus.isDisabled && (
          <Card variant="error" padding="md" className="space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-destructive">
              <ShellIcon name="exclamationmark.octagon" className="size-3.5 shrink-0" />
              <span>{__('Cask Disabled')}</span>
            </div>
            {caskStatus.disableReason && (
              <p className="text-xs text-foreground/90 leading-relaxed">
                {formatReason(caskStatus.disableReason, __)}
              </p>
            )}
            {caskStatus.disableReplacement && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                <span>{__('Alternative:')}</span>
                <button
                  type="button"
                  onClick={() => openAppInfo(caskStatus.disableReplacement)}
                  className="text-primary hover:underline font-medium cursor-default"
                >
                  {caskStatus.disableReplacement}
                </button>
              </div>
            )}
          </Card>
        )}

        {!caskStatus.isDisabled && caskStatus.isDeprecated && (
          <Card variant="warning" padding="md" className="space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <ShellIcon name="exclamationmark.triangle" className="size-3.5 shrink-0" />
              <span>{__('Cask Deprecated')}</span>
            </div>
            {caskStatus.deprecationReason && (
              <p className="text-xs text-foreground/90 leading-relaxed">
                {formatReason(caskStatus.deprecationReason, __)}
              </p>
            )}
            {caskStatus.deprecationReplacement && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                <span>{__('Alternative:')}</span>
                <button
                  type="button"
                  onClick={() => openAppInfo(caskStatus.deprecationReplacement)}
                  className="text-primary hover:underline font-medium cursor-default"
                >
                  {caskStatus.deprecationReplacement}
                </button>
              </div>
            )}
          </Card>
        )}

        {appDetails?.caveats && (
          <Card variant="warning" padding="default" className="space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <ShellIcon name="exclamationmark.triangle" className="size-3.5 shrink-0" />
              <span>{__('Caveat')}</span>
            </div>
            <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-hidden text-foreground">
              {appDetails.caveats}
            </p>
          </Card>
        )}
      </div>
    </dialog>
  </>
);
}

export default InfoPanel;
