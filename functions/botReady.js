/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const { ActivityType: {Custom} } = require("discord.js");
const state = require("../initializers/state");

async function botReady(client) {
    state.locationHelper.init = "botReady.js/botReady";
    await client.user.setPresence({
        activities: [{
            name: 'Mention me or reply to my message!',
            type: Custom
        }],
        status: 'online'
    })
}

async function botSleeping(client, time) {
    await client.user.setPresence({
        activities: [{
            name: `Alszok ${time}-ig`,
            type: Custom
        }],
        status: 'dnd'
    })

    // reset history, like nothing happened yesterday
    for (const channel in state.history) {
        state.history[channel] = [];
        state.resetCounts += 1;
    }
}

async function botOffline(client) {
    await client.user.setPresence({
        activities: [],
        status: "invisible"
    })
}

module.exports = {botReady, botSleeping, botOffline};