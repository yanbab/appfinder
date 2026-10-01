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
  getCaskRequirements,
  isRequirementMet,
} from '@/hooks/utils';
import { X, ExternalLink, AlertTriangle, Check, Loader2, ArrowDown, RefreshCw } from 'lucide-react';

export function InfoPanel() {
  const {
    selectedApp,
    closeAppInfo,
    appDetails,
    loadingAppDetails,
    loadingSizes,
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
        <DrawerContent className="w-[280px]" />
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

  const reqText = getCaskRequirements(appDetails);
  const reqMet = isRequirementMet(appDetails);

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

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAppInfo();
      }}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent className="w-[280px] max-w-[280px] h-full bg-background border-l border-border select-none flex flex-col outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
        {/* Header with Close Button on the Left */}
        <div className="app-header h-11 shrink-0 px-3 border-b border-border flex items-center justify-between select-none [-webkit-app-region:drag]">
          <div className="flex items-center gap-2 min-w-0 flex-1 h-full [-webkit-app-region:drag]">
            <ShellButton
              icon={<X className="size-[18px]" />}
              onClick={closeAppInfo}
              className="rounded-sm shrink-0 [-webkit-app-region:no-drag]"
              title="Close"
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
              {latestVersion && (
                <div className="text-xs text-muted-foreground font-normal">
                  {__('Version')} {formatVersion(latestVersion)}
                </div>
              )}
            </div>
          </div>

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

                {!isInstalled && (
                  <ShellButton
                    className="w-full"
                    variant="default"
                    onClick={() => startAction('install', selectedApp.token)}
                  >
                    {__('Install')}
                  </ShellButton>
                )}
              </>
            )}
          </div>

          {/* Metadata Section in Card */}
          <div className="border border-[var(--card-border)] rounded-[var(--radius-card)] p-2 bg-card shadow-2xs text-xs space-y-1.5">
            {/* Homepage */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Homepage')}</span>
              {selectedApp.homepage ? (
                <button
                  onClick={() => window.ipc?.openExternal?.(selectedApp.homepage)}
                  className="text-primary active:underline flex items-center gap-1 max-w-[150px] truncate cursor-default"
                >
                  <ExternalLink className="size-3 shrink-0" />
                  <span className="truncate">{selectedApp.homepage.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                </button>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </div>

            {/* Token */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Token')}</span>
              <span className="text-foreground select-text truncate max-w-[150px]">{selectedApp.token}</span>
            </div>

            {/* Categories */}
            {appCategories.length > 0 && (
              <div className="flex items-start justify-between py-0.5 gap-2">
                <span className="text-muted-foreground">{appCategories.length > 1 ? __('Categories') : __('Category')}</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[160px]">
                  {appCategories.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-muted text-xs text-foreground font-medium"
                    >
                      <ShellIcon name={c.symbolName} className="size-[14px]" />
                      <span>{__(c.displayName)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Require */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Require', 'Require')}</span>
              {loadingAppDetails ? (
                <span className="text-muted-foreground font-mono">...</span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-muted text-xs text-foreground font-medium">
                  {reqMet ? (
                    <Check className="size-[14px] text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-[14px] text-amber-500 shrink-0" />
                  )}
                  <span>{reqText || 'macOS'}</span>
                </span>
              )}
            </div>

            {/* Auto-updates */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Auto-updates')}</span>
              <span className="text-foreground">
                {loadingAppDetails ? '...' : (appDetails ? (appDetails.auto_updates ? __('Yes') : __('No')) : '—')}
              </span>
            </div>

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
          </div>

          {/* Storage & Usage Section in Card */}
          <div className="border border-[var(--card-border)] rounded-[var(--radius-card)] p-2 bg-card shadow-2xs text-xs space-y-1.5">
            {isInstalled && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">{__('Installed Version')}</span>
                <div className="flex items-center gap-1 text-foreground">
                  {isOutdated ? (
                    <RefreshCw className="size-3 text-amber-500 shrink-0" />
                  ) : (
                    <Check className="size-3 text-emerald-500 shrink-0" />
                  )}
                  <span>{formatVersion(installedVersion)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Download Size')}</span>
              <span className="text-foreground">
                {loadingSizes ? '...' : (appDetails?.downloadSize || '—')}
              </span>
            </div>

            {isInstalled && (
              <>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">{__('Installed Size')}</span>
                  <span className="text-foreground">
                    {loadingSizes ? '...' : (appDetails?.installedSize || '—')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">{__('Data Size')}</span>
                  <span className="text-foreground">
                    {loadingSizes ? '...' : (appDetails?.dataSize || '—')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">{__('Installed')}</span>
                  <span className="text-foreground">
                    {loadingAppDetails ? '...' : (appDetails?.installedDate ? formatDate(appDetails.installedDate, __) : '—')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">{__('Last Opened')}</span>
                  <span className="text-foreground">
                    {loadingAppDetails ? '...' : (appDetails?.lastOpenedDate ? formatDate(appDetails.lastOpenedDate, __) : '—')}
                  </span>
                </div>
              </>
            )}
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
