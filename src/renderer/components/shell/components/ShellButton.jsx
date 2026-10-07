import React from 'react';
import { Button } from '@/components/ui/button';
import { useShell } from '@/hooks/useShell';
import { cn } from '@/hooks/utils';


export function ShellButton({
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
}) {
  let __ = (k) => k;
  try {
    const shell = useShell();
    if (shell?.__) __ = shell.__;
  } catch {
    // fallback if used outside ShellProvider
  }

  const content = children || text;
  const isSelected = Boolean(active || selected);

  const rawTitle = title || tooltip;
  const resolvedTitle = rawTitle
    ? (typeof rawTitle === 'string' ? __(rawTitle) : rawTitle)
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

  let resolvedVariant = variant;
  let resolvedSize = size;

  if (isIconOnly) {
    if (!resolvedVariant) resolvedVariant = 'ghost';
    if (!resolvedSize) resolvedSize = 'icon-sm';
  } else if (isTextOnly) {
    if (!resolvedVariant) resolvedVariant = 'secondary';
    if (!resolvedSize) resolvedSize = 'sm';
  } else if (isBoth) {
    if (!resolvedVariant) resolvedVariant = 'secondary';
    if (!resolvedSize) resolvedSize = 'sm';
  }

  const iconOnlyStyles = isIconOnly
    ? "text-muted-foreground hover:text-white dark:hover:text-white active:text-white dark:active:text-white hover:bg-black/[0.08] active:bg-black/[0.14] dark:hover:bg-white/[0.14] dark:active:bg-white/[0.22] transition-colors [&_svg]:text-current [&_svg]:pointer-events-none"
    : "";

  const activeStyles = isSelected
    ? "bg-black/[0.09] dark:bg-white/[0.18] text-foreground dark:text-white font-medium shadow-none"
    : "";

  return (
    <Button
      variant={resolvedVariant}
      size={resolvedSize}
      title={isIconOnly ? resolvedTitle : title}
      className={cn(
        iconOnlyStyles,
        activeStyles,
        className
      )}
      {...props}
    >
      {icon}
      {content && (typeof content === 'string' ? <span>{content}</span> : content)}
    </Button>
  );
}

export default ShellButton;
