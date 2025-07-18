/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const state = require("../initializers/state");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { changeSpinnerText } = require("../utils/processInfo");

async function generateHistory() {
  state.locationHelper.init = "historyCreator.js/generateHistory";
  await changeSpinnerText("Generating empty history...");
  for (const channel of Object.keys(config.CHANNELS)) {
    // since we are reloading history on startup, we only make empty history if it doesn't exist
    if (!state.history[channel]) {
      state.history[channel] = [];
    }
  }
}

module.exports = generateHistory;
