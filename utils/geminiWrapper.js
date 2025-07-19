/*
        Domain-Unchained, Gemini wrapper that ensures proper streaming responses
        Copyright (C) 2025 Anchietae
*/

const OpenAI = require("openai");
const log = require("./betterLogs");

class GeminiWrapper {
  constructor(config) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL:
        config.baseURL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    this.model = config.model || "gemini-2.0-flash-exp";
    this.isGemini = true;
  }

  async *createStreamingGenerator(response) {
    try {
      if (response && typeof response[Symbol.asyncIterator] === "function") {
        for await (const chunk of response) {
          yield this.normalizeChunk(chunk);
        }
        return;
      }

      if (response && response.choices && response.choices[0]) {
        const choice = response.choices[0];

        if (choice.message) {
          yield {
            id: response.id || `chatcmpl-${Date.now()}`,
            object: "chat.completion.chunk",
            created: response.created || Math.floor(Date.now() / 1000),
            model: response.model || this.model,
            choices: [
              {
                index: 0,
                delta: {
                  role: choice.message.role || "assistant",
                },
                finish_reason: null,
              },
            ],
          };

          if (choice.message.content) {
            const content = choice.message.content;
            const chunkSize = 50;

            for (let i = 0; i < content.length; i += chunkSize) {
              const chunk = content.slice(i, i + chunkSize);
              yield {
                id: response.id || `chatcmpl-${Date.now()}`,
                object: "chat.completion.chunk",
                created: response.created || Math.floor(Date.now() / 1000),
                model: response.model || this.model,
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: chunk,
                    },
                    finish_reason: null,
                  },
                ],
              };
            }
          }

          if (choice.message.tool_calls) {
            for (const toolCall of choice.message.tool_calls) {
              yield {
                id: response.id || `chatcmpl-${Date.now()}`,
                object: "chat.completion.chunk",
                created: response.created || Math.floor(Date.now() / 1000),
                model: response.model || this.model,
                choices: [
                  {
                    index: 0,
                    delta: {
                      tool_calls: [
                        {
                          index: 0,
                          id: toolCall.id,
                          type: toolCall.type || "function",
                          function: {
                            name: toolCall.function?.name,
                            arguments: toolCall.function?.arguments,
                          },
                        },
                      ],
                    },
                    finish_reason: null,
                  },
                ],
              };
            }
          }

          yield {
            id: response.id || `chatcmpl-${Date.now()}`,
            object: "chat.completion.chunk",
            created: response.created || Math.floor(Date.now() / 1000),
            model: response.model || this.model,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: choice.finish_reason || "stop",
              },
            ],
          };
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      log(
        `Error in streaming generator: ${error.message}`,
        "error",
        "geminiWrapper.js",
      );
      throw error;
    }
  }

  normalizeChunk(chunk) {
    if (!chunk || !chunk.choices) {
      return chunk;
    }

    return {
      ...chunk,
      choices: chunk.choices.map((choice) => ({
        ...choice,
        delta: choice.delta || {},
      })),
    };
  }

  async createChatCompletion(options) {
    const {
      model = this.model,
      messages,
      tools,
      tool_choice,
      stream = false,
      ...otherOptions
    } = options;

    const requestOptions = {
      model,
      messages,
      ...otherOptions,
    };

    if (tools && tools.length > 0) {
      requestOptions.tools = tools;

      if (tool_choice) {
        if (tool_choice === "auto" || tool_choice === "required") {
          requestOptions.tool_choice = tool_choice;
        } else if (typeof tool_choice === "object") {
          requestOptions.tool_choice = "required";
        }
      }
    }

    try {
      if (stream) {
        requestOptions.stream = true;
        const response =
          await this.client.chat.completions.create(requestOptions);
        return this.createStreamingGenerator(response);
      } else {
        const response =
          await this.client.chat.completions.create(requestOptions);
        return response;
      }
    } catch (error) {
      if (error.response?.data?.error?.message?.includes("tool") && tools) {
        log(
          "Tool calling failed, retrying without tools",
          "warn",
          "geminiWrapper.js",
        );

        const retryOptions = { ...requestOptions };
        delete retryOptions.tools;
        delete retryOptions.tool_choice;

        if (stream) {
          const response =
            await this.client.chat.completions.create(retryOptions);
          return this.createStreamingGenerator(response);
        } else {
          return await this.client.chat.completions.create(retryOptions);
        }
      }

      throw error;
    }
  }

  async createChatCompletionStream(options) {
    return await this.createChatCompletion({ ...options, stream: true });
  }

  async testStreaming() {
    try {
      const stream = await this.createChatCompletionStream({
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 10,
      });

      let chunks = 0;
      for await (const chunk of stream) {
        chunks++;
        if (chunks >= 3) break;
      }

      return chunks > 0;
    } catch (error) {
      log(
        `Streaming test failed: ${error.message}`,
        "error",
        "geminiWrapper.js",
      );
      return false;
    }
  }
}

module.exports = { GeminiWrapper };
