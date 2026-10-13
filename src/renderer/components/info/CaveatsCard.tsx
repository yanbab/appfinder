import React, { useState } from 'react';
import { Card } from '../Card';
import { ShellIcon } from '../ShellIcon';
import { useShellStore } from '@/stores';

export interface CaveatsCardProps {
  caveats: string;
}

export function CaveatsCard({ caveats }: CaveatsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const __ = useShellStore((s) => s.__);

  if (!caveats) return null;

  const lines = caveats.trim().split('\n');
  const hasMore = lines.length > 1;

  return (
    <Card variant="warning" padding="default" className="space-y-1">
      <div className="flex items-center gap-1.5 font-semibold text-xs">
        <ShellIcon name="exclamationmark.triangle" className="size-3.5 shrink-0" />
        <span>{__('Caveat')}</span>
      </div>
      <div className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-hidden text-foreground">
        <span>{expanded ? caveats : lines[0]}</span>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-primary hover:underline font-medium cursor-default select-none font-sans"
          >
            {expanded ? __('less') : __('more')}
          </button>
        )}
      </div>
    </Card>
  );
}

export default CaveatsCard;
