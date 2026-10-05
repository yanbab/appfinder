import React, { useState } from 'react';
import { cn, name2initials, name2color } from '@/hooks/utils';

export function AppIcon({ item, size = "md", className }) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    xs: "size-5 rounded-sm",
    sm: "size-7 rounded-md",
    md: "size-12 rounded-xl",
    row: "size-12 rounded-xl",
    tile: "size-12 rounded-xl",
    "48": "size-12 rounded-xl",
    lg: "size-16 rounded-2xl",
    grid: "size-16 rounded-2xl",
    "64": "size-16 rounded-2xl",
    xl: "size-32 rounded-[28px]",
    "2xl": "size-32 rounded-[28px]",
    hero: "size-32 rounded-[28px]",
    "128": "size-32 rounded-[28px]",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const name = item?.name || item?.token || "";
  const hasIcon = item?.icon && !hasError;

  return (
    <div className={cn("relative shrink-0 select-none overflow-hidden flex items-center justify-center [container-type:inline-size]", currentSizeClass, className)}>
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
            fetchPriority="low"
            className={cn(
              "w-full h-full object-contain rounded-[inherit]",
              loaded ? "block" : "invisible"
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setHasError(true)}
          />
        </>
      )}

      {(!hasIcon || hasError) && (
        <div
          className="w-[87.5%] h-[87.5%] flex items-center justify-center text-white font-normal tracking-tight shadow-xs rounded-[inherit] select-none text-[41cqw]"
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
