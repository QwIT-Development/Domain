/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const {search} = require("../utils/searx");
const {addToHistory} = require("./messageHandler");

async function searchHandler(str, channelId, gemini) {
    const results = await search(str);
    await addToHistory('user', results, channelId);
    const continuation = await gemini[channelId].sendMessage(
        "Please analyze these search results and continue our conversation."
    );
    return continuation.response.text();
}

module.exports = searchHandler;