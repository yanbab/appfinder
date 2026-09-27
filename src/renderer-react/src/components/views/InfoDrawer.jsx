import React, { useEffect } from 'react';
import { useShell } from '@/store/useShell';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/button';
import { CategoryIcon, UpgradeIcon, OpenIcon, InstallIcon, TrashIcon } from '@/components/ui/icons';
import {
  getAppName,
  formatVersion,
  formatCountK,
  formatDate,
  getCaskRequirements,
  isRequirementMet,
} from '@/lib/utils';
import { X, ExternalLink, AlertTriangle, Check, Loader2 } from 'lucide-react';

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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedApp) {
        closeAppInfo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedApp, closeAppInfo]);

  if (!selectedApp) return null;

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
    <aside
      className="fixed inset-y-0 right-0 w-88 sm:w-96 bg-card border-l border-border shadow-2xl flex flex-col z-30 select-none animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="h-11 shrink-0 px-4 border-b border-border flex items-center justify-between bg-card [-webkit-app-region:drag]">
        <h2 className="text-xs font-semibold text-foreground">
          {__('Infos')}
        </h2>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={closeAppInfo}
          className="text-muted-foreground hover:text-foreground [-webkit-app-region:no-drag]"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* App Hero */}
        <div className="flex items-start gap-3.5 pb-2">
          <AppIcon item={selectedApp} size="xl" className="rounded-2xl shadow-sm shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-foreground leading-tight">
              {name}
            </h3>
            {selectedApp.desc && (
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                {selectedApp.desc}
              </p>
            )}
            {version && (
              <span className="inline-block text-[11px] text-muted-foreground/80 font-mono mt-1">
                {__('Version')} {formatVersion(version)}
              </span>
            )}
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isRunning ? (
            <Button className="w-full gap-2" variant="secondary" disabled>
              <Loader2 className="size-3.5 animate-spin" />
              <span>{__('Working...')}</span>
            </Button>
          ) : (
            <>
              {isOutdated && (
                <Button
                  className="flex-1 gap-1.5"
                  variant="default"
                  onClick={() => startAction('upgrade', selectedApp.token)}
                >
                  <UpgradeIcon className="size-3.5" />
                  <span>{__('Upgrade')}</span>
                </Button>
              )}

              {isInstalled && selectedApp.app && !isOutdated && (
                <Button
                  className="flex-1 gap-1.5"
                  variant="secondary"
                  onClick={() => startAction('open', selectedApp.token, selectedApp.app)}
                >
                  <OpenIcon className="size-3.5" />
                  <span>{__('Open')}</span>
                </Button>
              )}

              {isInstalled && (
                <Button
                  variant="destructive"
                  className={selectedApp.app && !isOutdated ? "" : "flex-1"}
                  onClick={() => startAction('uninstall', selectedApp.token)}
                >
                  <TrashIcon className="size-3.5" />
                  <span>{__('Delete')}</span>
                </Button>
              )}

              {!isInstalled && (
                <Button
                  className="w-full gap-1.5"
                  variant="default"
                  onClick={() => startAction('install', selectedApp.token)}
                >
                  <InstallIcon className="size-3.5" />
                  <span>{__('Install')}</span>
                </Button>
              )}
            </>
          )}
        </div>

        {/* Caveats Notice */}
        {appDetails?.caveats && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[11px]">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{__('Caveats')}</span>
            </div>
            <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono">
              {appDetails.caveats}
            </p>
          </div>
        )}

        {/* Metadata Section */}
        <div className="space-y-2 border-t border-border pt-4">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {__('Details')}
          </h4>

          <div className="space-y-2 text-[11px]">
            {/* Homepage */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Homepage')}</span>
              {selectedApp.homepage ? (
                <button
                  onClick={() => window.ipc?.openExternal?.(selectedApp.homepage)}
                  className="text-primary hover:underline flex items-center gap-1 max-w-[180px] truncate"
                >
                  <span className="truncate">{selectedApp.homepage.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                  <ExternalLink className="size-2.5 shrink-0" />
                </button>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </div>

            {/* Token */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Token')}</span>
              <span className="font-mono text-foreground select-text">{selectedApp.token}</span>
            </div>

            {/* Categories */}
            {appCategories.length > 0 && (
              <div className="flex items-start justify-between py-0.5 gap-2">
                <span className="text-muted-foreground">{appCategories.length > 1 ? __('Categories') : __('Category')}</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {appCategories.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-foreground font-medium"
                    >
                      <CategoryIcon html={c.icon} className="size-3" />
                      <span>{__(c.displayName)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">{__('Requirements')}</span>
              <div className="flex items-center gap-1">
                {reqMet ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="size-3 text-amber-500" />
                )}
                <span className="text-foreground">
                  {loadingAppDetails ? '...' : (reqText || 'macOS')}
                </span>
              </div>
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
              <span className="text-foreground">{formatCountK(selectedApp.count)}</span>
            </div>

            {/* Added */}
            {selectedApp.added && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">{__('Added')}</span>
                <span className="text-foreground">{formatDate(selectedApp.added)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Storage & Usage Section */}
        <div className="space-y-2 border-t border-border pt-4">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {__('Storage')}
          </h4>

          <div className="space-y-2 text-[11px]">
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
      </div>
    </aside>
  );
}
