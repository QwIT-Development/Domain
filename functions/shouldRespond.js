/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const { GoogleGenAI } = require("@google/genai");
const { loadConfig } = require('../initializers/configuration');
const config = loadConfig();

let genAI = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
if (config.CR_GEMINI_API_KEY?.length > 0) {
    genAI = new GoogleGenAI({ apiKey: config.CR_GEMINI_API_KEY });
}

const tools = [
    {
        functionDeclarations: [
            {
                "name": "respond",
                "description": "Use this function to decide whether the bot should reply to the user's message. The 'shouldRespond' parameter indicates the decision, and 'respondReason' provides a brief justification for that decision.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "shouldRespond": {
                            "type": "boolean"
                        },
                        "respondReason": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "shouldRespond",
                        "respondReason"
                    ]
                }
            }
        ]
    }
]

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
**Final Output Instruction:**

You MUST use the 'respond' tool to indicate your decision. Do not output any other text.
Based on your analysis, call the 'respond' function with the following parameters:
- 'shouldRespond': A boolean (true or false) indicating if the bot should reply.
- 'respondReason': A brief string explaining your reasoning.

Your response will be a function call to the 'respond' tool.`;

    const defaultConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'text/plain',
        systemInstruction: newPrompt,
        tools: tools
    };

    try {
        let functionCalls = null;
        const historyCopy = [...history];
        const result = await genAI.models.generateContentStream({
            model: "gemini-2.0-flash",
            config: defaultConfig,
            contents: historyCopy,
        });

        for await (const chunk of result) {
            if (chunk.functionCalls) {
                if (!functionCalls) {
                    functionCalls = [];
                }
                functionCalls.push(...chunk.functionCalls);
            }
        }
        if (!functionCalls || functionCalls.length === 0) {
            console.error('No function calls found in the response.');
            return {
                shouldRespond: false,
                respondReason: 'No function calls found in the response.'
            };
        }
        const args = functionCalls[0].args;
        return args;
    } catch (error) {
        console.error('Error in shouldRespond:', error);
        if (error.response?.data) {
            console.error('Gemini API response data:', error.response.data);
        }
        return {
            shouldRespond: false,
            respondReason: 'An error occurred while processing the request.'
        };
    }
}

module.exports = { shouldRespond };
