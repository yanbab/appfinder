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
        placeholder={__('Search apps...')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 pl-8 pr-7 text-xs bg-black/[0.06] dark:bg-white/[0.08] focus:bg-black/[0.09] dark:focus:bg-white/[0.12] border-0 border-none shadow-none rounded-[var(--radius-btn)] placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:outline-none"
      />
      {search && (
        <button
          onClick={() => setSearch('')}
          className="absolute right-2 p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/80 rounded-[var(--radius-badge)] cursor-default transition-colors"
          title={__('Clear search')}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
