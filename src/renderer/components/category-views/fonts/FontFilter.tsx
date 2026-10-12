import React from 'react';
import { useShellStore } from '@/stores';
import { Select } from '../../Select';
import type { CaskItem } from '@/types';

export interface FontFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Matches a cask item against the selected font filter value.
 * Handles exact classification, multi-script lists, and smart fallbacks.
 */
export function matchFontFilter(
  item: CaskItem,
  filter: string,
  installedSet?: Set<string>
): boolean {
  if (!filter || filter === 'all') return true;

  if (filter === 'installed') {
    return Boolean(item.installed) || Boolean(installedSet?.has(item.token));
  }

  const c2Raw = (item.secondCategory || '').toLowerCase();
  const c3Raw = (item.thirdCategory || '').toLowerCase();
  const c2Tokens = c2Raw.split(',').map((s) => s.trim()).filter(Boolean);
  const c3Tokens = c3Raw.split(',').map((s) => s.trim()).filter(Boolean);

  if (filter === 'symbols') {
    return (
      c2Tokens.includes('symbols') ||
      c2Tokens.includes('emoji') ||
      c3Tokens.includes('symbols') ||
      c3Tokens.includes('emoji') ||
      item.token.includes('emoji') ||
      item.token.includes('symbol')
    );
  }

  if (filter === 'serif') {
    // Exact serif check: explicitly reject 'sans-serif'
    if (c2Tokens.includes('sans-serif') && !c2Tokens.includes('serif')) {
      return false;
    }
    return (
      c2Tokens.includes('serif') ||
      (c2Tokens.length === 0 && Boolean(item.desc?.toLowerCase().includes('serif')) && !item.desc?.toLowerCase().includes('sans-serif'))
    );
  }

  if (filter === 'sans-serif') {
    return (
      c2Tokens.includes('sans-serif') ||
      (c2Tokens.length === 0 && Boolean(item.desc?.toLowerCase().includes('sans')))
    );
  }

  if (filter === 'monospace') {
    return (
      c2Tokens.includes('monospace') ||
      Boolean(item.isMonospace) ||
      Boolean(item.desc?.toLowerCase().includes('monospace')) ||
      item.token.includes('nerd-font') ||
      item.token.includes('mono')
    );
  }

  if (filter === 'latin') {
    // Latin scripts: include when Latin is specified and no other primary non-Latin script is selected
    return c3Tokens.includes('latin') && !c3Tokens.some((s) => s !== 'latin');
  }

  return c2Tokens.includes(filter) || c3Tokens.includes(filter);
}

export function FontFilter({ value, onChange, className = '' }: FontFilterProps): React.JSX.Element {
  const __ = useShellStore((s) => s.__);

  return (
    <div className={`flex items-center justify-between select-none ${className}`.trim()}>
      <h3 className="text-xs font-semibold text-muted-foreground">
        {__('Fonts')}
      </h3>
      <div className="flex items-center gap-2">
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={__('Filter fonts')}
        >
          <option value="all" className="bg-popover text-popover-foreground">{__('All')}</option>
          <option value="installed" className="bg-popover text-popover-foreground">{__('Installed')}</option>
          <option disabled className="text-muted-foreground">──────────</option>
          <option value="latin" className="bg-popover text-popover-foreground">Latin</option>
          <option value="hebrew" className="bg-popover text-popover-foreground">Hebrew</option>
          <option value="arabic" className="bg-popover text-popover-foreground">Arabic</option>
          <option value="cyrillic" className="bg-popover text-popover-foreground">Cyrillic</option>
          <option value="cjk" className="bg-popover text-popover-foreground">CJK</option>
          <option value="greek" className="bg-popover text-popover-foreground">Greek</option>
          <option value="devanagari" className="bg-popover text-popover-foreground">Devanagari</option>
          <option value="thai" className="bg-popover text-popover-foreground">Thai</option>
          <option value="bengali" className="bg-popover text-popover-foreground">Bengali</option>
          <option value="tamil" className="bg-popover text-popover-foreground">Tamil</option>
          <option value="armenian" className="bg-popover text-popover-foreground">Armenian</option>
          <option value="georgian" className="bg-popover text-popover-foreground">Georgian</option>
          <option disabled className="text-muted-foreground">──────────</option>
          <option value="monospace" className="bg-popover text-popover-foreground">Monospace</option>
          <option value="sans-serif" className="bg-popover text-popover-foreground">Sans-Serif</option>
          <option value="serif" className="bg-popover text-popover-foreground">Serif</option>
          <option value="display" className="bg-popover text-popover-foreground">Display</option>
          <option value="script" className="bg-popover text-popover-foreground">Handwriting</option>
          <option value="symbols" className="bg-popover text-popover-foreground">Symbols & Emoji</option>
        </Select>
      </div>
    </div>
  );
}

export default FontFilter;
