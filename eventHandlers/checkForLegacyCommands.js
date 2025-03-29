/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const config = require('../config.json');
const {model, promptLoader} = require("../initializers/geminiClient");
const state = require("../initializers/state");
const log = require("../utils/betterLogs");

async function checkForLegacyCommands(message) {
    if (!message.content.startsWith('ai!reset')) return;
    if (config.OWNERS.includes(message.author.id)) {
        // noinspection JSCheckFunctionSignatures
        await message.react('🔄');

        const geminiModel = await model();
        state.history = [];
        global.geminiSession = promptLoader(geminiModel, state.history);
        state.resetCounts += 1;

        await message.reactions.removeAll();
        await message.react('✅');

        // send message abt deprecation to dms
        try {
            const user = await message.client.users.fetch(message.author.id);
            await user.send({
                content: `Az \`ai!reset\` parancs el lesz távolítva a jövőben, használd a </reset:${state.commandIds["reset"]}> parancsot.`
            });
        } catch (e) {
            log(`Couldn't send dm to user: ${e}`, 'error', 'checkForLegacyCommands.js');
        }
    } else {
        await message.react('❌');
    }
}

module.exports = checkForLegacyCommands;