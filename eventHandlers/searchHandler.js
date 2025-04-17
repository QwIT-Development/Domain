/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const {search} = require("../utils/searx");
const log = require("../utils/betterLogs");
const state = require("../initializers/state");
const config = require("../config.json");

async function searchHandler(str, channelId, gemini) {
    const results = await search(str);
    await addToHistory('user', results, channelId);
    const continuation = await gemini[channelId].sendMessage(
        "Please analyze these search results and continue our conversation."
    );
    return continuation.response.text();
}


// noinspection DuplicatedCode
async function addToHistory(role, content, channelId) {
    await trimHistory(channelId)
    if (role && content) {
        if (role !== 'user' && role !== 'model') {
            log(`Got invalid role to be pushed to history: ${role}`, 'warn', 'messageHandler.js');
        }
        state.history[channelId.toString()].push({
            role: role,
            parts: [{text: content}]
        });
    }
}

// noinspection DuplicatedCode
async function trimHistory(channelId) {
    while (state.history[channelId].length > config.MAX_MESSAGES) {
        state.history[channelId].shift();
    }

    if (state.history[channelId].length > 0 && state.history[channelId][0].role !== 'user') {
        // Remove messages until the first message is a user
        // ez akadalyozza meg, hogy ne szarja ossze magat a gemini sdk
        while (state.history[channelId].length > 0 && state.history[channelId][0].role !== 'user') {
            state.history[channelId].shift();
        }
    }
}

module.exports = searchHandler;