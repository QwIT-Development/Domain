/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { GoogleGenAI } = require("@google/genai");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { makePrompt } = require("../functions/makePrompt");
const log = require("../utils/betterLogs");
const { changeSpinnerText } = require("../utils/processInfo");
const state = require("./state");
const tools = require("./tools");

async function model(history, showLog = true) {
  state.locationHelper.init = "geminiClient.js/model";
  await changeSpinnerText("Creating gemini models...");
  const models = {};

  for (const channel in history) {
    models[channel] = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseModalities: [],
      responseMimeType: "text/plain",
      systemInstruction: await makePrompt(channel, showLog),
      thinkingConfig: {
        thinkingBudget: config.ENABLE_THINKING ? -1 : 0,
      },
      tools,
    };
    state.prompts[channel] = models[channel].systemInstruction;
  }

  if (showLog) {
    log(
      `Created ${Object.keys(models).length} gemini models`,
      "info",
      "geminiClient.js",
    );
  }
  return models;
}

// I think this should be exported, then we use it later
const genAI = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
module.exports = { model, genAI };
