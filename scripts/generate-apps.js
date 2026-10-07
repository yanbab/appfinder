#!/usr/bin/env node
//
// Generate Apps
//
// Processes cached Homebrew cask data, install analytics, and categories
// to generate the structured and optimized data/apps.json dataset.

const fs = require('fs');
const path = require('path');

const fetchDir = process.argv[2] || path.join(process.env.HOME || '', '.cache', 'appfinder', 'fetch');
const iconBaseUrl = 'https://cdn.jsdelivr.net/gh/alielsokary/CaskFlow@icons/';

const categoriesRaw = JSON.parse(fs.readFileSync(path.join(fetchDir, 'categories.json'), 'utf8'));
const casksRaw = JSON.parse(fs.readFileSync(path.join(fetchDir, 'cask.json'), 'utf8'));
const downloadsRaw = JSON.parse(fs.readFileSync(path.join(fetchDir, '365d.json'), 'utf8'));
const addedRaw = JSON.parse(fs.readFileSync(path.join(fetchDir, 'added_dates.json'), 'utf8'));

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
            caskItem.iconUrl = `${iconBaseUrl}${token}.png`;
        }

        return caskItem;
    });
}

const casks = getCasks();
// casks = casks.filter(c => c.iconUrl !== undefined);
console.log(JSON.stringify(casks, null, 2));
