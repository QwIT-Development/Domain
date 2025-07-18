/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { Collection } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const path = require("path");
const fs = require("fs");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const log = require("../utils/betterLogs");
const state = require("../initializers/state");
const { changeSpinnerText } = require("../utils/processInfo");

async function announceCommands(client) {
  state.locationHelper.init = "setCommands.js/announceCommands";
  await changeSpinnerText("Announcing commands to all servers...");
  // push commands to collection
  // this will set the commands internally
  client.commands = new Collection();

  // this will announce the commands to all servers with the bot in it
  const commands = [];
  const commandsPath = path.join(global.dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((f) => f.endsWith(".js"));

  for (const f of commandFiles) {
    if (f === "setCommands.js") continue; // skip command set thing

    const filePath = path.join(commandsPath, f);
    const command = require(filePath);

    // register commands dynamically
    if (command.data?.name) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    } else {
      log(`Command ${f} won't be registered.`, "warn", "setCommands.js");
    }
  }

  const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

  let result;
  try {
    log(`Registering ${commands.length} commands...`, "info", "setCommands.js");

    result = await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });

    log(`Registered ${result.length} commands`, "info", "setCommands.js");
  } catch (e) {
    console.error(`Error while registering commands: ${e}`);
  }

  for (const data of result) {
    state.commandIds[data.name] = data.id;
  }
}

module.exports = announceCommands;
