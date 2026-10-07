import React, { useState, type ReactNode, type HTMLAttributes } from 'react';
import { ShellIcon } from './ShellIcon';
import { useShellStore } from '@/stores';
import { cn } from '@/hooks/utils';

export interface NavGroupProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function NavGroup({
  title,
  children,
  defaultOpen = true,
  className,
  ...props
}: NavGroupProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const __ = useShellStore((s) => s.__);

  const hasTitle = Boolean(title && (typeof title === 'string' ? title.trim() : true));

  // If no title, it's not collapsable - render flat list
  if (!hasTitle) {
    return (
      <div className={cn("space-y-0", className)} {...props}>
        {children}
      </div>
    );
  }

  const resolvedTitle = typeof title === 'string' ? __(title) : title;

  return (
    <div className={cn("space-y-0.5", className)} {...props}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-2.5 py-1 flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-default select-none outline-none focus:outline-none bg-transparent hover:bg-transparent active:bg-transparent transition-none"
      >
        <span className="truncate">{resolvedTitle}</span>
        <ShellIcon
          name="chevron.right"
          className={cn(
            "size-3 text-muted-foreground/70 shrink-0 transition-transform duration-150 ease-out",
            isOpen ? "rotate-90" : "rotate-0"
          )}
        />
      </button>
      {isOpen && (
        <div className="space-y-0">
          {children}
        </div>
      )}
    </div>
  );
}

export default NavGroup;
