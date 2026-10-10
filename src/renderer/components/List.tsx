import React from 'react';

export interface ListProps {
  children: React.ReactNode;
  className?: string;
}

export function List({ children, className = '' }: ListProps) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-card)] shadow-2xs space-y-px bg-transparent w-full ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export default List;
