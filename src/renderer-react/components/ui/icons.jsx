import * as React from "react";

export function UpgradeIcon({ className = "size-[18px]", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 4v6h-6" />
      <path d="M3 20v-6h6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L3 8m18 8-2.64 2.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}

export function OpenIcon({ className = "size-[18px]", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="m11 13 8-8m0 0v5m0-5h-5" />
    </svg>
  );
}

export function InstallIcon({ className = "size-[18px]", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v9m-3.5-3.5 3.5 3.5 3.5-3.5" />
    </svg>
  );
}

export function TrashIcon({ className = "size-[18px]", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18m-3 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m4 0V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 16 4v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function LockIcon({ className = "size-[18px]", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function SearchIcon({ className = "size-[18px]", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

export function CheckIcon({ className = "size-[18px]", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function StopCircleIcon({ className = "size-[18px]", ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
