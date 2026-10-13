import React, { useState } from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { InfoSectionCard } from '../InfoSectionCard';
import { InfoCopyButton } from '../InfoCopyButton';
import { Button } from '../Button';
import { formatCountK, resolveAssetUrl } from '@/hooks/utils';

export interface FontDetailsCardProps {
  item: CaskItem;
  isInstalled: boolean;
}

export function FontDetailsCard({ item, isInstalled }: FontDetailsCardProps) {
  const __ = useShellStore((s) => s.__);
  const [expandedLicense, setExpandedLicense] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [altTheme, setAltTheme] = useState<'light' | 'dark'>('light');

  const fontStyles = item.styles || item.variants || [];
  const format = (item.fontFormat || 'otf').toUpperCase();
  const installPath = item.app || (item.file as string) || (item.token ? `~/Library/Fonts/${item.token}.otf` : null);

  const licenseText = (item.fontLicense || '').trim();
  const licenseLines = licenseText.split('\n');
  const hasMoreLicense = licenseLines.length > 1;

  const rawPreviewUrl = item.screenshotUrl;
  const previewUrl = rawPreviewUrl ? resolveAssetUrl(rawPreviewUrl) : null;

  const handleReveal = () => {
    window.ipc?.revealApp(item.app || item.token, item.token);
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
      <div className="space-y-2 py-0.5 text-xs">
        {/* Available Styles */}
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

        {/* Glyph Count */}
        {Boolean(item.glyphCount) && (
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Glyphs')}</span>
            <span className="text-foreground font-mono">{formatCountK(item.glyphCount)}</span>
          </div>
        )}

        {/* Foundry */}
        {(item.foundry || item.designer) && (
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Foundry')}</span>
            <span className="text-foreground truncate max-w-[160px]">{item.foundry || item.designer}</span>
          </div>
        )}

        {/* License */}
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

        {/* Font File with label on its own line */}
        {installPath && (
          <div className="space-y-1 py-0.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{__('Font File')}</span>
              <InfoCopyButton text={installPath} />
            </div>
            <div className="font-mono text-[11px] text-foreground break-all select-text bg-black/[0.03] dark:bg-white/[0.04] p-1.5 rounded-[var(--radius-btn)] border border-border/40">
              {installPath.replace(/^\/Users\/[^/]+/, '~')}
            </div>
          </div>
        )}

        {/* Preview Specimen Expander with Alternate Background */}
        {previewUrl && (
          <div className="space-y-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setExpandedPreview(!expandedPreview)}
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground cursor-default select-none group"
            >
              <span className="font-medium text-foreground">{__('Preview Specimen')}</span>
              <span className="text-[11px] text-primary group-hover:underline">
                {expandedPreview ? __('Hide') : __('Show')}
              </span>
            </button>
            {expandedPreview && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{__('Background')}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAltTheme('light')}
                      className={`px-1.5 py-0.5 rounded-[var(--radius-btn)] text-[10px] font-medium cursor-default select-none ${
                        altTheme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted/70 text-foreground hover:bg-muted'
                      }`}
                    >
                      {__('Light')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAltTheme('dark')}
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
          </div>
        )}

        {/* Show in Finder: Normal secondary button */}
        <div className="pt-1 border-t border-border/30">
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
