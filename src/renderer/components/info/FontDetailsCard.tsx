import React, { useState } from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { InfoSectionCard } from '../InfoSectionCard';
import { Button } from '../Button';
import { formatCountK, resolveAssetUrl } from '@/hooks/utils';

export interface FontDetailsCardProps {
  item: CaskItem;
  isInstalled: boolean;
}

export function FontDetailsCard({ item, isInstalled }: FontDetailsCardProps) {
  const __ = useShellStore((s) => s.__);
  const [expandedLicense, setExpandedLicense] = useState(false);
  const [altTheme, setAltTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('appfinder:fontPreviewTheme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  const fontStyles = item.styles || item.variants || [];
  const format = (item.fontFormat || 'otf').toUpperCase();

  const licenseText = (item.fontLicense || '').trim();
  const licenseLines = licenseText.split('\n');
  const hasMoreLicense = licenseLines.length > 1;

  const rawPreviewUrl = item.screenshotUrl;
  const previewUrl = rawPreviewUrl ? resolveAssetUrl(rawPreviewUrl) : null;

  const handleAltThemeChange = (theme: 'light' | 'dark') => {
    setAltTheme(theme);
    try {
      localStorage.setItem('appfinder:fontPreviewTheme', theme);
    } catch (_) {}
  };

  const handleReveal = () => {
    window.ipc?.revealApp(item.token, item.app || item.token);
  };

  const badgeElement = (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="px-1.5 py-0.5 rounded-[var(--radius-btn)] bg-black/[0.06] dark:bg-white/[0.08] text-[10px] font-mono font-medium text-foreground">
        {format}
      </span>
      {item.isVariable && (
        <span className="px-1.5 py-0.5 rounded-[var(--radius-btn)] bg-primary/10 text-primary text-[10px] font-semibold">
          {__('Variable')}
        </span>
      )}
      {item.isMonospace && (
        <span className="px-1.5 py-0.5 rounded-[var(--radius-btn)] bg-muted text-muted-foreground text-[10px] font-mono">
          {__('Mono')}
        </span>
      )}
    </div>
  );

  return (
    <InfoSectionCard
      title={__('Typography')}
      badge={badgeElement}
      defaultOpen={true}
    >
      <div className="space-y-2.5 py-0.5 text-xs">
        {/* 1. Preview Specimen at the top */}
        {previewUrl && (
          <div className="space-y-1.5 pb-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{__('Preview')}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAltThemeChange('light')}
                  className={`px-1.5 py-0.5 rounded-[var(--radius-btn)] text-[10px] font-medium cursor-default select-none ${
                    altTheme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted/70 text-foreground hover:bg-muted'
                  }`}
                >
                  {__('Light')}
                </button>
                <button
                  type="button"
                  onClick={() => handleAltThemeChange('dark')}
                  className={`px-1.5 py-0.5 rounded-[var(--radius-btn)] text-[10px] font-medium cursor-default select-none ${
                    altTheme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted/70 text-foreground hover:bg-muted'
                  }`}
                >
                  {__('Dark')}
                </button>
              </div>
            </div>
            <div
              className={`p-3 rounded-[var(--radius-card)] border border-border/40 flex items-center justify-center overflow-x-auto min-h-[50px] transition-colors ${
                altTheme === 'dark' ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-900'
              }`}
            >
              <img
                src={previewUrl}
                alt={item.name}
                className={`h-7 max-h-7 w-auto max-w-none object-contain select-none pointer-events-none ${
                  altTheme === 'dark' ? 'invert' : ''
                }`}
              />
            </div>
          </div>
        )}

        {/* 2. Available Styles */}
        {fontStyles.length > 0 && (
          <div className="space-y-1 py-0.5">
            <span className="text-muted-foreground">{__('Styles')}</span>
            <div className="flex flex-wrap gap-1">
              {fontStyles.map((style) => (
                <span
                  key={style}
                  className="px-1.5 py-0.5 rounded-[var(--radius-btn)] bg-muted/60 text-[10px] text-foreground font-medium"
                >
                  {style}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 3. Glyph Count (on 2 lines) */}
        {Boolean(item.glyphCount) && (
          <div className="space-y-1 py-0.5">
            <span className="text-muted-foreground">{__('Glyphs')}</span>
            <div className="text-foreground font-mono">{formatCountK(item.glyphCount)}</div>
          </div>
        )}

        {/* 4. Foundry (on 2 lines) */}
        {(item.foundry || item.designer) && (
          <div className="space-y-1 py-0.5">
            <span className="text-muted-foreground">{__('Foundry')}</span>
            <div className="text-foreground select-text">{item.foundry || item.designer}</div>
          </div>
        )}

        {/* 5. License */}
        {item.fontLicense && (
          <div className="space-y-1 py-0.5">
            <span className="text-muted-foreground">{__('License')}</span>
            <div className="text-foreground text-[11px] leading-relaxed">
              <span className="select-text whitespace-pre-wrap break-words">
                {expandedLicense ? item.fontLicense : licenseLines[0]}
              </span>
              {hasMoreLicense && (
                <button
                  type="button"
                  onClick={() => setExpandedLicense(!expandedLicense)}
                  className="ml-1 text-primary hover:underline font-medium cursor-default select-none"
                >
                  {expandedLicense ? __('less') : __('more')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 6. Show in Finder */}
        <div className="pt-1.5 border-t border-border/30">
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={handleReveal}
          >
            {__('Show in Finder')}
          </Button>
        </div>
      </div>
    </InfoSectionCard>
  );
}

export default FontDetailsCard;
