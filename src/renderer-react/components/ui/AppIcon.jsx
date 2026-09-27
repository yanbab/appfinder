import React, { useState } from 'react';
import { cn, name2initials, name2color } from '@/lib/utils';

export function AppIcon({ item, size = "md", className }) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    xs: "size-5 text-[10px] rounded-sm",
    sm: "size-7 text-xs rounded-md",
    md: "size-12 text-xl rounded-xl",
    row: "size-12 text-xl rounded-xl",
    tile: "size-12 text-xl rounded-xl",
    "48": "size-12 text-xl rounded-xl",
    lg: "size-16 text-2xl rounded-2xl",
    grid: "size-16 text-2xl rounded-2xl",
    "64": "size-16 text-2xl rounded-2xl",
    xl: "size-32 text-5xl rounded-[28px]",
    "2xl": "size-32 text-5xl rounded-[28px]",
    hero: "size-32 text-5xl rounded-[28px]",
    "128": "size-32 text-5xl rounded-[28px]",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const name = item?.name || item?.token || "";
  const hasIcon = item?.icon && !hasError;

  return (
    <div className={cn("relative shrink-0 select-none overflow-hidden flex items-center justify-center", currentSizeClass, className)}>
      {hasIcon && (
        <>
          {!loaded && (
            <div className="absolute inset-0 bg-muted/60 animate-pulse rounded-[inherit]" />
          )}
          <img
            src={item.iconUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            className={cn(
              "w-full h-full object-contain rounded-[inherit] transition-opacity duration-200",
              loaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setHasError(true)}
          />
        </>
      )}

      {(!hasIcon || hasError) && (
        <div
          className="w-full h-full flex items-center justify-center text-white font-light tracking-wide shadow-xs rounded-[inherit] select-none"
          style={{
            backgroundColor: name2color(name),
          }}
        >
          {name2initials(name)}
        </div>
      )}
    </div>
  );
}
