/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/
const packageJson = require('../package.json');

module.exports = {
    msgCount: 0,
    resetCounts: 0,
    history: {},
    memories: [],
    reputation: {},
    banlist: {},
    commandIds: {},
    isSleeping: false,
    emojis: {},
    bannedSites: [],
    logs: [],
    version: packageJson.version,
};