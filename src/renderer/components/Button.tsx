import * as React from 'react';
import { useShellStore } from '@/stores';
import { cn } from '@/hooks/utils';

const BASE_BUTTON_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-btn)] border border-transparent text-xs font-medium whitespace-nowrap outline-none focus:outline-none focus-visible:outline-none select-none disabled:pointer-events-none disabled:opacity-50 cursor-default";

const BUTTON_VARIANTS: Record<string, string> = {
  default: "bg-primary text-primary-foreground active:bg-primary/80 shadow-2xs",
  outline: "border-border/60 text-foreground active:bg-muted/70 shadow-2xs",
  secondary: "bg-secondary text-secondary-foreground active:bg-[var(--btn-bg-active)] shadow-2xs",
  ghost: "text-muted-foreground hover:bg-black/[0.08] active:bg-black/[0.14] dark:hover:bg-white/[0.14] dark:active:bg-white/[0.22] hover:text-foreground active:text-foreground dark:hover:text-white dark:active:text-white transition-colors",
  destructive: "bg-secondary text-destructive active:bg-[var(--btn-bg-active)] shadow-2xs font-medium",
  link: "text-primary underline-offset-4 active:underline",
  pill: "rounded-full bg-white text-primary font-semibold shadow-xs active:bg-white/80 border-0 leading-none",
};

const BUTTON_SIZES: Record<string, string> = {
  default: "h-7 px-3 text-xs gap-1.5 rounded-[var(--radius-btn)]",
  sm: "h-6.5 px-2.5 text-xs rounded-[var(--radius-btn)] gap-1",
  xs: "h-5.5 px-2 text-[11px] rounded-[var(--radius-btn)] gap-1",
  lg: "h-8 px-4 text-xs gap-2 rounded-[var(--radius-btn)]",
  icon: "size-7 p-0 rounded-[var(--radius-btn)]",
  "icon-sm": "size-6.5 p-0 rounded-[var(--radius-btn)]",
  "icon-xs": "size-5.5 p-0 rounded-[var(--radius-btn)]",
  pill: "h-6.5 px-3.5 text-xs gap-1",
};

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  variant?: keyof typeof BUTTON_VARIANTS | 'sidebar' | string;
  size?: keyof typeof BUTTON_SIZES | string;
  icon?: React.ReactNode;
  text?: React.ReactNode;
  title?: React.ReactNode;
  tooltip?: React.ReactNode;
  badge?: React.ReactNode;
  active?: boolean;
  selected?: boolean;
}

export function Button({
  icon,
  children,
  text,
  title,
  tooltip,
  variant,
  size,
  badge,
  className,
  active,
  selected,
  ...props
}: ButtonProps) {
  const __ = useShellStore((s) => s.__);

  const content = children || text;
  const isSelected = Boolean(active || selected);

  const rawTitle = title || tooltip;
  const resolvedTitle = rawTitle
    ? (typeof rawTitle === 'string' ? __(rawTitle) : String(rawTitle))
    : undefined;

  // Dedicated sidebar button implementation
  if (variant === 'sidebar') {
    const hasBadge = badge !== null && badge !== undefined && badge !== false && badge !== 0;
    return (
      <button
        type="button"
        title={resolvedTitle}
        className={cn(
          "sidebar-nav-button",
          isSelected && "active",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="sidebar-icon inline-flex items-center justify-center shrink-0">
              {icon}
            </span>
          )}
          {content && (
            <span className="truncate">
              {typeof content === 'string' ? __(content) : content}
            </span>
          )}
        </div>
        {hasBadge && (
          <span className="sidebar-badge shrink-0">
            {badge}
          </span>
        )}
      </button>
    );
  }

  const isIconOnly = Boolean(icon && !content);
  const isBoth = Boolean(icon && content);
  const isTextOnly = Boolean(!icon && content);

  let resolvedVariant = variant || (isIconOnly ? 'ghost' : 'secondary');
  let resolvedSize = size || (isIconOnly ? 'icon-sm' : 'sm');

  const iconOnlyStyles = isIconOnly
    ? "text-muted-foreground hover:text-white dark:hover:text-white active:text-white dark:active:text-white hover:bg-black/[0.08] active:bg-black/[0.14] dark:hover:bg-white/[0.14] dark:active:bg-white/[0.22] transition-colors [&_svg]:text-current [&_svg]:pointer-events-none"
    : "";

  const activeStyles = isSelected
    ? "bg-black/[0.09] dark:bg-white/[0.18] text-foreground dark:text-white font-medium shadow-none"
    : "";

  const variantClass = BUTTON_VARIANTS[resolvedVariant] || BUTTON_VARIANTS.default;
  const sizeClass = BUTTON_SIZES[resolvedSize] || BUTTON_SIZES.default;

  return (
    <button
      type="button"
      title={isIconOnly ? resolvedTitle : (typeof title === 'string' ? title : undefined)}
      className={cn(
        BASE_BUTTON_CLASSES,
        variantClass,
        sizeClass,
        iconOnlyStyles,
        activeStyles,
        className
      )}
      {...props}
    >
      {icon}
      {content && (typeof content === 'string' ? <span>{content}</span> : content)}
    </button>
  );
}

export default Button;
