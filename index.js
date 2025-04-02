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

const log = require('./utils/betterLogs');
const {Events} = require("discord.js");
const state = require('./initializers/state');
const config = require('./config.json');
const {botReady, botOffline} = require('./functions/botReady');
const deleteArtifacts = require('./utils/deleteArtifacts');

// async main thread hell yeah
async function main() {
    log("Starting Domain-Unchained", 'info');
    global.dirname = __dirname;
    await deleteArtifacts();
    const initData = require('./utils/initData');
    await initData(); // init stuff that will be used by the bot

    require('./utils/webui'); // fire up webui
    // imports
    const {promptLoader, model} = require('./initializers/geminiClient');
    const messageHandler = require('./eventHandlers/messageHandler');
    const checkForLegacyCommands = require('./eventHandlers/checkForLegacyCommands');

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

    const emojiResolver = require('./initializers/emojiResolver');
    await emojiResolver(discordClient);

    // announce commands to servers
    const announceCommands = require('./commands/setCommands');
    await announceCommands(discordClient);

    // ha jol megy minden akkor siman kiolvasom historyt statebol
    const generateHistory = require('./initializers/historyCreator');
    await generateHistory();

    global.geminiModel = await model(state.history);
    global.geminiSession = promptLoader(global.geminiModel, state.history);

    await botReady(discordClient);

    // sync sleeping state
    const schedSleep = require('./functions/sleeping');
    schedSleep(config.SLEEPINGRANGE, discordClient);

    // register some handlers
    process.on('SIGINT', () => gracefulShutdown('SIGINT', discordClient));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', discordClient));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP', discordClient));
    process.on('beforeExit', () => gracefulShutdown('beforeExit', discordClient));
    process.on('exit', () => gracefulShutdown('exit', discordClient));

    discordClient.on(Events.MessageCreate, async message => {
        // ignore messages when "sleeping"
        if (state.isSleeping) return;

        // noinspection JSUnresolvedReference
        await messageHandler(
            message,
            discordClient,
            global.geminiSession
        )

        await checkForLegacyCommands(
            message,
            discordClient
        )
    });

    discordClient.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;

        // noinspection JSUnresolvedReference
        const command = discordClient.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            // skizofrenias az intellijm, pont mint en
            // noinspection JSCheckFunctionSignatures,JSDeprecatedSymbols
            await interaction.editReply({
                content: `Nem sikerült futtatni a parancsot.\n
\`\`\`
${error}
\`\`\``,
                flags: [
                    "Ephemeral"
                ]
            });
        }
    });

}

async function gracefulShutdown(signal, client) {
    const {saveReps} = require('./utils/reputation');

    log(`Received ${signal}`, 'info');
    try {
        // set bot to offline
        // igen, jol latod csak ide kell a global, ja varj
        // mostmar nem kell global
        await botOffline(client);
        await client.destroy();
        await saveReps();
        await deleteArtifacts();
    } catch (e) {
        log(`Error while doing stuff before shutdown: ${e}`, 'error');
    } finally {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

main().then();