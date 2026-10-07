import React from 'react';
import { useShell } from '@/hooks/useShell';
import { AppIcon, ShellButton, ShellIcon } from '@/components/shell/components';

import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  getAppName,
  formatVersion,
  formatCountK,
  formatDate,
  formatReason,
} from '@/hooks/utils';
import { X, ExternalLink, AlertTriangle, AlertOctagon, Info, Check, Loader2, ArrowDown } from 'lucide-react';

export function InfoPanel() {
  const {
    selectedApp,
    closeAppInfo,
    openAppInfo,
    items,
    appDetails,
    loadingAppDetails,
    installed,
    installedVersions,
    outdatedMap,
    runningTasks,
    categories,
    startAction,
    __,
  } = useShell();

  const isOpen = Boolean(selectedApp);

  if (!selectedApp) {
    return (
      <Drawer open={false} onOpenChange={() => { }} direction="right">
        <DrawerContent className="w-[260px]" />
      </Drawer>
    );
  }

  const isRunning = Boolean(runningTasks[selectedApp.token]);
  const isInstalled = installed.includes(selectedApp.token);
  const isOutdated = Boolean(outdatedMap[selectedApp.token]);

  const name = getAppName(selectedApp);

  const latestVersion =
    outdatedMap[selectedApp.token]?.currentVersion ||
    appDetails?.version ||
    selectedApp.version ||
    '';

  const installedVersion =
    outdatedMap[selectedApp.token]?.installedVersion ||
    installedVersions[selectedApp.token] ||
    (typeof appDetails?.installed === 'string' ? appDetails.installed : appDetails?.installed?.[0]?.version) ||
    (isInstalled ? latestVersion : '');

  const reqText = appDetails?.reqText || null;
  const reqMet = appDetails?.reqMet !== false;
  const archCompat = appDetails?.archCompat || { status: 'universal', label: 'Universal' };
  const depCasks = appDetails?.dependencies?.casks || [];
  const depFormulae = appDetails?.dependencies?.formulae || [];
  const caskStatus = appDetails?.status || { isDisabled: false, isDeprecated: false };

  // App categories
  const appCategories = (() => {
    const raw = [
      selectedApp.category,
      selectedApp.secondCategory,
      selectedApp.thirdCategory,
      selectedApp.secondaryCategory,
      ...(selectedApp.categories || []),
    ].filter(Boolean);

    const unique = Array.from(new Set(raw));
    return unique
      .map((name) => categories.find((c) => c.name.toLowerCase() === String(name).toLowerCase()))
      .filter(Boolean);
  })();

  const panelRef = React.useRef(null);
  const previousActiveElementRef = React.useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      // Focus close button or panel on open
      setTimeout(() => {
        const firstFocusable = panelRef.current?.querySelector('button, a, [tabindex]:not([tabindex="-1"])');
        firstFocusable?.focus?.();
      }, 50);
    } else if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAppInfo();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = panelRef.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])');
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
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAppInfo();
      }}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={name || __('Infos')}
        onKeyDown={handleKeyDown}
        className="w-[260px] max-w-[260px] h-full bg-background border-l border-border select-none flex flex-col outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
        {/* Header with Close Button on the Left */}
        <div className="app-header h-[52px] shrink-0 px-3 border-b border-border flex items-center justify-between select-none [-webkit-app-region:drag]">
          <div className="flex items-center gap-2 min-w-0 flex-1 h-full [-webkit-app-region:drag]">
            <ShellButton
              icon={<X className="size-[18px]" />}
              onClick={closeAppInfo}
              className="rounded-sm shrink-0 [-webkit-app-region:no-drag]"
              title={__('Close')}
              aria-label={__('Close')}
            />
            <DrawerTitle className="text-sm font-semibold text-foreground truncate cursor-default select-none [-webkit-app-region:drag]">
              {__('Infos')}
            </DrawerTitle>
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
                <DrawerDescription className="text-xs text-foreground leading-relaxed line-clamp-3">
                  {selectedApp.desc}
                </DrawerDescription>
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

          {/* Cask Status Alert (Disabled / Deprecated) */}
          {caskStatus.isDisabled && (
            <div className="p-2.5 rounded-[var(--radius-card)] border border-destructive/40 bg-destructive/10 text-destructive space-y-1 overflow-hidden">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-destructive">
                <AlertOctagon className="size-3.5 shrink-0" />
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
                    onClick={() => openAppInfo(caskStatus.disableReplacement)}
                    className="text-primary hover:underline font-medium cursor-default"
                  >
                    {caskStatus.disableReplacement}
                  </button>
                </div>
              )}
            </div>
          )}

          {!caskStatus.isDisabled && caskStatus.isDeprecated && (
            <div className="p-2.5 rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 space-y-1 overflow-hidden">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <AlertTriangle className="size-3.5 shrink-0" />
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
                    onClick={() => openAppInfo(caskStatus.deprecationReplacement)}
                    className="text-primary hover:underline font-medium cursor-default"
                  >
                    {caskStatus.deprecationReplacement}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Primary Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            {isRunning ? (
              <ShellButton className="w-full gap-2" variant="secondary" disabled icon={<Loader2 className="size-3.5 animate-spin" />}>
                {__('Working...')}
              </ShellButton>
            ) : (
              <>
                {isOutdated && (
                  <ShellButton
                    className="flex-1"
                    variant="secondary"
                    onClick={() => startAction('upgrade', selectedApp.token)}
                  >
                    {__('Upgrade')}
                  </ShellButton>
                )}

                {isInstalled && selectedApp.app && !isOutdated && (
                  <ShellButton
                    className="flex-1"
                    variant="secondary"
                    onClick={() => startAction('open', selectedApp.token, selectedApp.app)}
                  >
                    {__('Open')}
                  </ShellButton>
                )}

                {isInstalled && (
                  <ShellButton
                    variant="destructive"
                    className="flex-1"
                    onClick={() => startAction('uninstall', selectedApp.token)}
                  >
                    {__('Delete')}
                  </ShellButton>
                )}

                {!isInstalled && caskStatus.isDisabled ? (
                  <ShellButton
                    className="w-full opacity-60 cursor-not-allowed"
                    variant="secondary"
                    disabled
                    title={formatReason(caskStatus.disableReason, __) || __('Cask Disabled')}
                  >
                    {__('Disabled')}
                  </ShellButton>
                ) : !isInstalled ? (
                  <ShellButton
                    className="w-full"
                    variant="default"
                    onClick={() => startAction('install', selectedApp.token)}
                  >
                    {__('Install')}
                  </ShellButton>
                ) : null}
              </>
            )}
          </div>

          {/* Metadata Section in Card */}
          <div className="rounded-[var(--radius-card)] p-2 bg-card shadow-2xs text-xs space-y-1.5">
            {/* Homepage */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Homepage')}</span>
              {selectedApp.homepage ? (
                <button
                  onClick={() => window.ipc?.openExternal?.(selectedApp.homepage)}
                  className="text-primary hover:underline flex items-center gap-1 max-w-[150px] truncate cursor-default"
                >
                  <ExternalLink className="size-3 shrink-0" />
                  <span className="truncate">{selectedApp.homepage.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                </button>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </div>

            {/* Categories (Under link, clean styling without badge background) */}
            {appCategories.length > 0 && (
              <div className="flex items-start justify-between py-0.5 gap-2">
                <span className="text-muted-foreground shrink-0">{appCategories.length > 1 ? __('Categories') : __('Category')}</span>
                <div className="flex flex-wrap gap-1.5 justify-end max-w-[160px]">
                  {appCategories.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-1 text-xs text-foreground font-medium"
                    >
                      <ShellIcon name={c.symbolName} className="size-[14px] text-muted-foreground" />
                      <span>{__(c.displayName)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Token */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Token')}</span>
              <span className="text-foreground select-text truncate max-w-[150px]">{selectedApp.token}</span>
            </div>

            {/* Dependencies (No badge background) */}
            {(depCasks.length > 0 || depFormulae.length > 0) && (
              <div className="flex items-start justify-between py-0.5 gap-2">
                <span className="text-muted-foreground shrink-0">{__('Dependencies')}</span>
                <div className="flex flex-wrap gap-1.5 justify-end max-w-[160px]">
                  {depCasks.map((depToken) => {
                    const depApp = items.find((c) => c.token === depToken);
                    const depName = depApp ? getAppName(depApp) : depToken;
                    const isDepInstalled = installed.includes(depToken);
                    return (
                      <button
                        key={depToken}
                        onClick={() => openAppInfo(depToken)}
                        className="inline-flex items-center gap-1 text-xs text-foreground hover:underline transition-colors cursor-default"
                        title={`${depName} (${isDepInstalled ? __('Installed') : __('Platform', 'Platform')})`}
                      >
                        {isDepInstalled ? (
                          <Check className="size-3 text-emerald-500 shrink-0" />
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

            {/* Monthly Installs */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Monthly Installs')}</span>
              <div className="flex items-center gap-1 text-foreground">
                <ArrowDown className="size-3 text-current shrink-0" />
                <span>{formatCountK(selectedApp.count)}</span>
              </div>
            </div>

            {/* Added */}
            {selectedApp.added && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">{__('Added')}</span>
                <span className="text-foreground">{formatDate(selectedApp.added, __)}</span>
              </div>
            )}

            {/* Platform (At the bottom) */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Platform', 'Platform')}</span>
              {loadingAppDetails ? (
                <span className="text-muted-foreground text-xs font-normal">…</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium">
                  {reqMet ? (
                    <Check className="size-[14px] text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-[14px] text-amber-500 shrink-0" />
                  )}
                  <span>{reqText || 'macOS'}</span>
                </span>
              )}
            </div>

            {/* Architecture (At the bottom) */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Architecture')}</span>
              {loadingAppDetails ? (
                <span className="text-muted-foreground text-xs font-normal">…</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium">
                  {archCompat.status === 'incompatible' ? (
                    <AlertTriangle className="size-[14px] text-destructive shrink-0" />
                  ) : archCompat.status === 'rosetta' ? (
                    <Info className="size-[14px] text-blue-500 shrink-0" />
                  ) : (
                    <Check className="size-[14px] text-emerald-500 shrink-0" />
                  )}
                  <span>{__(archCompat.label)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Caveat Notice */}
          {appDetails?.caveats && (
            <div className="p-2 rounded-[var(--radius-card)] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 space-y-1 overflow-hidden">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>{__('Caveat')}</span>
              </div>
              <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-hidden text-foreground">
                {appDetails.caveats}
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Backward-compatible alias
export const InfoDrawer = InfoPanel;
