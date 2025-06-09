const fs = require('fs');
const path = require('path');
const axios = require('axios');
const state = require('../initializers/state');
const log = require('../utils/betterLogs');
const config = require('../config.json');

const bannedSitesCacheDir = path.join(global.dirname, 'data', 'running', 'bannedSitesCache');
const remoteLists = config.REMOTE_LISTS || [];

// Ensure cache directory exists
if (!fs.existsSync(bannedSitesCacheDir)) {
    try {
        fs.mkdirSync(bannedSitesCacheDir, { recursive: true });
        log(`Created cache directory: ${bannedSitesCacheDir}`, 'info', 'bannedSiteGen.js');
    } catch (err) {
        log(`Failed to create cache directory ${bannedSitesCacheDir}: ${err}`, 'error', 'bannedSiteGen.js');
    }
}

const getCachePathForUrl = (url) => {
    const safeFilename = url.replace(/[^a-zA-Z0-9.-]/g, '_') + '.txt';
    return path.join(bannedSitesCacheDir, safeFilename);
};

async function getBannedSites() {
    log(`Generating banned sites list...`, 'info', 'bannedSiteGen.js');

    let staticFileSites = [];
    try {
        const staticFilePath = path.join(global.dirname, 'data', 'bannedSites.json');
        if (fs.existsSync(staticFilePath)) {
            staticFileSites = JSON.parse(fs.readFileSync(staticFilePath, 'utf-8'));
            log(`Blocking ${staticFileSites.length} domains with local filter list.`, 'info', 'bannedSiteGen.js');
        }
    } catch (e) {
        log(`Failed to parse bannedSites.json: ${e}`, 'error', 'bannedSiteGen.js');
        staticFileSites = [];
    }

    let allRemoteSites = [];

    for (const listUrl of remoteLists) {
        const cachePath = getCachePathForUrl(listUrl);
        let fetchedContent = null;
        let currentListSites = [];

        try {
            const response = await axios.get(listUrl, { responseType: 'arraybuffer' });
            fetchedContent = Buffer.from(response.data, 'binary').toString('utf8');

            let cachedContent = null;
            try {
                if (fs.existsSync(cachePath)) {
                    cachedContent = fs.readFileSync(cachePath, 'utf-8');
                }
            } catch (cacheReadError) {
                log(`Error reading cache file ${cachePath}: ${cacheReadError}`, 'error', 'bannedSiteGen.js');
            }

            if (fetchedContent !== cachedContent) {
                log(`Content for ${listUrl} changed or cache miss. Updating cache...`, 'info', 'bannedSiteGen.js');
                try {
                    fs.writeFileSync(cachePath, fetchedContent, 'utf-8');
                    log(`Successfully updated cache file: ${cachePath}`, 'info', 'bannedSiteGen.js');
                } catch (writeError) {
                    log(`Failed to write cache file ${cachePath}: ${writeError}`, 'error', 'bannedSiteGen.js');
                }
                currentListSites = fetchedContent.split('\n').map(site => site.trim()).filter(site => site !== '');
            } else {
                log(`Using cached list for ${listUrl}.`, 'info', 'bannedSiteGen.js');
                currentListSites = cachedContent.split('\n').map(site => site.trim()).filter(site => site !== '' && !site.startsWith('#'));
            }

        } catch (fetchError) {
            log(`Failed to fetch remote list ${listUrl}: ${fetchError}`, 'error', 'bannedSiteGen.js');
            try {
                if (fs.existsSync(cachePath)) {
                    const cachedContent = fs.readFileSync(cachePath, 'utf-8');
                    currentListSites = cachedContent.split('\n').map(site => site.trim()).filter(site => site !== '');
                    log(`Successfully loaded ${currentListSites.length} sites from cache for ${listUrl}.`, 'info', 'bannedSiteGen.js');
                } else {
                    currentListSites = [];
                }
            } catch (cacheError) {
                log(`Failed to read cache file ${cachePath} after fetch failure: ${cacheError}`, 'error', 'bannedSiteGen.js');
                currentListSites = [];
            }
        }
        allRemoteSites = allRemoteSites.concat(currentListSites);
    }

    let combinedSites = [...staticFileSites, ...allRemoteSites];

    state.bannedSitesExact.clear();
    state.bannedSitesWildcard = [];

    for (const site of combinedSites) {
        if (typeof site !== 'string' || site === '') continue;

        if (site.startsWith('*')) {
            const suffix = site.substring(1);
            if (suffix) {
                state.bannedSitesWildcard.push(suffix);
            }
        } else {
            state.bannedSitesExact.add(site);
        }
    }

    log(`Total domains we are blocking: ${combinedSites.length}`, 'info', 'bannedSiteGen.js');
    return true;
}

module.exports = getBannedSites;