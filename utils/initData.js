/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const fs = require('fs');
const path = require('path');
const state = require('../initializers/state');
const log = require('../utils/betterLogs');
const {changeSpinnerText} = require('../utils/processInfo');

async function initData() {
    state.locationHelper.init = "initData.js/initData";
    await changeSpinnerText('Initializing state...');
    // check if data directory exists
    const dataDir = path.join(global.dirname, 'data', 'running');
    if (!fs.existsSync(dataDir)) {
        log('Creating data directory', 'info', 'initData.js');
        fs.mkdirSync(dataDir, {recursive: true});
    }
}

module.exports = initData;