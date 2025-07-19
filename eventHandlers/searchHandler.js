/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { search } = require("../utils/searx");
const { searchClient } = require("../initializers/openaiClient");

async function searchHandler(str) {
  return await search(str, searchClient);
}

module.exports = searchHandler;
