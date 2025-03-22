/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const {GoogleGenerativeAI} = require("@google/generative-ai");
const config = require('../config.json');
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const makePrompt = require('../functions/makePrompt');

const generationConfig = {
    temperature: 1.15,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: 'text/plain'
};

async function model() {
    return genAI.getGenerativeModel({
        model: config.GEMINI_MODEL,
        systemInstruction: await makePrompt()
    });
}

function promptLoader(model, history) {
    return model.startChat({
        generationConfig,
        history: history,
    });
}

module.exports = {promptLoader, model};