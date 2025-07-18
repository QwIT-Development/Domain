/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const OpenAI = require("openai");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { makePrompt } = require("../functions/makePrompt");
const log = require("../utils/betterLogs");
const { changeSpinnerText } = require("../utils/processInfo");
const state = require("./state");
const tools = require("./tools");

async function model(history, showLog = true) {
  state.locationHelper.init = "openaiClient.js/model";
  await changeSpinnerText("Creating OpenAI models...");
  const models = {};

  for (const channel in history) {
    models[channel] = {
      temperature: 1,
      top_p: 0.95,
      max_tokens: 8192,
      stream: true,
      messages: [], // Will be populated from history
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: "auto",
    };
    
    // Store system instruction separately for OpenAI
    const systemInstruction = await makePrompt(channel, showLog);
    state.prompts[channel] = systemInstruction;
  }

  if (showLog) {
    log(
      `Created ${Object.keys(models).length} OpenAI models`,
      "info",
      "openaiClient.js",
    );
  }
  return models;
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
module.exports = { model, openai };
