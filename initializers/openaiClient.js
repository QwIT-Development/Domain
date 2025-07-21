/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const OpenAI = require("openai");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { makePrompt } = require("../functions/makePrompt");
const log = require("../utils/betterLogs");
const { changeSpinnerText, stopSpinner } = require("../utils/processInfo");
const state = require("./state");
const tools = require("./tools");
const { OpenAIClientManager } = require("../utils/openaiClientManager");

async function model(history, showLog = true) {
  state.locationHelper.init = "openaiClient.js/model";
  if (showLog) {
    await changeSpinnerText("Creating OpenAI models...");
  }
  const models = {};

  for (const channel in history) {
    models[channel] = {
      temperature: 1,
      top_p: 0.95,
      max_tokens: 8192,
      stream: true,
      messages: [],
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    };

    const systemInstruction = await makePrompt(channel, showLog);
    state.prompts[channel] = systemInstruction;
  }

  if (showLog) {
    log(
      `Created ${Object.keys(models).length} OpenAI models`,
      "info",
      "openaiClient.js",
    );
    await stopSpinner(true);
  }
  return models;
}

const messageGenerationClient = new OpenAIClientManager("MessageGeneration", {
  apiKey: "OPENAI_API_KEY",
  baseUrl: "OPENAI_BASE_URL",
  model: "OPENAI_MODEL",
});

const searchClient = new OpenAIClientManager(
  "Search",
  {
    apiKey: "SEARCH_OPENAI_API_KEY",
    baseUrl: "SEARCH_OPENAI_BASE_URL",
    model: "SEARCH_OPENAI_MODEL",
  },
  {
    apiKey: "OPENAI_API_KEY",
    baseUrl: "OPENAI_BASE_URL",
    model: "OPENAI_MODEL",
  },
);

const shouldRespondClient = new OpenAIClientManager(
  "ShouldRespond",
  {
    apiKey: "SHOULDRESPOND_OPENAI_API_KEY",
    baseUrl: "SHOULDRESPOND_OPENAI_BASE_URL",
    model: "SHOULDRESPOND_OPENAI_MODEL",
  },
  {
    apiKey: "OPENAI_API_KEY",
    baseUrl: "OPENAI_BASE_URL",
    model: "OPENAI_MODEL",
  },
);

const openai = messageGenerationClient.getCurrentClient().client;

module.exports = {
  model,
  openai,
  messageGenerationClient,
  searchClient,
  shouldRespondClient,
};
