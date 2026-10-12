import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { AppRow } from '../../AppRow';
import { AppButtons } from '../../AppButtons';
import { getAppName, resolveAssetUrl } from '@/hooks/utils';

export interface FontRowProps {
  item: CaskItem;
  className?: string;
}

export function FontRow({ item, className }: FontRowProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);

  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [item.token]);

  const rawUrl = item.screenshotUrl;
  const previewUrl = !hasError && rawUrl ? resolveAssetUrl(rawUrl) : null;

  if (!previewUrl) {
    return <AppRow item={item} className={`font-row ${className || ''}`.trim()} />;
  }

  const isSelected = selectedApp?.token === item.token;
  const name = getAppName(item);

  return (
    <div
      data-token={item.token}
      tabIndex={0}
      role="button"
      onClick={() => openAppInfo(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAppInfo(item);
        }
      }}
      className={`app-card app-row font-row group flex items-center justify-between pl-3 pr-4 py-2 bg-card text-card-foreground select-none cursor-default focus:outline-none focus-visible:bg-[var(--card-active-bg)] transition-colors ${isSelected ? 'bg-[var(--card-active-bg)]' : ''
        } ${className || ''}`.trim()}
    >
      {/* Left / Center: Font Preview */}
      <div className="flex items-center min-w-0 flex-1 mr-4 overflow-hidden h-8">
        <img
          src={previewUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
          className="h-8 min-h-8 max-h-8 w-auto max-w-none object-left select-none pointer-events-none dark:invert shrink-0"
        />
      </div>

      {/* Right: Actions shared with standard AppRow */}
      <AppButtons item={item} variant="row" />
    </div>
  );
}

export default FontRow;


