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
        console.error(`Failed to create cache directory ${bannedSitesCacheDir}: ${err}`);
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
        console.error(`Failed to parse bannedSites.json: ${e}`);
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
                console.error(`Error reading cache file ${cachePath}: ${cacheReadError}`);
            }

            if (fetchedContent !== cachedContent) {
                log(`Content for ${listUrl} changed or cache miss. Updating cache...`, 'info', 'bannedSiteGen.js');
                try {
                    fs.writeFileSync(cachePath, fetchedContent, 'utf-8');
                    log(`Successfully updated cache file: ${cachePath}`, 'info', 'bannedSiteGen.js');
                } catch (writeError) {
                    console.error(`Failed to write cache file ${cachePath}: ${writeError}`);
                }
                currentListSites = fetchedContent.split('\n').map(site => site.trim()).filter(site => site !== '');
            } else {
                log(`Using cached list for ${listUrl}.`, 'info', 'bannedSiteGen.js');
                currentListSites = cachedContent.split('\n').map(site => site.trim()).filter(site => site !== '' && !site.startsWith('#'));
            }

        } catch (fetchError) {
            console.error(`Failed to fetch remote list ${listUrl}: ${fetchError}`);
            try {
                if (fs.existsSync(cachePath)) {
                    const cachedContent = fs.readFileSync(cachePath, 'utf-8');
                    currentListSites = cachedContent.split('\n').map(site => site.trim()).filter(site => site !== '');
                    log(`Successfully loaded ${currentListSites.length} sites from cache for ${listUrl}.`, 'info', 'bannedSiteGen.js');
                } else {
                    currentListSites = [];
                }
            } catch (cacheError) {
                console.error(`Failed to read cache file ${cachePath} after fetch failure: ${cacheError}`);
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