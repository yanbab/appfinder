import type { ComponentType } from 'react';
import type { CaskItem } from '@/types';
import { AppCard } from '../AppCard';
import { AppRow } from '../AppRow';
import { ServiceTile } from './services/ServiceTile';
import { ServiceRow } from './services/ServiceRow';
import { FontTile } from './fonts/FontTile';
import { FontRow } from './fonts/FontRow';

export interface CategoryViewPair {
  Tile: ComponentType<{ item: CaskItem; className?: string }>;
  Row: ComponentType<{ item: CaskItem; className?: string }>;
}

const REGISTRY: Record<string, CategoryViewPair> = {
  services: {
    Tile: ServiceTile,
    Row: ServiceRow,
  },
  font: {
    Tile: FontTile,
    Row: FontRow,
  },
  fonts: {
    Tile: FontTile,
    Row: FontRow,
  },
};

const DEFAULT_VIEWS: CategoryViewPair = {
  Tile: AppCard,
  Row: AppRow,
};

/**
 * Returns custom category Tile & Row components if registered, or the standard AppCard/AppRow.
 */
export function getCategoryViews(category?: string | null): CategoryViewPair {
  if (!category) return DEFAULT_VIEWS;
  return REGISTRY[category] || DEFAULT_VIEWS;
}

export { ServiceTile, ServiceRow, FontTile, FontRow };
