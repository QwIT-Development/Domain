/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const state = require('../initializers/state');
const log = require('../utils/betterLogs');

async function reputation(id, type = '') {
    if (!id || !type) {
        log(`Missing argument`, 'error', 'reputation.js');
        return false;
    }

    const db = state.reputation;
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

    return true;
}