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
    await changeSpinnerText('Initializing state...');
    // check if data directory exists
    const dataDir = path.join(global.dirname, 'data', 'running');
    if (!fs.existsSync(dataDir)) {
        log('Creating data directory', 'info', 'initData.js');
        fs.mkdirSync(dataDir, {recursive: true});
    }
    // create memories
    // noinspection JSUnresolvedReference
    const memoriesPath = path.join(dataDir, 'memories.json');
    let memories = {};
    if (!fs.existsSync(memoriesPath)) {
        log('Creating memories "db"', 'info', 'initData.js');
        await fs.writeFileSync(memoriesPath, JSON.stringify(memories));
        // reinit the same blank thing bc yes
        state.memories = memories;
    } else {
        try {
            memories = JSON.parse(fs.readFileSync(memoriesPath, 'utf8'));
        } catch (e) {
            log(`Failed to parse memories file: ${e}`, 'error', 'initData.js');
        }
        state.memories = memories;
    }

    /*
    memories buildup:
    {
        "userid": [
            "has a pc",
            "pc blown up at 2025-01-01 13:01:00",
        ],
        "userid2": []
    }
     */
}

module.exports = initData;