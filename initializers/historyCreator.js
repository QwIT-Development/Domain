/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const state = require('../initializers/state');
const config = require('../config.json');
const {changeSpinnerText} = require('../utils/processInfo');

async function generateHistory() {
    state.locationHelper.init = "historyCreator.js/generateHistory";
    await changeSpinnerText("Generating empty history...");
    for (const channel of config.CHANNELS) {
        state.history[channel] = [];
    }
}

module.exports = generateHistory;