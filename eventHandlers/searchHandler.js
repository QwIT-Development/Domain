/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const {search} = require("../utils/searx");
const {genAI} = require("../initializers/geminiClient");

async function searchHandler(str) {
    return await search(str, genAI);
}

module.exports = searchHandler;