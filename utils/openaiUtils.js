/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

/**
 * Processes streaming OpenAI response chunks and accumulates tool calls and content
 * @param {AsyncIterable} response - The streaming response from OpenAI chat completion
 * @returns {Promise<{text: string, tool_calls?: Array}>} - Accumulated response text and tool calls
 */
async function processOpenAIStreamingResponse(response) {
  let responseText = "";
  let tool_calls = null;

  try {
    if (
      response &&
      response.choices &&
      response.choices[0] &&
      !response[Symbol.asyncIterator]
    ) {
      const choice = response.choices[0];
      if (choice.message) {
        return {
          text: choice.message.content || "",
          tool_calls: choice.message.tool_calls || null,
        };
      }
    }

    if (!response || typeof response[Symbol.asyncIterator] !== "function") {
      throw new Error(`Response is not an async iterable: ${typeof response}`);
    }

    for await (const chunk of response) {
      if (!chunk || !chunk.choices || !chunk.choices[0]) {
        continue;
      }

      const delta = chunk.choices[0].delta;
      if (!delta) {
        continue;
      }

      if (delta.tool_calls) {
        if (!tool_calls) {
          tool_calls = [];
        }

        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index || 0;

          if (!tool_calls[index]) {
            tool_calls[index] = {
              id: toolCall.id,
              type: toolCall.type || "function",
              function: {
                name: toolCall.function?.name || "",
                arguments: toolCall.function?.arguments || "",
              },
            };
          } else {
            if (toolCall.function?.arguments) {
              tool_calls[index].function.arguments +=
                toolCall.function.arguments;
            }
            if (toolCall.function?.name) {
              tool_calls[index].function.name = toolCall.function.name;
            }
          }
        }
      }

      if (delta.content) {
        responseText += delta.content;
      }
    }

    const result = { text: responseText.trim() };
    if (tool_calls && tool_calls.length > 0) {
      result.tool_calls = tool_calls;
    }
    return result;
  } catch (error) {
    console.error("Error processing streaming response:", error.message);
    throw error;
  }
}

module.exports = {
  processOpenAIStreamingResponse,
};
