import * as React from 'react';
import { getSymbol } from '@/assets/sf-symbols';

export interface ShellIconProps extends React.HTMLAttributes<HTMLSpanElement | HTMLDivElement> {
  name?: string;
  html?: string;
  className?: string;
}

export function ShellIcon({ name, html, className = 'size-[18px]', ...props }: ShellIconProps) {
  if (html) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 [&>svg]:size-full [&>svg]:block ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
        {...props}
      />
    );
  }

  if (name) {
    const rawSvg = getSymbol(name);
    if (rawSvg) {
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 [&>svg]:size-full [&>svg]:block ${className}`}
          dangerouslySetInnerHTML={{ __html: rawSvg }}
          {...props}
        />
      );
    }
  }

  return <div className={`rounded-sm bg-muted shrink-0 ${className}`} {...props} />;
}

export default ShellIcon;
