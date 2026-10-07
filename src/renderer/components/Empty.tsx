import React, { type ReactNode, type HTMLAttributes } from 'react';
import { ShellIcon } from './ShellIcon';

export interface EmptyProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: string | ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
  loading?: boolean;
}

export function Empty({
  icon = 'magnifyingglass',
  title,
  subtitle,
  children,
  className = '',
  loading = false,
  ...props
}: EmptyProps) {
  const isSpinner = loading || icon === 'loader-2' || icon === 'loader' || icon === 'loading';

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center p-8 text-center select-none ${className}`}
      {...props}
    >
      {isSpinner ? (
        <ShellIcon name="spinner" className="size-8 text-primary animate-spin mb-3" />
      ) : typeof icon === 'string' ? (
        <ShellIcon
          name={icon}
          className="size-16 stroke-[1.25] text-muted-foreground/40 mb-3"
        />
      ) : React.isValidElement(icon) ? (
        <div className="mb-3 text-muted-foreground/40 flex items-center justify-center">
          {icon}
        </div>
      ) : null}

      {title && (
        <h3 className="font-semibold text-base text-foreground leading-snug">
          {title}
        </h3>
      )}

      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
          {subtitle}
        </p>
      )}

      {children && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default Empty;
