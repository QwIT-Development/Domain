/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const { ActivityType: {Custom} } = require("discord.js");

// TODO: apply ready presence when bot is ready
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
}

module.exports = {botReady, botSleeping};