// i18n

import path from 'path';
import fs from 'fs';
import util from 'util';
import { LOCALES_DIR } from './path';
import { getConfig } from './config';
import type { LocaleInfo } from '../types/cask';

const localesDir = LOCALES_DIR;

const catalogs: Record<string, Record<string, string>> = {};
let currentLocale = 'en';
let currentCatalog: Record<string, string> = {};
let availableLocales: LocaleInfo[] | null = null;

function getElectronApp(): any {
  try {
    const { app } = require('electron');
    return app;
  } catch {
    return null;
  }
}

export function loadMessages(locale: string): Record<string, string> {
  if (!catalogs[locale]) {
    try {
      catalogs[locale] = JSON.parse(fs.readFileSync(path.join(localesDir, `${locale}.json`), 'utf8'));
    } catch {
      catalogs[locale] = {};
    }
  }
  return catalogs[locale];
}

export function getLocales(): LocaleInfo[] {
  if (!availableLocales) {
    try {
      availableLocales = fs.readdirSync(localesDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const code = f.replace('.json', '');
          const msg = loadMessages(code);
          return { code, name: msg._languageName || code };
        });
    } catch {
      availableLocales = [{ code: 'en', name: 'English' }];
    }
  }
  return availableLocales;
}

export function setLocale(lang: string): void {
  const codes = getLocales().map(l => l.code);
  currentLocale = codes.includes(lang) ? lang : 'en';
  currentCatalog = loadMessages(currentLocale);
}

export function setupI18n(): void {
  const config = getConfig();
  let lang = config.language || 'system';
  if (lang === 'system') {
    const app = getElectronApp();
    const sys = app?.getLocale?.() || 'en';
    lang = sys.split('-')[0].toLowerCase();
  }
  setLocale(lang);
}

export function getMessages(locale: string = currentLocale): Record<string, string> {
  return loadMessages(locale);
}

export function getCatalog(locale: string = currentLocale): Record<string, string> {
  return getMessages(locale);
}

export function getLocale(): string {
  return currentLocale;
}

export function __(msg: string, ...args: any[]): string {
  const text = currentCatalog[msg] ?? msg;
  return args.length ? util.format(text, ...args) : text;
}

const i18n = {
  setupI18n,
  getLocale,
  setLocale,
  getMessages,
  getCatalog,
  getLocales,
  __,
};

export default i18n;
