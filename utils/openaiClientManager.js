/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const OpenAI = require("openai");
const { loadConfig } = require("../initializers/configuration");
const { GeminiWrapper } = require("./geminiWrapper");

class OpenAIClientManager {
  constructor(name, configKeys, fallbackConfig = {}) {
    this.name = name;
    this.configKeys = configKeys; // { apiKey, baseUrl, model }
    this.fallbackConfig = fallbackConfig;
    this.clients = [];
    this.currentClientIndex = 0;
    this.config = loadConfig();
    this.initializeClients();
  }

  initializeClients() {
    let apiKeys =
      this.getConfigValue(this.configKeys.apiKey) ||
      this.getConfigValue(this.fallbackConfig.apiKey) ||
      [];

    if (typeof apiKeys === "string") {
      apiKeys = [apiKeys];
    }

    apiKeys = apiKeys.filter((key) => key && key.trim().length > 0);

    if (apiKeys.length === 0) {
      throw new Error(`No valid API keys configured for ${this.name}`);
    }

    // Get base URL and model
    const baseURL =
      this.getConfigValue(this.configKeys.baseUrl) ||
      this.getConfigValue(this.fallbackConfig.baseUrl) ||
      undefined;

    const model =
      this.getConfigValue(this.configKeys.model) ||
      this.getConfigValue(this.fallbackConfig.model) ||
      "gpt-4o";

    this.clients = apiKeys.map((apiKey, index) => {
      const clientConfig = { apiKey: apiKey.trim() };
      if (baseURL) {
        clientConfig.baseURL = baseURL;
      }

      // gemini compat
      const isGeminiEndpoint =
        baseURL && baseURL.includes("generativelanguage.googleapis.com");

      return {
        client: isGeminiEndpoint
          ? new GeminiWrapper({
              apiKey: apiKey.trim(),
              baseURL: baseURL,
              model: model,
            })
          : new OpenAI(clientConfig),
        apiKey: apiKey.trim(),
        model,
        failures: 0,
        lastFailure: null,
        index,
        isGemini: isGeminiEndpoint,
      };
    });
  }

  getConfigValue(key) {
    if (!key) return undefined;
    return this.config[key];
  }

  getCurrentClient() {
    if (this.clients.length === 0) {
      throw new Error(`No clients available for ${this.name}`);
    }
    return this.clients[this.currentClientIndex];
  }

  rotateClient() {
    if (this.clients.length <= 1) {
      return false;
    }

    const oldIndex = this.currentClientIndex;
    this.currentClientIndex =
      (this.currentClientIndex + 1) % this.clients.length;
    console.log(
      `${this.name}: Rotating from client ${oldIndex} to client ${this.currentClientIndex}`,
    );
    return true;
  }

  isResourceExhaustedError(error) {
    if (!error.response?.data) return false;

    const errorData = error.response.data;
    const errorMessage = errorData.error?.message || "";
    const errorType = errorData.error?.type || "";
    const errorCode = errorData.error?.code || error.response.status;

    // OpenAI rate limit patterns
    const rateLimitPatterns = [
      "rate_limit_exceeded",
      "quota_exceeded",
      "resource_exhausted",
      "insufficient_quota",
      "billing_issue",
      "rate limit",
      "quota",
      "too many requests",
    ];

    const rateLimitStatusCodes = [429, 402, 403];

    return (
      rateLimitStatusCodes.includes(errorCode) ||
      rateLimitPatterns.some(
        (pattern) =>
          errorMessage.toLowerCase().includes(pattern) ||
          errorType.toLowerCase().includes(pattern),
      )
    );
  }

  markClientFailure(clientInfo, error) {
    clientInfo.failures++;
    clientInfo.lastFailure = new Date();
    console.warn(
      `${this.name}: Client ${clientInfo.index} failed (${clientInfo.failures} failures). Error: ${error.message}`,
    );
  }

  async callWithRetry(apiCall, maxRetries = null) {
    if (maxRetries === null) {
      maxRetries = this.clients.length;
    }

    let lastError = null;
    let attempts = 0;

    while (attempts < maxRetries) {
      const currentClient = this.getCurrentClient();
      attempts++;

      try {
        const result = await apiCall(currentClient.client, currentClient.model);

        currentClient.failures = 0;
        currentClient.lastFailure = null;

        return result;
      } catch (error) {
        lastError = error;
        this.markClientFailure(currentClient, error);

        if (this.isResourceExhaustedError(error)) {
          console.warn(
            `${this.name}: Resource exhausted on client ${currentClient.index}, trying next client...`,
          );

          if (!this.rotateClient()) {
            console.error(
              `${this.name}: All clients exhausted, no fallback available`,
            );
            throw error;
          }

          continue;
        } else {
          console.error(
            `${this.name}: Non-rate-limit error on client ${currentClient.index}:`,
            error.message,
          );
          throw error;
        }
      }
    }

    console.error(`${this.name}: All ${attempts} client attempts failed`);
    throw lastError;
  }

  async createChatCompletion(options) {
    return await this.callWithRetry(async (client, model) => {
      const requestOptions = {
        model,
        ...options,
      };

      if (client.isGemini) {
        return await client.createChatCompletion(requestOptions);
      } else {
        return await client.chat.completions.create(requestOptions);
      }
    });
  }

  getStatus() {
    return {
      name: this.name,
      totalClients: this.clients.length,
      currentClient: this.currentClientIndex,
      clientStatus: this.clients.map((c) => ({
        index: c.index,
        failures: c.failures,
        lastFailure: c.lastFailure,
        isCurrent: c.index === this.currentClientIndex,
        isGemini: c.isGemini || false,
      })),
    };
  }
}

module.exports = { OpenAIClientManager };
