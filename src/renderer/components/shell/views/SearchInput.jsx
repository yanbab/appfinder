import React from 'react';
import { useShell } from '@/hooks/useShell';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchInput({ className = '' }) {
  const { search, setSearch, __ } = useShell();

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        id="search-input"
        type="text"
        placeholder={__('Search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 pl-8 pr-7 text-xs bg-black/[0.06] dark:bg-white/[0.08] focus:bg-black/[0.09] dark:focus:bg-white/[0.12] border-0 border-none shadow-none rounded-[var(--radius-btn)] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-none"
      />
      {search && (
        <button
          onClick={() => setSearch('')}
          className="absolute right-2 size-4 rounded-full bg-muted-foreground/40 hover:bg-muted-foreground/60 active:bg-muted-foreground/80 text-background flex items-center justify-center cursor-default transition-colors"
          title={__('Clear search')}
        >
          <X className="size-2.5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
