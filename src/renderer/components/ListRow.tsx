import React from 'react';

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function ListRow({ children, className = '', ...props }: ListRowProps) {
  return (
    <div
      className={`app-card app-row flex items-center justify-between px-3.5 py-2.5 bg-card text-card-foreground select-none cursor-default ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export default ListRow;
