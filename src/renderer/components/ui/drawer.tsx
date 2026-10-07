import React, { useEffect } from 'react';

export interface DrawerProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  direction?: 'right' | 'left' | 'bottom' | 'top' | string;
  shouldScaleBackground?: boolean;
}

/**
 * Minimal, lightweight slide-over drawer component for macOS inspector panels.
 * Zero external dependencies, pure Tailwind transition.
 */
export function Drawer({ open = false, onOpenChange, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange?.(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Dimmed backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </>
  );
}

export const DrawerContent = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <aside
      ref={ref}
      data-drawer-content
      className={`fixed inset-y-0 right-0 z-50 flex h-full flex-col border-l border-border bg-background shadow-xl select-none transition-transform duration-200 ease-out animate-in slide-in-from-right ${className}`}
      {...props}
    >
      {children}
    </aside>
  );
});
DrawerContent.displayName = 'DrawerContent';

export function DrawerTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={`text-sm font-semibold text-foreground truncate ${className}`} {...props}>
      {children}
    </h2>
  );
}

export function DrawerDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-foreground leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}
