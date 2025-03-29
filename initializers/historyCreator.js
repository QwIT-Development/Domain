/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const state = require('../initializers/state');
const config = require('../config.json');

async function generateHistory() {
    for (const channel of config.CHANNELS) {
        state.history[channel] = [];
    }
}

module.exports = generateHistory;