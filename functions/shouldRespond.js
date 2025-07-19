/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { loadConfig } = require("../initializers/configuration");
const { shouldRespondClient } = require("../initializers/openaiClient");
const { processOpenAIStreamingResponse } = require("../utils/openaiUtils");
const config = loadConfig();

const tools = [
  {
    type: "function",
    function: {
      name: "respond",
      description:
        "Use this function to decide whether the bot should reply to the user's message. The 'shouldRespond' parameter indicates the decision, 'respondReason' provides a brief justification for that decision, and 'reply' indicates whether this is a direct reply to the message.",
      parameters: {
        type: "object",
        properties: {
          shouldRespond: {
            type: "boolean",
          },
          respondReason: {
            type: "string",
          },
          reply: {
            type: "boolean",
          },
        },
        required: ["shouldRespond", "respondReason", "reply"],
      },
    },
  },
];

async function shouldRespond(message, client, history, prompt) {
  const newPrompt = `Your primary task is to act as a decision-making module for a Discord bot named ${client.user.username}.
You will analyze a user's message and the bot's configured personality to determine if the bot should send a response.

First, consider the bot's persona and instructions, provided below under "Bot's Internal Prompt". This gives you context on how the bot should behave.
\`\`\`
${prompt}
\`\`\`

Next, analyze the user's message in the context of the conversation.
\`\`\`
${message.content}
\`\`\`

---
**CRITICAL REQUIREMENT - YOU MUST FOLLOW THIS:**

YOU ARE REQUIRED TO USE THE 'respond' FUNCTION. NO OTHER RESPONSE IS ACCEPTABLE.
DO NOT generate any text, explanations, or reasoning outside of the function call.
DO NOT respond with plain text.
DO NOT provide analysis or commentary.
YOUR ENTIRE RESPONSE MUST BE A SINGLE FUNCTION CALL TO 'respond'.

MANDATORY: Call the 'respond' function with these exact parameters:
- 'shouldRespond': A boolean (true or false) indicating if the bot should reply.
- 'respondReason': A brief string explaining your reasoning.
- 'reply': A boolean (true or false) indicating if this should be a direct reply to the message. Only use true if the response is intended for a single specific user.

FAILURE TO USE THE FUNCTION WILL RESULT IN AN ERROR. YOU MUST USE THE 'respond' FUNCTION.`;

  const defaultConfig = {
    temperature: 0.3, // Lower temperature for more consistent function calling
    top_p: 0.95,
    max_tokens: 8192,
  };

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const historyCopy = [...history];

      if (attempt > 0) {
        console.log(
          `Attempt ${attempt + 1}/${maxRetries} to get function call from AI...`,
        );
      }

      const messages = [
        { role: "system", content: newPrompt },
        ...historyCopy.map((item) => ({
          role: item.role === "model" ? "assistant" : item.role,
          content: item.parts?.[0]?.text || "",
        })),
      ];

      const result = await shouldRespondClient.createChatCompletion({
        messages: messages,
        temperature: defaultConfig.temperature,
        top_p: defaultConfig.top_p,
        max_tokens: defaultConfig.max_tokens,
        tools: tools,
        tool_choice: "required",
        stream: true,
      });

      const streamResult = await processOpenAIStreamingResponse(result);

      if (streamResult.tool_calls && streamResult.tool_calls.length > 0) {
        const args = JSON.parse(streamResult.tool_calls[0].function.arguments);
        if (attempt > 0) {
          console.log("Successfully received function call from AI");
        }
        return args;
      } else {
        attempt++;
      }
    } catch (error) {
      console.error(`Error in shouldRespond attempt ${attempt + 1}:`, error);
      if (error.response?.data) {
        console.error("OpenAI API response data:", error.response.data);
      }
      attempt++;

      if (attempt >= maxRetries) {
        console.error("Max retries reached. Returning default response.");
        return {
          shouldRespond: false,
          respondReason:
            "Failed to get function call from AI after maximum retries.",
          reply: false,
        };
      }
    }
  }

  // Fallback if all retries failed
  console.error("All attempts failed to get function call from AI.");
  return {
    shouldRespond: false,
    respondReason:
      "AI failed to make required function call after all retry attempts.",
    reply: false,
  };
}

module.exports = { shouldRespond };
