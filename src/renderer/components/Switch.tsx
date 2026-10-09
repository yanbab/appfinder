import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export function Switch({ checked, onChange, onCheckedChange, disabled = false, className = '', title }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          const next = !checked;
          onChange?.(next);
          onCheckedChange?.(next);
        }
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-default rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked ? 'bg-emerald-500' : 'bg-muted-foreground/30 dark:bg-muted-foreground/20'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`.trim()}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default Switch;
