/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const { ActivityType: {Custom} } = require("discord.js");
const state = require("../initializers/state");
const {resetPrompt} = require("../initializers/geminiClient");

async function botReady(client) {
    await client.user.setPresence({
        activities: [{
            name: 'Említs meg, vagy válaszolj egy üzenetemre!',
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
        global.geminiSession = resetPrompt(global.geminiModel, state.history, channel);
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