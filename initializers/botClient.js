/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { Client, GatewayIntentBits, Events } = require("discord.js");

/*
Fuck dotenv, config.jsont hasznalunk. legalabb nem kell kulon package csak azert h betoltsunk egy izet.
configot
 */
// mar toml
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const log = require("../utils/betterLogs");
const { changeSpinnerText } = require("../utils/processInfo");

changeSpinnerText("Waiting for client to be ready...").then();

// noinspection JSUnresolvedReference,JSCheckFunctionSignatures
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

discordClient.once(Events.ClientReady, async () => {
  log(`Connected as ${discordClient.user.tag}`, "info", "botclient.js");
  await discordClient.user.setPresence({
    activities: [],
    status: "idle",
  });
});

discordClient
  .login(config.DISCORD_TOKEN)
  .then(() => {
    log("Bot logged in", "info", "botClient.js");
  })
  .catch((err) => {
    console.error(`Failed to log in: ${err}`);
    process.exit(1);
  });

module.exports = discordClient;
