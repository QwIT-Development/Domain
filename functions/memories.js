/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/



const state = require('../initializers/state');
const fs = require('fs');
const path = require('path');

async function getMemories() {
    const memories = state.memories;
    if (!memories) {
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

async function appendMemory(str) {
    const memories = state.memories;
    memories.push(str);

    const fpath = path.join(global.dirname, 'data', 'running', 'memories.json');
    fs.writeFileSync(fpath, JSON.stringify(memories, null, 2));
}

module.exports = {getMemories, appendMemory};