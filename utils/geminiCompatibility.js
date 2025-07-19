/*
        Domain-Unchained, Gemini compatibility layer for OpenAI SDK
        Copyright (C) 2025 Anchietae
*/

const OpenAI = require("openai");
const log = require("./betterLogs");

class GeminiCompatibleClient {
  constructor(config) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL:
        config.baseURL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    this.model = config.model || "gemini-2.0-flash-exp";
    this.supportsToolCalling = this.checkToolCallSupport();
  }

  checkToolCallSupport() {
    const toolSupportedModels = [
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash-lite-preview",
    ];

    return toolSupportedModels.some((model) => this.model.includes(model));
  }

  preprocessTools(tools) {
    if (!tools || !Array.isArray(tools)) return undefined;

    return tools.map((tool) => {
      if (tool.type === "function") {
        const params = tool.function.parameters;
        if (params && params.properties) {
          const cleanedProperties = {};
          Object.entries(params.properties).forEach(([key, value]) => {
            cleanedProperties[key] = {
              ...value,
              description: value.description || `Parameter: ${key}`,
            };
          });

          return {
            ...tool,
            function: {
              ...tool.function,
              parameters: {
                ...params,
                properties: cleanedProperties,
              },
            },
          };
        }
      }
      return tool;
    });
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
      if (!this.supportsToolCalling) {
        log(
          `Warning: Model ${model} may not support tool calling`,
          "warn",
          "geminiCompatibility.js",
        );
        log(
          "Proceeding without tools due to model limitations",
          "info",
          "geminiCompatibility.js",
        );
      } else {
        requestOptions.tools = this.preprocessTools(tools);

        if (tool_choice) {
          if (tool_choice === "auto") {
            requestOptions.tool_choice = "auto";
          } else if (tool_choice === "required") {
            log(
              "tool_choice 'required' might not be supported, using 'auto'",
              "warn",
              "geminiCompatibility.js",
            );
            requestOptions.tool_choice = "auto";
          } else if (typeof tool_choice === "object") {
            log(
              "Specific tool choice might not be supported, using 'auto'",
              "warn",
              "geminiCompatibility.js",
            );
            requestOptions.tool_choice = "auto";
          }
        }
      }
    }

    try {
      if (stream) {
        const response =
          await this.client.chat.completions.create(requestOptions);

        if (response && typeof response[Symbol.asyncIterator] === "function") {
          return this.postprocessStreamResponse(response);
        }

        return this.convertToStreamingFormat(response);
      } else {
        // Handle non-streaming
        const response =
          await this.client.chat.completions.create(requestOptions);
        return this.postprocessResponse(response);
      }
    } catch (error) {
      return this.handleError(error, requestOptions);
    }
  }

  postprocessResponse(response) {
    if (response.choices && response.choices[0]) {
      const choice = response.choices[0];

      if (choice.message && choice.message.tool_calls) {
        choice.message.tool_calls = choice.message.tool_calls.map(
          (toolCall) => {
            return {
              id:
                toolCall.id ||
                `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: toolCall.type || "function",
              function: {
                name: toolCall.function?.name || toolCall.name,
                arguments:
                  typeof toolCall.function?.arguments === "string"
                    ? toolCall.function.arguments
                    : JSON.stringify(
                        toolCall.function?.arguments ||
                          toolCall.arguments ||
                          {},
                      ),
              },
            };
          },
        );
      }
    }

    return response;
  }

  postprocessStreamResponse(stream) {
    const self = this;

    return (async function* () {
      try {
        for await (const chunk of stream) {
          if (chunk && chunk.choices) {
            const processedChunk = {
              ...chunk,
              choices: chunk.choices.map((choice) => ({
                ...choice,
                delta: choice.delta || {},
                ...(choice.delta &&
                  choice.delta.tool_calls && {
                    delta: {
                      ...choice.delta,
                      tool_calls: choice.delta.tool_calls.map((toolCall) => ({
                        id:
                          toolCall.id ||
                          `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: toolCall.type || "function",
                        function: {
                          name: toolCall.function?.name || toolCall.name,
                          arguments:
                            typeof toolCall.function?.arguments === "string"
                              ? toolCall.function.arguments
                              : JSON.stringify(
                                  toolCall.function?.arguments ||
                                    toolCall.arguments ||
                                    {},
                                ),
                        },
                      })),
                    },
                  }),
              })),
            };
            yield processedChunk;
          } else {
            yield chunk;
          }
        }
      } catch (error) {
        log(
          `Stream processing error: ${error.message}`,
          "error",
          "geminiCompatibility.js",
        );
        throw error;
      }
    })();
  }

  async handleError(error, originalRequest) {
    log(
      `Gemini API error: ${error.message}`,
      "error",
      "geminiCompatibility.js",
    );

    if (error.response?.data) {
      const errorData = error.response.data;

      if (
        errorData.error?.message?.includes("tool") ||
        errorData.error?.message?.includes("function")
      ) {
        log(
          "Tool calling error detected, retrying without tools",
          "warn",
          "geminiCompatibility.js",
        );

        const retryOptions = { ...originalRequest };
        delete retryOptions.tools;
        delete retryOptions.tool_choice;

        try {
          const response =
            await this.client.chat.completions.create(retryOptions);

          if (
            response.choices &&
            response.choices[0] &&
            response.choices[0].message
          ) {
            response.choices[0].message.content =
              (response.choices[0].message.content || "") +
              "\n\n*Note: Tool calling was disabled due to compatibility issues.*";
          }

          return this.postprocessResponse(response);
        } catch (retryError) {
          log(
            `Retry without tools also failed: ${retryError.message}`,
            "error",
            "geminiCompatibility.js",
          );
          throw retryError;
        }
      }

      if (errorData.error?.message?.includes("model")) {
        log(
          "Model error detected, might need to use a different model",
          "error",
          "geminiCompatibility.js",
        );
      }

      if (error.response.status === 401 || error.response.status === 403) {
        log(
          "Authentication error - check your Gemini API key",
          "error",
          "geminiCompatibility.js",
        );
      }

      // Handle rate limiting
      if (error.response.status === 429) {
        log("Rate limited by Gemini API", "warn", "geminiCompatibility.js");
      }
    }

    throw error;
  }

  async createChatCompletionStream(options) {
    const streamOptions = { ...options, stream: true };
    return await this.createChatCompletion(streamOptions);
  }

  convertToStreamingFormat(response) {
    return (async function* () {
      if (response && response.choices && response.choices[0]) {
        const choice = response.choices[0];

        yield {
          id: response.id,
          object: "chat.completion.chunk",
          created: response.created,
          model: response.model,
          choices: [
            {
              index: 0,
              delta: {
                role: choice.message?.role,
                content: choice.message?.content,
                tool_calls: choice.message?.tool_calls,
              },
              finish_reason: choice.finish_reason,
            },
          ],
        };

        yield {
          id: response.id,
          object: "chat.completion.chunk",
          created: response.created,
          model: response.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: choice.finish_reason,
            },
          ],
        };
      }
    })();
  }
}

function createGeminiClient(config) {
  return new GeminiCompatibleClient(config);
}

module.exports = {
  GeminiCompatibleClient,
  createGeminiClient,
};
