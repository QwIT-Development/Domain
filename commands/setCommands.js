/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const {Collection} = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const path = require('path');
const fs = require('fs');
const config = require('../config.json');
const log = require('../utils/betterLogs');
const state = require('../initializers/state');

// add commands here
const reset = require('./reset');


async function announceCommands(client) {
    // push commands to collection
    // this will set the commands internally
    client.commands = new Collection();
    // put new commands here (very easy 2 add)
    client.commands.set(reset.data.name, reset);


    // this will announce the commands to all servers with the bot in it
    const commands = [];
    const commandsPath = path.join(global.dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    for (const f of commandFiles) {
        if (f === 'setCommands.js') continue; // skip command set thing

        const filePath = path.join(commandsPath, f);
        const command = require(filePath);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({version: '10'}).setToken(config.DISCORD_TOKEN);

    let result;
    try {
        log(`Registering ${commands.length} commands...`, 'info', 'setCommands.js');

        result = await rest.put(
            Routes.applicationCommands(client.user.id),
            {body: commands}
        )

        log(`Registered ${result.length} commands`, 'info', 'setCommands.js');
    } catch (e) {
        log(`Error while registering commands: ${e}`, 'error', 'setCommands.js');
    }

    for (const data of result) {
        state.commandIds[data.name] = data.id;
    }
}

module.exports = announceCommands