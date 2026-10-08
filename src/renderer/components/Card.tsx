import React, { type HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'hub' | 'warning' | 'error' | 'hero';
  padding?: 'none' | 'sm' | 'default' | 'md' | 'lg' | 'xl';
  selected?: boolean;
  as?: React.ElementType;
}

const variantStyles: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'rounded-[var(--radius-card)] bg-card text-card-foreground shadow-2xs',
  interactive:
    'rounded-[var(--radius-card)] bg-card text-card-foreground shadow-2xs select-none cursor-default active:bg-[var(--card-active-bg)] focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 transition-colors',
  hub: 'rounded-[var(--radius-card)] bg-gradient-to-b from-card via-card/95 to-card/85 text-card-foreground shadow-2xs select-none cursor-default',
  warning:
    'rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 overflow-hidden',
  error:
    'rounded-[var(--radius-card)] border border-destructive/40 bg-destructive/10 text-destructive overflow-hidden',
  hero: 'rounded-[calc(var(--radius-card)*2)] overflow-hidden shadow-sm select-none',
};

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-1.5',
  default: 'p-2',
  md: 'p-3',
  lg: 'p-4',
  xl: 'p-4 sm:p-5',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'default',
      selected = false,
      as: Component = 'div',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseVariant = variantStyles[variant] || variantStyles.default;
    const basePadding = paddingStyles[padding] || paddingStyles.default;
    const selectedClass = selected ? 'bg-[var(--card-active-bg)]' : '';

    return (
      <Component
        ref={ref}
        className={`${baseVariant} ${basePadding} ${selectedClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center justify-between gap-2 select-none ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`font-semibold text-[13px] text-foreground leading-snug truncate ${className}`} {...props} />;
}

export function CardDescription({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs text-muted-foreground line-clamp-2 leading-snug ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`min-w-0 flex-1 ${className}`} {...props} />;
}

export function CardFooter({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center gap-2 pt-2 select-none ${className}`} {...props} />;
}

export default Card;
