/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/



const state = require('../initializers/state');

async function getMemories(userId) {
    const memories = await state.memories[userId];
    if (!memories) {
        return "";
    }
    let memoryString = "";
    memoryString += '```\n';
    for (const memory of memories) {
        memoryString += `${memory}\n`;
    }
    memoryString += '```';
    return memoryString;
}

module.exports = {getMemories};