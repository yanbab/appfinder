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
  const token = (item.token || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const desc = (item.desc || '').toLowerCase();

  if (filter === 'symbols') {
    return (
      c2Tokens.includes('symbols') ||
      c2Tokens.includes('emoji') ||
      c3Tokens.includes('symbols') ||
      c3Tokens.includes('emoji') ||
      token.includes('emoji') ||
      token.includes('symbol') ||
      name.includes('emoji') ||
      name.includes('symbol') ||
      desc.includes('emoji')
    );
  }

  if (filter === 'serif') {
    // Exact serif check: explicitly reject 'sans-serif'
    if (c2Tokens.includes('sans-serif') && !c2Tokens.includes('serif')) {
      return false;
    }
    return (
      c2Tokens.includes('serif') ||
      (c2Tokens.length === 0 && desc.includes('serif') && !desc.includes('sans-serif'))
    );
  }

  if (filter === 'sans-serif') {
    return (
      c2Tokens.includes('sans-serif') ||
      (c2Tokens.length === 0 && desc.includes('sans'))
    );
  }

  if (filter === 'monospace') {
    return (
      c2Tokens.includes('monospace') ||
      Boolean(item.isMonospace) ||
      desc.includes('monospace') ||
      token.includes('nerd-font') ||
      token.includes('mono')
    );
  }

  if (filter === 'display') {
    return (
      c2Tokens.includes('display') ||
      desc.includes('display') ||
      name.includes('display')
    );
  }

  if (filter === 'script') {
    return (
      c2Tokens.includes('script') ||
      c2Tokens.includes('handwriting') ||
      desc.includes('script') ||
      desc.includes('handwriting') ||
      name.includes('script') ||
      name.includes('handwriting')
    );
  }

  if (filter === 'latin') {
    return (
      c3Tokens.includes('latin') ||
      (!item.thirdCategory && !token.includes('cjk') && !token.includes('arabic') && !token.includes('hebrew'))
    );
  }

  if (filter === 'cjk') {
    return (
      c3Tokens.includes('cjk') ||
      c3Tokens.includes('chinese') ||
      c3Tokens.includes('japanese') ||
      c3Tokens.includes('korean') ||
      token.includes('cjk') ||
      token.includes('chinese') ||
      token.includes('japanese') ||
      token.includes('korean') ||
      token.includes('hangul') ||
      token.includes('kana') ||
      name.includes('cjk') ||
      name.includes('chinese') ||
      name.includes('japanese') ||
      name.includes('korean')
    );
  }

  if (filter === 'hebrew') {
    return c3Tokens.includes('hebrew') || token.includes('hebrew') || name.includes('hebrew');
  }

  if (filter === 'arabic') {
    return c3Tokens.includes('arabic') || token.includes('arabic') || name.includes('arabic');
  }

  if (filter === 'cyrillic') {
    return c3Tokens.includes('cyrillic') || token.includes('cyrillic') || name.includes('cyrillic');
  }

  if (filter === 'greek') {
    return c3Tokens.includes('greek') || token.includes('greek') || name.includes('greek');
  }

  if (filter === 'devanagari') {
    return c3Tokens.includes('devanagari') || token.includes('devanagari') || name.includes('devanagari');
  }

  if (filter === 'thai') {
    return c3Tokens.includes('thai') || token.includes('thai') || name.includes('thai');
  }

  if (filter === 'bengali') {
    return c3Tokens.includes('bengali') || token.includes('bengali') || name.includes('bengali');
  }

  if (filter === 'tamil') {
    return c3Tokens.includes('tamil') || token.includes('tamil') || name.includes('tamil');
  }

  if (filter === 'armenian') {
    return c3Tokens.includes('armenian') || token.includes('armenian') || name.includes('armenian');
  }

  if (filter === 'georgian') {
    return c3Tokens.includes('georgian') || token.includes('georgian') || name.includes('georgian');
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
          <hr />
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
          <hr />
          <option value="monospace" className="bg-popover text-popover-foreground">Monospace</option>
          <option value="sans-serif" className="bg-popover text-popover-foreground">Sans-Serif</option>
          <option value="serif" className="bg-popover text-popover-foreground">Serif</option>
          <option value="display" className="bg-popover text-popover-foreground">Display</option>
          <option value="script" className="bg-popover text-popover-foreground">{__('Handwriting') || 'Handwriting'}</option>
          <option value="symbols" className="bg-popover text-popover-foreground">{__('Symbols & Emoji') || 'Symbols & Emoji'}</option>
        </Select>
      </div>
    </div>
  );
}

export default FontFilter;
