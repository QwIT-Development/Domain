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

  for await (const chunk of response) {
    const delta = chunk.choices?.[0]?.delta;
    
    if (delta?.tool_calls) {
      if (!tool_calls) {
        tool_calls = [];
      }
      // Handle tool calls accumulation for streaming
      for (const toolCall of delta.tool_calls) {
        if (!tool_calls[toolCall.index]) {
          tool_calls[toolCall.index] = {
            id: toolCall.id,
            type: toolCall.type,
            function: {
              name: toolCall.function?.name || "",
              arguments: toolCall.function?.arguments || ""
            }
          };
        } else {
          // Accumulate arguments for streaming
          if (toolCall.function?.arguments) {
            tool_calls[toolCall.index].function.arguments += toolCall.function.arguments;
          }
        }
      }
    } else if (delta?.content) {
      responseText += delta.content;
    }
  }

  const result = { text: responseText.trim() };
  if (tool_calls && tool_calls.length > 0) {
    result.tool_calls = tool_calls;
  }
  return result;
}

module.exports = {
  processOpenAIStreamingResponse
};