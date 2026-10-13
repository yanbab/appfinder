import React, { useState } from 'react';
import { ShellIcon } from './ShellIcon';
import { cn } from '@/hooks/utils';
import { useShellStore } from '@/stores';

export interface InfoCopyButtonProps {
  text: string;
  label?: string;
  title?: string;
  className?: string;
  variant?: 'subtle' | 'pill' | 'inline';
}

export function InfoCopyButton({
  text,
  label,
  title,
  className = '',
  variant = 'subtle',
}: InfoCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const __ = useShellStore((s) => s.__);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={title || __('Copy')}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-btn)] text-[11px] font-mono transition-colors cursor-default select-none border border-border/60 bg-muted/40 hover:bg-muted active:bg-muted/80',
          copied && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          className
        )}
      >
        <ShellIcon
          name={copied ? 'checkmark' : 'doc.text'}
          className={cn('size-3 shrink-0', copied ? 'text-emerald-500' : 'text-muted-foreground')}
        />
        <span className="truncate max-w-[130px]">{copied ? __('Copied!') : (label || text)}</span>
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={title || __('Copy')}
        className={cn(
          'inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground active:text-foreground transition-colors cursor-default select-none',
          copied && 'text-emerald-600 dark:text-emerald-400 font-medium',
          className
        )}
      >
        <ShellIcon
          name={copied ? 'checkmark' : 'doc.text'}
          className={cn('size-3 shrink-0', copied ? 'text-emerald-500' : 'text-muted-foreground')}
        />
        {label && <span className="truncate">{copied ? __('Copied!') : label}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title || __('Copy to clipboard')}
      className={cn(
        'size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 transition-colors cursor-default select-none',
        copied && 'text-emerald-500',
        className
      )}
    >
      <ShellIcon
        name={copied ? 'checkmark' : 'doc.text'}
        className={cn('size-3 shrink-0', copied ? 'text-emerald-500' : 'text-muted-foreground')}
      />
    </button>
  );
}

export default InfoCopyButton;
