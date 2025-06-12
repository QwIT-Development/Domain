/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const {checkAuthors, checkForMentions} = require('../functions/checkAuthors');
const state = require('../initializers/state');
const log = require('../utils/betterLogs');
const {reputation} = require('../utils/reputation');
const parseBotCommands = require('./botCommands');
const fs = require('fs');
const path = require('path');
const {RNGArray} = require('../functions/rng');
const {getMemories} = require('../functions/memories');
const strings = require('../data/strings.json');
const uploadFilesToGemini = require('../eventHandlers/fileUploader');
const config = require('../config.json');
const {formatDate} = require('../functions/makePrompt');
const {genAI} = require('../initializers/geminiClient');
const {bondUpdater} = require('../functions/usageRep');
const {addToHistory, trimHistory} = require('../utils/historyUtils');

async function formatUserMessage(message, repliedTo, channelId) {
    const score = await reputation(message.author.id);
    const memories = await getMemories(channelId);
    const date = formatDate(new Date());
    if (repliedTo) {
        return `[Memories: ${memories}]
            Replied to [${repliedTo.author.username} (ID: ${repliedTo.author.id})] ${repliedTo.member.displayName}: ${repliedTo.content}
            ${date} - [Reputation Score: ${score.toString()}] [${message.author.username} (ID: ${message.author.id})] ${message.member.displayName}: ${message.content}`;
    }
    return `[Memories: ${memories}]
            ${date} - [Reputation Score: ${score.toString()}] [${message.author.username} (ID: ${message.author.id})] ${message.member.displayName}: ${message.content}`;
}

async function callGeminiAPI(channelId, gemini) {
    let responseMsg = '';
    const response = await genAI.models.generateContentStream({
        model: config.GEMINI_MODEL,
        config: gemini[channelId],
        contents: state.history[channelId],
    });
    for await (const chunk of response) {
        if (chunk.text) {
            responseMsg += chunk.text.trim();
        }
    }
    return responseMsg;
}

async function handleGeminiError(e, message, client, gemini) {
    const channelId = message.channel.id;
    let msg;
    try {
        if (e.response.promptFeedback.blockReason) {
            msg = e.response.promptFeedback.blockReason;
        }
    } catch {}

    let status;
    try {
        if (e.error) {
            status = e.error.code;
        }
    } catch {}

    if (msg && (msg === "SAFETY" || msg === "PROHIBITED_CONTENT" || msg === "OTHER")) {
        return message.channel.send(await RNGArray(strings.geminiFiltered));
    } else if (status && (status === 429)) {
        return message.channel.send(await RNGArray(strings.geminiTooManyReqs));
    } else if (status && (status === 503)) {
        return message.channel.send(await RNGArray(strings.geminiGatewayUnavail));
    } else if (status && (status === 500)) {
        log(`Gemini returned 500, retrying`, 'warn', 'messageHandler.js');
        if (!state.retryCounts[channelId]) {
            state.retryCounts[channelId] = 0;
        }
        state.retryCounts[channelId]++;

        if (state.retryCounts[channelId] > 5) {
            console.error(`Gemini returned 500 error 5 times for channel ${channelId}, dropping task`);
            state.retryCounts[channelId] = 0;
            return message.channel.send("Couldn't get a response, try again later.");
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        return messageHandler(message, client, gemini);
    } else {
        if (state.retryCounts[channelId]) {
            state.retryCounts[channelId] = 0;
        }
        console.error(e.message + "\n```" + e.stack + "```");
        return message.channel.send("Unhandled error. (Refer to console)");
    }
}

async function processResponse(responseMsg, message, gemini, repliedTo) {
    responseMsg = responseMsg.replaceAll('@everyone', '[blocked :3]');
    responseMsg = responseMsg.replaceAll('@here', '[blocked :3]');

    responseMsg = await parseBotCommands(responseMsg, message, gemini);

    responseMsg = responseMsg.replaceAll(/replied to \[\S* ?\(id: ?\S*\)] ?\S*:/gmi, "").trim();
    responseMsg = responseMsg.replaceAll(/\[reputation score: ?\S*] ?\[\S* ?\(id: ?\S*\)] ?\S*:/gmi, "").trim();

    if (state.retryCounts[message.channel.id]) {
        state.retryCounts[message.channel.id] = 0;
    }

    if (repliedTo) {
        responseMsg = responseMsg.replaceAll(`${repliedTo.author.username}:`, "").trim();
        responseMsg = responseMsg.replaceAll(`${repliedTo.author.username.toLowerCase()}:`, "").trim();
        responseMsg = responseMsg.replaceAll(`${repliedTo.member.displayName}:`, "").trim();
        responseMsg = responseMsg.replaceAll(`${repliedTo.member.displayName.toLowerCase()}:`, "").trim();
    }
    responseMsg = responseMsg.replaceAll(`${message.author.username}:`, "").trim();
    responseMsg = responseMsg.replaceAll(`${message.author.username.toLowerCase()}:`, "").trim();
    responseMsg = responseMsg.replaceAll(`${message.member.displayName}:`, "").trim();
    responseMsg = responseMsg.replaceAll(`${message.member.displayName.toLowerCase()}:`, "").trim();
    responseMsg = responseMsg.replaceAll(/\[([^\s(]*) ?\(id: ?(\d+)\)] ?([^:]*):/gmi, "").trim();
    return responseMsg;
}

async function messageHandler(message, client, gemini) {
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

    const formattedMessage = await formatUserMessage(message, repliedTo, channelId);

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

    let responseMsg;
    try {
        responseMsg = await callGeminiAPI(channelId, gemini);
    } catch (e) {
        return handleGeminiError(e, message, client, gemini);
    }

    responseMsg = await processResponse(responseMsg, message, gemini, repliedTo);

    await trimHistory(channelId);
    bondUpdater(message.author.id);
    return chunkedMsg(message, responseMsg);
}

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

module.exports = {messageHandler};