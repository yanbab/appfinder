// i18n

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { LOCALES_DIR } = require('./path');
const { getConfig } = require('./config');

const localesDir = LOCALES_DIR;

const catalogs = {};
let currentLocale = 'en';
let currentCatalog = {};
let availableLocales = null;

function loadMessages(locale) {
    if (!catalogs[locale]) {
        try {
            catalogs[locale] = JSON.parse(fs.readFileSync(path.join(localesDir, `${locale}.json`), 'utf8'));
        } catch {
            catalogs[locale] = {};
        }
    }
    return catalogs[locale];
}

function getLocales() {
    if (!availableLocales) {
        try {
            availableLocales = fs.readdirSync(localesDir)
                .filter(f => f.endsWith('.json'))
                .map(f => {
                    const code = f.replace('.json', '');
                    return { code, name: loadMessages(code)._languageName || code };
                });
        } catch {
            availableLocales = [{ code: 'en', name: 'English' }];
        }
    }
    return availableLocales;
}

function setLocale(lang) {
    const codes = getLocales().map(l => l.code);
    currentLocale = codes.includes(lang) ? lang : 'en';
    currentCatalog = loadMessages(currentLocale);
}

function setupI18n() {
    const config = getConfig();
    let lang = config.language || 'system';
    if (lang === 'system') {
        const sys = app?.getLocale?.() || 'en';
        lang = sys.split('-')[0].toLowerCase();
    }
    setLocale(lang);
}

function getMessages(locale = currentLocale) {
    return loadMessages(locale);
}

function getCatalog(locale = currentLocale) {
    return getMessages(locale);
}

function getLocale() {
    return currentLocale;
}

function __(msg, ...args) {
    const text = currentCatalog[msg] ?? msg;
    return args.length ? util.format(text, ...args) : text;
}

module.exports = {
    setupI18n,
    getLocale,
    setLocale,
    getMessages,
    getCatalog,
    getLocales,
    __
};