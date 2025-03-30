/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const {GoogleGenerativeAI} = require("@google/generative-ai");
const config = require('../config.json');
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const makePrompt = require('../functions/makePrompt');
const log = require('../utils/betterLogs');
const state = require('../initializers/state');

const generationConfig = {
    temperature: 1.15,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: 'text/plain'
};

async function model(history) {
    const models = {};

    for (const channel in history) {
        models[channel] = genAI.getGenerativeModel({
            model: config.GEMINI_MODEL,
            systemInstruction: await makePrompt(channel)
        });
    }

    log(`Created ${Object.keys(models).length} gemini models`, 'info', 'geminiClient.js');
    return models;
}

function promptLoader(model, history) {
    const instances = {};

    // might look shitty, but it works
    // you all know, when it works don't touch it
    for (const channel in history) {
        instances[channel] = model[channel].startChat({
            generationConfig,
            history: history[channel],
        });
    }

    log(`Created ${Object.keys(instances).length} gemini instances`, 'info', 'geminiClient.js');
    return instances;
}

/**
 * specific csatorna historyjat reseteli (mert jo)
 * @param model
 * @param history
 * @param channelId - csatorna id
 * @returns {*}
 */
function resetPrompt(model, history, channelId) {
    const instances = global.geminiSession;

    instances[channelId] = model[channelId].startChat({
        generationConfig,
        history: history[channelId],
    });

    log(`Reset ${channelId} gemini instance`, 'info', 'geminiClient.js');
    return instances;
}

module.exports = {promptLoader, model, resetPrompt};