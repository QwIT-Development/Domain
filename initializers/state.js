/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/
const packageJson = require('../package.json');

module.exports = {
    msgCount: 0,
    resetCounts: 0,
    history: {},
    memories: {},
    commandIds: {},
    isSleeping: false,
    emojis: {},
    bannedSitesExact: new Set(),
    bannedSitesWildcard: [],
    logs: [],
    version: packageJson.version,
    retryCounts: {},
    sleepCycleTimer: null,
    usersCache: {},
    wsClients: new Set(),
    muteCount: 0,
    locationHelper: {
        init: "main"
    },
    summaries: {},
    strings: {},
    config: null,
    messageQueues: {},
    isProcessing: {}
};