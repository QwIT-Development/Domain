/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const {
  ActivityType: { Custom },
} = require("discord.js");
const state = require("../initializers/state");

async function botReady(client) {
  state.locationHelper.init = "presenceManager.js/botReady";
  await client.user.setPresence({
    activities: [
      {
        name: state.strings.motd,
        type: Custom,
      },
    ],
    status: "online",
  });
}

async function botSleeping(client, time) {
  await client.user.setPresence({
    activities: [
      {
        name: state.strings.sleeping.replace("{TIME}", time),
        type: Custom,
      },
    ],
    status: "dnd",
  });
}

async function botOffline(client) {
  await client.user.setPresence({
    activities: [],
    status: "invisible",
  });
}

module.exports = { botReady, botSleeping, botOffline };
