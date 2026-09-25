#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataDir = '../../cache';
const iconBaseUrl = 'https://cdn.jsdelivr.net/gh/alielsokary/CaskFlow@icons/';

const categoriesRaw = require(`${dataDir}/categories.json`);
const casksRaw = require(`${dataDir}/cask.json`);
const downloadsRaw = require(`${dataDir}/365d.json`);
const addedRaw = require(`${dataDir}/added_dates.json`);

function getCasks() {

    const categoriesMap = categoriesRaw.categories || {};
    const tokenToCategory = categoriesRaw.tokenToCategory || {};
    const downloadsFormulae = downloadsRaw.formulae || {};
    const iconTokensSet = new Set(categoriesRaw.iconTokens || []);
    const addedDates = addedRaw.tokenAddedDates || {};

    return casksRaw.map(c => {
        const token = c.token;
        const catInfo = tokenToCategory[token] || { primary: 'other', secondary: [] };
        let primaryCat = catInfo.primary || 'other';
        if (primaryCat === 'other' && token && token.startsWith('font-')) {
            primaryCat = 'font';
            c.desc = "Font"
        }
        const catMeta = categoriesMap[primaryCat] || { displayName: 'Other', icon: 'square.grid.2x2' };

        // Get 90d download count
        let count = 0;
        if (downloadsFormulae[token] && downloadsFormulae[token][0]) {
            const countStr = downloadsFormulae[token][0].count || '0';
            count = parseInt(countStr.replace(/,/g, ''), 10) || 0;
        }

        // Find app name in artifacts
        let appValue = null;
        if (c.artifacts && Array.isArray(c.artifacts)) {
            for (const art of c.artifacts) {
                if (art.app && Array.isArray(art.app) && art.app[0]) {
                    appValue = art.app[0];
                    break;
                }
            }
        }

        let secondCategory = null;
        let thirdCategory = null;
        if (catInfo.secondary && Array.isArray(catInfo.secondary)) {
            if (catInfo.secondary[0]) {
                const secCatKey = catInfo.secondary[0];
                secondCategory = categoriesMap[secCatKey] ? categoriesMap[secCatKey].displayName : secCatKey;
            }
            if (catInfo.secondary[1]) {
                const thirdCatKey = catInfo.secondary[1];
                thirdCategory = categoriesMap[thirdCatKey] ? categoriesMap[thirdCatKey].displayName : thirdCatKey;
            }
        }

        const caskItem = {
            token: c.token,
            name: c.name && c.name[0] ? c.name[0] : c.token,
            desc: c.desc,
            homepage: c.homepage,
            url: c.url,
            app: appValue,
            version: c.version,
            category: primaryCat,
            //secondaryCategory: catMeta,
            secondCategory: secondCategory || undefined,
            thirdCategory: thirdCategory || undefined,
            count: count,
            added: addedDates[token] || null
        };

        if (iconTokensSet.has(token)) {
            caskItem.icon = `${iconBaseUrl}${token}.png`;
            caskItem.iconUrl = `${iconBaseUrl}${token}.png`;
        }

        return caskItem;
    });
}

const casks = getCasks();
// casks = casks.filter(c => c.icon !== undefined);
console.log(JSON.stringify(casks, null, 2));
