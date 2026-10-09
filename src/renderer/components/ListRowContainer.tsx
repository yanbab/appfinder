import React from 'react';

export interface ListRowContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ListRowContainer({ children, className = '' }: ListRowContainerProps) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-card)] shadow-2xs space-y-px bg-transparent w-full max-w-[var(--content-max-width)] mx-auto ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export default ListRowContainer;
