/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const {GoogleGenAI} = require("@google/genai");
const config = require('../config.json');
const genAI = new GoogleGenAI({apiKey: config.GEMINI_API_KEY});
const {makePrompt} = require('../functions/makePrompt');
const log = require('../utils/betterLogs');
const {changeSpinnerText} = require('../utils/processInfo');

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseModalities: [],
    responseMimeType: 'text/plain',
    systemInstruction: '' // new genAI thing
};

async function model(history, showLog = true) {
    await changeSpinnerText("Creating gemini models...");
    const models = {};

    for (const channel in history) {
        models[channel] = genAI.getGenerativeModel({
            model: config.GEMINI_MODEL,
            systemInstruction: await makePrompt(channel, showLog)
        });
    }

    if (showLog) {
        log(`Created ${Object.keys(models).length} gemini models`, 'info', 'geminiClient.js');
    }
    return models;
}

/*
const response = genAI.models.generateContentStream({
    model,
    config: generationConfig,
    contents: 'asd'
}).then(response => {
    for (const chunk of response) {
        console.log(chunk.text);
    }
})
*/
// ^ will be used in the future

function promptLoader(model, history) {
    changeSpinnerText("Creating gemini instances...").then();
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
 * @param showLog
 * @returns {*}
 */
function resetPrompt(model, history, channelId, showLog = true) {
    const instances = global.geminiSession;

    instances[channelId] = model[channelId].startChat({
        generationConfig,
        history: history[channelId],
    });

    if (showLog) {
        log(`Reset ${channelId} gemini instance`, 'info', 'geminiClient.js');
    }
    return instances;
}

module.exports = {promptLoader, model, resetPrompt};