/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const { checkAuthors, checkForMentions } = require('../functions/checkAuthors');
const state = require('../initializers/state');
const log = require('../utils/betterLogs');
const { reputation } = require('../db/reputation');
const parseBotCommands = require('./botCommands');
const fs = require('fs');
const path = require('path');
const { RNGArray } = require('../functions/rng');
const uploadFilesToGemini = require('../eventHandlers/fileUploader');
const { loadConfig } = require('../initializers/configuration');
const config = loadConfig();
const { formatDate } = require('../functions/makePrompt');
const { genAI } = require('../initializers/geminiClient');
const { bondUpdater } = require('../functions/usageRep');
const { addToHistory, trimHistory } = require('../utils/historyUtils');

function simplifyEmoji(content) {
    // discord's custom emoji format: <:name:id>
    const customEmojiRegex = /<:(\w+):\d+>/g;
    // :name:
    content = content.replace(customEmojiRegex, ':$1:');
    const animatedEmojiRegex = /<a:(\w+):\d+>/g;
    content = content.replace(animatedEmojiRegex, ':$1:');
    return content;
}

async function formatUserMessage(message, repliedTo) {
    const score = await reputation(message.author.id);
    const date = formatDate(new Date());
    let replyContent = "";
    if (repliedTo) {
        replyContent = `[Parent message from reply]
Author-ID: ${repliedTo.author.id}
Author-Username: ${repliedTo.author.username}
Author-DisplayName: ${repliedTo.member.displayName}
Content:
\`\`\`
${simplifyEmoji(repliedTo.content)}
\`\`\``;
    }
    return `--- Conversation History ---
${replyContent}

[Current message]
Author-ID: ${message.author.id}
Author-Username: ${message.author.username}
Author-DisplayName:: ${message.member.displayName}
Timestamp: ${date}
Reputation: ${score.toString()}
Content:
\`\`\`
${simplifyEmoji(message.content)}
\`\`\``;
}

async function callGeminiAPI(channelId, gemini) {
    let responseMsg = '';
    let functionCalls = null;

    const response = await genAI.models.generateContentStream({
        model: config.GEMINI_MODEL,
        config: gemini[channelId],
        contents: state.history[channelId],
    });

    for await (const chunk of response) {
        if (chunk.functionCalls) {
            if (!functionCalls) {
                functionCalls = [];
            }
            functionCalls.push(...chunk.functionCalls);
        } else if (chunk.text) {
            responseMsg += chunk.text;
        }
    }

    if (functionCalls) {
        return { functionCalls, text: responseMsg.trim() };
    }
    return { text: responseMsg.trim() };
}

async function handleGeminiError(e, message, client, gemini) {
    const errorJSON = JSON.parse(JSON.stringify(e));
    let status = errorJSON?.status || null;

    let statusMessage;
    try {
        let errorData = e.error instanceof Object ? e.error : e;

        if (errorData instanceof Object && typeof errorData.message === 'string' && errorData.message.trim().startsWith('{')) {
            try {
                const innerError = JSON.parse(errorData.message);
                if (innerError.error) {
                    errorData = innerError.error;
                }
            } catch (parseError) {
                console.warn("Could not parse inner JSON from error message:", parseError);
            }
        }

        if (errorData instanceof Object) {
            status = errorData.code;
            statusMessage = errorData.message.error.message; // weird ass json
        } else if (errorData) {
            statusMessage = String(errorData);
        }
    } catch (extractError) {
        console.warn("Could not extract error details:", extractError);
    }

    // old handling, DO NOT REMOVE COMMENT
    /*const channelId = message.channel.id;
    let msg;
    try {
        if (e.response.promptFeedback.blockReason) {
            msg = e.response.promptFeedback.blockReason;
        }
    } catch { }

    if (msg && (msg === "SAFETY" || msg === "PROHIBITED_CONTENT" || msg === "OTHER")) {
        return message.channel.send(await RNGArray(state.strings.geminiFiltered));
    }*/

    // beggining of the new error handling
    if (status && (status === 429 || status === 500 || status === 503)) {
        let retryDelay;
        if (status === 429) {
            log(`Gemini returned 429 (Resource Exhausted), attempting to retry after cooldown.`, 'warn', 'messageHandler.js');
            let delaySeconds = 60;
            retryDelay = delaySeconds * 1000;
        } else {
            log(`Gemini returned ${status} (${statusMessage}), retrying`, 'warn', 'messageHandler.js');
            retryDelay = 3000;
        }
        if (!state.retryCounts[channelId]) {
            state.retryCounts[channelId] = 0;
        }
        state.retryCounts[channelId]++;
        if (state.retryCounts[channelId] > 5) {
            console.error(`Gemini returned ${status} error 5 times for channel ${channelId}, dropping task`);
            state.retryCounts[channelId] = 0;
            return message.channel.send("Couldn't get a response, try again later.");
        }

        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return messageHandler(message, client, gemini);
    } else {
        if (state.retryCounts[channelId]) {
            state.retryCounts[channelId] = 0;
        }
        console.error(`Unhandled Gemini error. Status: ${status}. Message: ${statusMessage || 'No message provided'}`);
        if (e.stack) {
            console.error(e.stack);
        }
        return message.channel.send("Unhandled error. (Refer to console)");
    }
}

async function processResponse(responseMsg, message) {
    responseMsg = responseMsg.replaceAll('@everyone', '[blocked]');
    responseMsg = responseMsg.replaceAll('@here', '[blocked]');

    if (state.retryCounts[message.channel.id]) {
        state.retryCounts[message.channel.id] = 0;
    }

    responseMsg = responseMsg.replaceAll(/^\s*--- System Context ---\s*[\s\S]*?---\s*Conversation History\s*---[\s\S]*```\s*$/gmi, "").trim();
    return responseMsg;
}

async function messageHandler(message, client, gemini) {
    const channelId = message.channel.id;

    if (!state.messageQueues[channelId]) {
        state.messageQueues[channelId] = [];
    }

    state.messageQueues[channelId].push({ message, client, gemini });

    if (state.isProcessing[channelId]) {
        return;
    }

    state.isProcessing[channelId] = true;

    try {
        while (state.messageQueues[channelId] && state.messageQueues[channelId].length > 0) {
            const task = state.messageQueues[channelId][0];
            try {
                await _internalMessageHandler(task.message, task.client, task.gemini);
            } catch (e) {
                console.error(`Error processing message in queue for channel ${channelId}: ${e.stack}`);
                try {
                    await task.message.channel.send("An unexpected error occurred while processing your message. Please try again later.");
                } catch (sendError) {
                    console.error(`Failed to send error message to channel ${channelId}: ${sendError}`);
                }
            } finally {
                if (state.messageQueues[channelId]) {
                    state.messageQueues[channelId].shift();
                }
            }
        }
    } finally {
        state.isProcessing[channelId] = false;
        if (state.messageQueues[channelId] && state.messageQueues[channelId].length === 0) {
            delete state.messageQueues[channelId];
        }
    }
}

async function _internalMessageHandler(message, client, gemini) {
    if (!await checkAuthors(message, client)) {
        return;
    }

    const channelId = message.channel.id;
    let repliedTo;
    try {
        if (message.reference?.messageId) {
            repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        }
    } catch (e) {
        log(`Failed to fetch replied message: ${e}`, 'warn', 'messageHandler.js');
    }

    const files = await uploadFilesToGemini(message, client);
    if (files.length > 0) {
        message.content += '[Attachment]';
    }

    const formattedMessage = await formatUserMessage(message, repliedTo);

    if (!await checkForMentions(message, client)) {
        state.msgCount += 1;
        return addToHistory('user', formattedMessage, channelId);
    }

    const cronReset = require('../cronJobs/cronReset');
    cronReset.reschedule();

    await message.channel.sendTyping();
    state.msgCount += 1;

    let msgParts = [];
    if (files.length > 0) {
        files.forEach(file => {
            msgParts.push({
                fileData: {
                    fileUri: file.uri,
                    mimeType: file.mimeType,
                }
            });
        });
    }
    msgParts.push({
        text: formattedMessage
    });

    await trimHistory(channelId);
    state.history[channelId].push({
        role: 'user',
        parts: msgParts
    });

    let initialResponse;
    try {
        initialResponse = await callGeminiAPI(channelId, gemini);
    } catch (e) {
        return handleGeminiError(e, message, client, gemini);
    }

    const hasInitialText = initialResponse.text && initialResponse.text.trim().length > 0;
    const hasFunctionCalls = initialResponse.functionCalls && initialResponse.functionCalls.length > 0;

    if (hasFunctionCalls) {
        if (hasInitialText) {
            let processedInitialThought = await processResponse(initialResponse.text, message);
            await addToHistory('model', processedInitialThought, channelId);
        }

        state.history[channelId].push({
            role: 'model',
            parts: initialResponse.functionCalls.map(fc => ({ functionCall: fc }))
        });

        let toolResponses;
        try {
            toolResponses = await parseBotCommands(initialResponse.functionCalls, message, gemini);
        } catch (e) {
            console.error(`Error executing parseBotCommands: ${e.stack}`);
            toolResponses = initialResponse.functionCalls.map(fc => ({
                name: fc.name,
                response: { content: `An internal error occurred while attempting to execute the tool: ${fc.name}.` }
            }));
        }

        const functionResponseParts = toolResponses.map(toolResponse => ({
            functionResponse: { name: toolResponse.name, response: toolResponse.response, }
        }));

        state.history[channelId].push({
            role: 'user',
            parts: functionResponseParts,
        });

        let subsequentResponse;
        try {
            subsequentResponse = await callGeminiAPI(channelId, gemini);
        } catch (e) {
            return handleGeminiError(e, message, client, gemini);
        }
        let subsequentText = subsequentResponse.text || '';
        if (subsequentText.trim().length > 0) {
            subsequentText = await processResponse(subsequentText, message);
            await addToHistory('model', subsequentText, channelId);
            await chunkedMsg(message, subsequentText);
        }
        await trimHistory(channelId);
        await bondUpdater(message.author.id);
        return;
    } else if (hasInitialText) {
        let processedInitialText = await processResponse(initialResponse.text, message);
        await addToHistory('model', processedInitialText, channelId);
        await chunkedMsg(message, processedInitialText);
        await trimHistory(channelId);
        await bondUpdater(message.author.id);
        return;
    } else {
        await addToHistory('model', '', channelId);
        await trimHistory(channelId);
        await bondUpdater(message.author.id);
        return;
    }
}

// longest function with 55 "Cognitive Complexity", good to go for now, also we need to take mute command apart, might be making a different module
async function chunkedMsg(message, response) {
    // check if response empty
    if (response.trim().length === 0) {
        return;
    }

    const chunkSize = 2000;

    const codeBlockRegex = /```.*?```/gs;
    let codeBlock = '';
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
        response = response.replace(match[0], '');
        match[0] = match[0].replace(/```\w*/sg, '');
        codeBlock += match[0] + '\n';
    }

    const artifactPath = path.join(global.dirname, 'data', 'running', 'tmp', `artifact_${Date.now()}.txt`);

    if (codeBlock.trim().length > 0) {
        try {
            fs.writeFileSync(artifactPath, codeBlock);
        } catch (e) {
            console.error(`Failed to save artifact: ${e}`);
        }
    }

    if (response.length <= chunkSize && response.trim().length > 0) {
        if (codeBlock.trim().length > 0) {
            try {
                await message.reply({
                    content: response,
                    files: [artifactPath]
                });
                fs.unlinkSync(artifactPath);
            } catch (e) {
                log(`Failed to reply to message (it may have been deleted): ${e}`, 'warn', 'messageHandler.js');
                if (fs.existsSync(artifactPath)) {
                    fs.unlinkSync(artifactPath);
                }
                return;
            }
        } else {
            try {
                await message.reply(response);
            } catch (e) {
                log(`Failed to reply to message (it may have been deleted): ${e}`, 'warn', 'messageHandler.js');
                return;
            }
        }
        return true;
    }

    let chunks = [];
    let currChunk = "";

    const lines = response.split('\n');
    for (const line of lines) {
        if (currChunk.length + line.length + 1 > chunkSize && currChunk.length > 0) {
            chunks.push(currChunk);
            currChunk = "";
        }

        if (line.length > chunkSize) {
            if (currChunk.length > 0) {
                chunks.push(currChunk);
                currChunk = "";
            }

            for (let i = 0; i < line.length; i += chunkSize) {
                chunks.push(line.substring(i, i + chunkSize));
            }
        } else {
            currChunk += (currChunk ? "\n" : "") + line;
        }
    }

    if (currChunk.length > 0) {
        chunks.push(currChunk);
    }

    if (chunks.length > 0) {
        try {
            await message.reply(chunks[0]);
        } catch (e) {
            log(`Failed to reply to message with the first chunk (it may have been deleted): ${e}`, 'warn', 'messageHandler.js');
            if (codeBlock.trim().length > 0 && fs.existsSync(artifactPath)) {
                fs.unlinkSync(artifactPath);
            }
            return;
        }
        for (let i = 1; i < chunks.length; i++) {
            try {
                await message.channel.send(chunks[i]);
            } catch (e) {
                log(`Failed to send subsequent chunk: ${e}`, 'warn', 'messageHandler.js');
                return;
            }
        }
    }

    if (codeBlock.trim().length > 0) {
        if (fs.existsSync(artifactPath)) {
            try {
                await message.channel.send({
                    files: [artifactPath]
                });
            } catch (e) {
                log(`Failed to send artifact: ${e}`, 'warn', 'messageHandler.js');
            } finally {
                // delete artifact
                fs.unlinkSync(artifactPath);
            }
        }
    }

    return true;
}

module.exports = { messageHandler };