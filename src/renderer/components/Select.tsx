import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', style, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`h-7 text-xs font-medium bg-transparent border-0 rounded-[var(--radius-btn)] pl-1 pr-1.5 text-right text-muted-foreground outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none ring-0 cursor-default [text-align-last:right] ${className}`.trim()}
        style={{ textAlign: 'right', textAlignLast: 'right', outline: 'none', boxShadow: 'none', ...style }}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

export default Select;
