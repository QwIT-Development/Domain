/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const {GoogleGenAI} = require("@google/genai");
const config = require('../config.json');
const {makePrompt} = require('../functions/makePrompt');
const log = require('../utils/betterLogs');
const {changeSpinnerText} = require('../utils/processInfo');

async function model(history, showLog = true) {
    await changeSpinnerText("Creating gemini models...");
    const models = {};

    for (const channel in history) {
        models[channel] = {
            temperature: config.ENABLE_THINKING ? 1.55 : 1,
            topP: config.ENABLE_THINKING ? 1 : 0.9,
            topK: 64,
            maxOutputTokens: 8192,
            responseModalities: [],
            responseMimeType: 'text/plain',
            systemInstruction: await makePrompt(channel, showLog),
            thinkingConfig: {
                thinkingBudget: config.ENABLE_THINKING ? 8000 : 0,
            },
        };
    }

    if (showLog) {
        log(`Created ${Object.keys(models).length} gemini models`, 'info', 'geminiClient.js');
    }
    return models;
}

// i think this should be exported, then we use it later
const genAI = new GoogleGenAI({apiKey: config.GEMINI_API_KEY});
module.exports = {model, genAI};