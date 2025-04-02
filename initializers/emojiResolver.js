/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const state = require('./state');
const config = require('../config.json');
const {resolvePartialEmoji} = require("discord.js");

async function emojiResolver() {
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