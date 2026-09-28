import * as React from "react";

/**
 * CategoryIcon renders dynamic SVG HTML provided by CaskFlow/Homebrew categories data.
 */
export function CategoryIcon({ html, className = "size-4" }) {
  if (html) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 [&>svg]:size-full ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <div className={`rounded-sm bg-muted ${className}`} />;
}
