/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const config = require('../config.json');
const path = require('path');
const fs = require('fs');
const log = require('../utils/betterLogs');

function formatDate(date) {
    const year = date.getFullYear();
    // noinspection JSCheckFunctionSignatures
    const month = date.toLocaleString(config.LOCALE, {month: 'short'});
    const day = String(date.getDate()).padStart(2, '0');
    // noinspection JSCheckFunctionSignatures
    const weekday = date.toLocaleString(config.LOCALE, {weekday: 'long'});
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}. ${month} ${day}. ${weekday} ${hour}:${minute}`;
}


// TODO: finish prompt gen func
async function makePrompt() {
    // noinspection JSUnresolvedReference
    const aliases = config.ALIASES;
    let prompt;

    // try to load prompt, if it's nonexistent, return empty string, which will defaults
    // gemini to its default prompt
    try {
        // path: ./prompts/<PROMPT_PATH>
        prompt = fs.readFileSync(path.join(global.dirname, 'prompts', config.PROMPT_PATH), 'utf8');
    } catch (e) {
        log(`Failed to create prompt: ${e}`, 'error', 'makeprompt.js');
        return "";
    }

    // load mute words, for later use
    let muteWords;
    try {
        // path: ./data/muteWords.json
        muteWords = fs.readFileSync(path.join(global.dirname, 'data', 'muteWords.json'), 'utf8');
        muteWords = JSON.parse(muteWords);
    } catch (e) {
        log(`Failed to load mute words: ${e}`, 'error', 'makeprompt.js');
        muteWords = [];
    }

    // insert aliases to ${ALIASES}
    if (prompt.includes("${ALIASES}")) {
        prompt = prompt.replace("${ALIASES}", aliases.join(', '));
    }

    // set current time in prompt ${CURRENT_TIME}
    // date will look like this: 2025. jan 01. Wednesday 12:00
    if (prompt.includes("${CURRENT_TIME}")) {
        prompt = prompt.replace("${CURRENT_TIME}", formatDate(new Date()));
    }

    // load wiki contents, if possible
    if (prompt.includes("${WIKI_CONTENT}")) {

    }

    // add words, what the bot don't like and will mute users on trigger
    if (prompt.includes("${MUTE_WORDS}")) {
        prompt = prompt.replace("${MUTE_WORDS}", muteWords.join(', '));
    }

    return prompt;
}


module.exports = makePrompt;