// Core data models for AppFinder

export interface CaskItem {
  token: string;
  name: string;
  desc?: string;
  homepage?: string;
  app?: string | null;
  version?: string;
  category: string;
  secondCategory?: string;
  thirdCategory?: string;
  count?: number;
  added?: string | null;
  icon?: string | boolean;
  iconUrl?: string;

  // Runtime / Status fields
  installed?: boolean;
  installedVersion?: string;
  outdated?: boolean;
  newVersion?: string;
  loading?: boolean;
  [key: string]: any;
}

export interface CategoryItem {
  name: string;
  displayName: string;
  symbolName: string;
}

export interface AppConfig {
  zap: boolean;
  alwaysShowStatusBar: boolean;
  debug: boolean;
  language: string;
  [key: string]: any;
}

export interface LocaleInfo {
  code: string;
  name: string;
  description?: string;
}
