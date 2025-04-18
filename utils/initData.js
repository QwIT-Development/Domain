/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
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


    // create reputation table
    // noinspection JSUnresolvedReference
    const reputationPath = path.join(dataDir, 'reputation.json');
    let reputation = {};
    if (!fs.existsSync(reputationPath)) {
        log('Creating reputation "db"', 'info', 'initData.js');
        await fs.writeFileSync(reputationPath, JSON.stringify(reputation));
        // {}
        state.reputation = reputation;
    } else {
        try {
            reputation = JSON.parse(fs.readFileSync(reputationPath, 'utf8'));
        } catch (e) {
            log(`Failed to parse reputation file: ${e}`, 'error', 'initData.js');
        }
        state.reputation = reputation;
    }

    /*
    reputations will look like this:
    {
        "userid": 0,
        "userid2": -1000
    }
     */

    // create banlist
    // noinspection JSUnresolvedReference
    const banlistPath = path.join(dataDir, 'banlist.json');
    let banlist = {};
    if (!fs.existsSync(banlistPath)) {
        console.info('Creating banlist');
        await fs.writeFileSync(banlistPath, JSON.stringify(banlist));
        // useless, bc it is already inited like this, but i put this here
        state.banlist = banlist;
    } else {
        try {
            banlist = JSON.parse(fs.readFileSync(banlistPath, 'utf8'));
        } catch (e) {
            log(`Failed to parse banlist file: ${e}`, 'error', 'initData.js');
        }
        state.banlist = banlist;
    }

    /*
    banlist format:
    {
        "userid": "sent brainrot messages like every 2 seconds",
        "userid2": "please stop telling me that I'm an AI"
    }
     */

}

module.exports = initData;