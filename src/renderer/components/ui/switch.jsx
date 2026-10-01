import * as React from 'react';
import { cn } from '@/hooks/utils';

export const Switch = React.forwardRef(
  ({ className, checked = false, onCheckedChange, disabled = false, animate = true, ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        ref={ref}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        className={cn(
          'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent outline-none focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 select-none cursor-default',
          animate ? 'transition-colors duration-200' : 'transition-none',
          checked ? 'bg-primary' : 'bg-muted-foreground/30',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0',
            animate ? 'transition-transform duration-200' : 'transition-none',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    );
  }
);
Switch.displayName = 'Switch';

export default Switch;
