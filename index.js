/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus

        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU Affero General Public License as
        published by the Free Software Foundation, either version 3 of the
        License, or (at your option) any later version.

        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        GNU Affero General Public License for more details.

        You should have received a copy of the GNU Affero General Public License
        along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


// async main thread hell yeah
async function main() {
    const log = require('./utils/betterLogs');
    log("Starting Domain-Unchained", 'info');
    global.dirname = __dirname;
    const initData = require('./utils/initData');
    await initData(); // init stuff that will be used by the bot

    require('./utils/webui'); // fire up webui
    // imports
    const {Events} = require("discord.js");
    const {promptLoader, model} = require('./initializers/geminiClient');
    const messageHandler = require('./eventHandlers/messageHandler');
    const state = require('./initializers/state');
    const botReady = require('./functions/botReady');

    // initialize stuff inside async thingy
    let discordClientReady = false;
    const discordClient = require('./initializers/botClient');
    discordClient.once(Events.ClientReady, () => {
        discordClientReady = true;
    });
    // wait for client to finish auth
    while (!discordClientReady) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const geminiModel = await model();
    // ha jol megy minden akkor siman kiolvasom historyt statebol
    state.history = [];

    global.geminiSession = promptLoader(geminiModel, state.history);

    await botReady(discordClient);

    discordClient.on(Events.MessageCreate, message => {
        // noinspection JSUnresolvedReference
        messageHandler(
            message,
            discordClient,
            global.geminiSession
        )
    });

}

main().then();