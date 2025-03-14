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

async function promptLoader() {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: await makePrompt()
    });

    return model.startChat({
        generationConfig,
        history: [],
    });
}

module.exports = promptLoader;