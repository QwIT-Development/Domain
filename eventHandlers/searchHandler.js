/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const {search} = require("../utils/searx");
const log = require("../utils/betterLogs");
const state = require("../initializers/state");
const config = require("../config.json");
const {genAI} = require("../initializers/geminiClient");
const {addToHistory} = require('../utils/historyUtils'); // hopefully sonar shut up

async function searchHandler(str, channelId, gemini) {
    const results = await search(str, genAI);
    await addToHistory('user', results, channelId);
    await addToHistory('user', "Please analyze these search results and continue our conversation.", channelId);
    const continuation = await genAI.models.generateContentStream({
        model: config.GEMINI_MODEL,
        config: gemini[channelId],
        contents: state.history[channelId], // Changed 'prompt' to 'contents'
    });
    let output = "";
    for await (const chunk of continuation) {
        if (chunk.text) {
            output += chunk.text.trim();
        }
    }
    return output;
}

module.exports = searchHandler;