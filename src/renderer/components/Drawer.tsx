import * as React from 'react';
import { cn } from '@/hooks/utils';

export interface DrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  shouldScaleBackground?: boolean;
  children?: React.ReactNode;
}

export function Drawer({
  open = false,
  children,
}: DrawerProps) {
  if (!open) return null;
  return <>{children}</>;
}

export interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-background shadow-2xl transition-transform duration-200 ease-in-out select-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DrawerContent.displayName = 'DrawerContent';

export function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-3 border-b border-border flex items-center justify-between", className)} {...props} />;
}

export function DrawerTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold text-sm text-foreground", className)} {...props} />;
}

export function DrawerDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 border-t border-border mt-auto", className)} {...props} />;
}

export default Drawer;
