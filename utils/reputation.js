/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const state = require('../initializers/state');
const log = require('../utils/betterLogs');
const fs = require('fs');
const path = require('path');
const db = state.reputation;
const config = require('../config.json');

/**
 * lekérő és változtató func
 * @param id - userid
 * @param type - `increase`/`decrease` vagy semmi (lekérdezés)
 * @returns {Promise<number|boolean>} - visszaad egy számot vagy boolt (változásnál)
 */
async function reputation(id, type = "") {
    if (!id) {
        log(`Missing argument`, 'error', 'reputation.js');
        return false;
    }
    if (!type) {
        type = "";
    }

    const maxValue = 1000;

    const user = db[id] ? id : null;
    if (!user) {
        // create empty entry if user isn't existing already
        db[id] = 0;
    }

    if (type === "increase") {
        db[id] = db[id] + 1;
        if (db[id] > maxValue) {
            db[id] = 1000;
        }
    } else if (type === "decrease") {
        db[id] = db[id] - 1;
        if (db[id] < -maxValue) {
            db[id] = -1000;
        }
    } else {
        return db[id];
    }

    return db[id];
}

//cron job 2 save out rep to file from state
async function saveReps() {
    const filePath = path.join(global.dirname, 'data', 'running', 'reputation.json');

    try {
        fs.writeFileSync(filePath, JSON.stringify(db));
    } catch (e) {
        log(`Failed to save reputation file: ${e}`, 'error', 'reputation.js');
        return false;
    }
    return true;
}

setInterval(async () => {
    await saveReps();
}, config.TIMINGS.saveReps * 1000);

module.exports = {reputation, saveReps};