import React from 'react';
import { useShell } from '@/store/useShell';
import { AppCard } from './AppCard';
import { AppRow } from './AppRow';

export function AppItem({ item }) {
  const { viewMode } = useShell();

  if (viewMode === 'grid') {
    return <AppCard item={item} />;
  }
  return <AppRow item={item} />;
}
