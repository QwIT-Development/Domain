const {GoogleGenerativeAI} = require("@google/generative-ai");

const config = require('../config.json');
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
});
const generationConfig = {
    temperature: 1.15,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};


const chatSession = model.startChat({
    generationConfig,
    history: [],
});

module.exports = chatSession;