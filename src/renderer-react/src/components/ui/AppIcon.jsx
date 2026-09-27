import React, { useState } from 'react';
import { cn, name2initials, name2color } from '@/lib/utils';

export function AppIcon({ item, size = "md", className }) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    xs: "size-5 text-[9px] rounded-sm",
    sm: "size-7 text-[10px] rounded-md",
    md: "size-9 text-xs rounded-lg",
    lg: "size-12 text-sm rounded-xl",
    xl: "size-16 text-base rounded-2xl",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const name = item?.name || item?.token || "";
  const hasIcon = item?.icon && !hasError;

  return (
    <div className={cn("relative shrink-0 select-none overflow-hidden flex items-center justify-center font-semibold", currentSizeClass, className)}>
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
          className="w-full h-full flex items-center justify-center text-white font-medium shadow-xs rounded-[inherit]"
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
