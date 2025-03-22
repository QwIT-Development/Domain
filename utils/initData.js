/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const fs = require('fs');
const path = require('path');

async function initData() {
    // create memories
    // noinspection JSUnresolvedReference
    const memoriesPath = path.join(global.dirname, 'data', 'running', 'memories.json');
    const memories = {};
    if (!fs.existsSync(memoriesPath)) {
        console.info('Creating memories "db"');
        await fs.writeFileSync(memoriesPath, JSON.stringify(memories));
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
    const reputationPath = path.join(global.dirname, 'data', 'running', 'reputation.json');
    const reputation = {};
    if (!fs.existsSync(reputationPath)) {
        console.info('Creating reputation "db"');
        await fs.writeFileSync(reputationPath, JSON.stringify(reputation));
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
    const banlistPath = path.join(global.dirname, 'data', 'running', 'banlist.json');
    const banlist = {};
    if (!fs.existsSync(banlistPath)) {
        console.info('Creating banlist');
        await fs.writeFileSync(banlistPath, JSON.stringify(banlist));
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