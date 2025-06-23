/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const state = require('./state');
const {loadConfig} = require('../initializers/configuration');
const config = loadConfig();
const {changeSpinnerText} = require('../utils/processInfo');
const {resolvePartialEmoji} = require("discord.js");

async function emojiResolver() {
    state.locationHelper.init = "emojiResolver.js/emojiResolver";
    await changeSpinnerText("Resolving emojis...");
    for (const emoji in config.EMOJIS) {
        const emojiId = config.EMOJIS[emoji];
        const emojiCache = await resolvePartialEmoji(emojiId);
        if (emojiCache) {
            emojiCache.name = emoji;
            state.emojis[emoji] = emojiCache
        }
    }
}

module.exports = emojiResolver;