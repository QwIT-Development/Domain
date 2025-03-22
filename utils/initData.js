const fs = require('fs');
const path = require('path');

async function initData() {
    // create memories
    // noinspection JSUnresolvedReference
    const memoriesPath = path.join(global.dirname, 'data', 'running', 'memories.json');
    const memories = {};
    if (!fs.existsSync(memoriesPath)) {
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