import React from 'react';
import { useShell } from '@/store/useShell';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/button';
import { CategoryIcon, UpgradeIcon, OpenIcon, InstallIcon, TrashIcon } from '@/components/ui/icons';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  getAppName,
  formatVersion,
  formatCountK,
  formatDate,
  getCaskRequirements,
  isRequirementMet,
} from '@/lib/utils';
import { X, ExternalLink, AlertTriangle, Check, Loader2, ArrowDown } from 'lucide-react';

export function InfoDrawer() {
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
      <Drawer open={false} onOpenChange={() => {}} direction="right">
        <DrawerContent className="w-[280px]" />
      </Drawer>
    );
  }

  const isRunning = Boolean(runningTasks[selectedApp.token]);
  const isInstalled = installed.includes(selectedApp.token);
  const isOutdated = Boolean(outdatedMap[selectedApp.token]);

  const name = getAppName(selectedApp);

  const getInfoVersion = () => {
    if (outdatedMap[selectedApp.token]) {
      return outdatedMap[selectedApp.token].installedVersion || installedVersions[selectedApp.token] || appDetails?.installed || '';
    }
    if (installedVersions[selectedApp.token]) {
      return installedVersions[selectedApp.token];
    }
    if (appDetails?.version) {
      return appDetails.version;
    }
    if (selectedApp.version) {
      return selectedApp.version;
    }
    return '';
  };

  const version = getInfoVersion();
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
      <DrawerContent className="w-[280px] max-w-[280px] h-full bg-card border-l border-border select-none flex flex-col focus:outline-none">
        {/* Header with Close Button on the Left */}
        <div className="h-11 shrink-0 px-3 border-b border-border flex items-center justify-between bg-card [-webkit-app-region:drag]">
          <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={closeAppInfo}
              className="text-muted-foreground hover:text-foreground cursor-default rounded-sm"
              title="Close"
            >
              <X className="size-4" />
            </Button>
            <DrawerTitle className="text-sm font-semibold text-foreground">
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
              {version && (
                <div className="text-[11px] text-muted-foreground font-normal">
                  {__('Version')} {formatVersion(version)}
                </div>
              )}
            </div>
          </div>

          {/* Primary Actions (Equal size when multiple, no icons) */}
          <div className="flex items-center gap-2 pt-0.5">
            {isRunning ? (
              <Button className="w-full gap-2 text-xs h-7 rounded-sm" variant="secondary" disabled>
                <Loader2 className="size-3.5 animate-spin" />
                <span>{__('Working...')}</span>
              </Button>
            ) : (
              <>
                {isOutdated && (
                  <Button
                    className="flex-1 text-xs h-7 rounded-sm"
                    variant="secondary"
                    onClick={() => startAction('upgrade', selectedApp.token)}
                  >
                    <span>{__('Upgrade')}</span>
                  </Button>
                )}

                {isInstalled && selectedApp.app && !isOutdated && (
                  <Button
                    className="flex-1 text-xs h-7 rounded-sm"
                    variant="secondary"
                    onClick={() => startAction('open', selectedApp.token, selectedApp.app)}
                  >
                    <span>{__('Open')}</span>
                  </Button>
                )}

                {isInstalled && (
                  <Button
                    variant="destructive"
                    className="flex-1 text-xs h-7 rounded-sm"
                    onClick={() => startAction('uninstall', selectedApp.token)}
                  >
                    <span>{__('Delete')}</span>
                  </Button>
                )}

                {!isInstalled && (
                  <Button
                    className="w-full text-xs h-7 rounded-sm"
                    variant="default"
                    onClick={() => startAction('install', selectedApp.token)}
                  >
                    <span>{__('Install')}</span>
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Caveats Notice */}
          {appDetails?.caveats && (
            <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>{__('Caveats')}</span>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-foreground">
                {appDetails.caveats}
              </p>
            </div>
          )}

          {/* Metadata Section in Card: No border between lines, compact padding */}
          <div className="border border-border rounded-lg p-2.5 bg-card/60 shadow-2xs text-xs space-y-1.5">
            {/* Homepage */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Homepage')}</span>
              {selectedApp.homepage ? (
                <button
                  onClick={() => window.ipc?.openExternal?.(selectedApp.homepage)}
                  className="text-primary hover:underline flex items-center gap-1 max-w-[150px] truncate cursor-default"
                >
                  <span className="truncate">{selectedApp.homepage.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </button>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </div>

            {/* Token */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Token')}</span>
              <span className="font-mono text-foreground select-text truncate max-w-[150px]">{selectedApp.token}</span>
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
                      <CategoryIcon html={c.icon} className="size-[14px]" />
                      <span>{__(c.displayName)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Require */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Require', 'Require')}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-muted text-xs text-foreground font-medium">
                {reqMet ? (
                  <Check className="size-3 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="size-3 text-amber-500 shrink-0" />
                )}
                <span>{loadingAppDetails ? '...' : (reqText || 'macOS')}</span>
              </span>
            </div>

            {/* Latest Version */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Latest Version')}</span>
              <span className="font-mono text-foreground">
                {formatVersion(outdatedMap[selectedApp.token]?.currentVersion || appDetails?.version || selectedApp.version)}
              </span>
            </div>

            {/* Monthly Installs */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Monthly Installs')}</span>
              <div className="flex items-center gap-1 text-foreground">
                <ArrowDown className="size-3 text-muted-foreground shrink-0" />
                <span>{formatCountK(selectedApp.count)}</span>
              </div>
            </div>

            {/* Added */}
            {selectedApp.added && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">{__('Added')}</span>
                <span className="text-foreground">{formatDate(selectedApp.added)}</span>
              </div>
            )}
          </div>

          {/* Storage & Usage Section in Card: No border between lines, compact padding */}
          <div className="border border-border rounded-lg p-2.5 bg-card/60 shadow-2xs text-xs space-y-1.5">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Download Size')}</span>
              <span className="text-foreground font-mono">
                {loadingSizes ? '...' : (appDetails?.downloadSize || '—')}
              </span>
            </div>

            {isInstalled && (
              <>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">{__('Installed Size')}</span>
                  <span className="text-foreground font-mono">
                    {loadingSizes ? '...' : (appDetails?.installedSize || '—')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">{__('Data Size')}</span>
                  <span className="text-foreground font-mono">
                    {loadingSizes ? '...' : (appDetails?.dataSize || '—')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
