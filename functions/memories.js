/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/



const state = require('../initializers/state');
const fs = require('fs');
const path = require('path');

async function getMemories(channelId) {
    const memories = state.memories[channelId];
    if (!memories) {
        // this should create a new memories array
        state.memories[channelId] = [];
        return "";
    }
    return memories.join("\n");

    // what the fuck did i do
    /*let memoryString = "";
    memoryString += '```\n';
    for (const memory of memories) {
        memoryString += `${memory}\n`;
    }
    memoryString += '```';
    return memoryString;*/
}

async function appendMemory(str, channelId) {
    const memories = state.memories[channelId];
    memories.push(str);

    const fpath = path.join(global.dirname, 'data', 'running', 'memories.json');
    fs.writeFileSync(fpath, JSON.stringify(memories, null, 2));
}

module.exports = {getMemories, appendMemory};