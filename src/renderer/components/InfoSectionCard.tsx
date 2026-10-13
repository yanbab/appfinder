import React, { useState, type ReactNode } from 'react';
import { Card } from './Card';
import { ShellIcon } from './ShellIcon';
import { cn } from '@/hooks/utils';

export interface InfoSectionCardProps {
  title: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}

export function InfoSectionCard({
  title,
  badge,
  defaultOpen = true,
  children,
  className = '',
  headerRight,
}: InfoSectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card padding="none" className={cn('text-xs overflow-hidden border border-border/50 shadow-2xs', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase cursor-default select-none hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:bg-black/[0.06] dark:active:bg-white/[0.07] transition-colors outline-none focus:outline-none"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="truncate">{title}</span>
          {badge}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {headerRight && (
            <div
              className="normal-case font-normal text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {headerRight}
            </div>
          )}
          <ShellIcon
            name="chevron.right"
            className={cn(
              'size-3 text-muted-foreground/70 shrink-0 transition-transform duration-150 ease-out',
              isOpen ? 'rotate-90' : 'rotate-0'
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-2 text-foreground">
          {children}
        </div>
      )}
    </Card>
  );
}

export default InfoSectionCard;
