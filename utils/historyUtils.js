/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const state = require("../initializers/state");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const log = require("./betterLogs");

async function addToHistory(role, content, channelId) {
  await trimHistory(channelId);
  if (role && content) {
    if (role !== "user" && role !== "model") {
      log(
        `Got invalid role to be pushed to history: ${role}`,
        "warn",
        "historyUtils.js",
      );
    }
    state.history[channelId.toString()].push({
      role: role,
      parts: [{ text: content }],
    });
  }
}

async function trimHistory(channelId) {
  // Ensure history for the channel exists
  if (!state.history[channelId]) {
    state.history[channelId] = [];
  }

  while (state.history[channelId].length > config.MAX_MESSAGES) {
    state.history[channelId].shift();
  }

  if (
    state.history[channelId].length > 0 &&
    state.history[channelId][0].role !== "user"
  ) {
    // Remove messages until the first message is a user
    // ez akadalyozza meg, hogy ne szarja ossze magat a gemini sdk
    while (
      state.history[channelId].length > 0 &&
      state.history[channelId][0].role !== "user"
    ) {
      state.history[channelId].shift();
    }
  }
}

module.exports = { addToHistory, trimHistory };
