import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useShell } from '@/hooks/useShell';
import { cn } from '@/hooks/utils';

export function NavGroup({
  title,
  children,
  defaultOpen = true,
  className,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  let __ = (k) => k;
  try {
    const shell = useShell();
    if (shell?.__) __ = shell.__;
  } catch {
    // fallback if outside ShellProvider
  }

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
        <ChevronRight
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
