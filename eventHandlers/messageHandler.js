/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
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
const cronReset = require("../cronJobs/cronReset");

async function messageHandler(message, client, gemini) {
    if (await checkAuthors(message, client)) {
        const channelId = message.channel.id;
        /*
            A bot ezt a formatot kapja meg:
            [Reputation Score: 1000] [balazsmanus (ID: 710839743222513715)] Balazs: szia dave
            masneven
            [Reputation Score: int] [username (ID: userId)] DisplayName: MessageContent
        */

        let repliedTo;
        try {
            if (message.reference && message.reference.messageId) {
                repliedTo = await message.channel.messages.fetch(message.reference.messageId);
            }
        } catch (e) {
            // ignoralhato since honnet tudjam
            log(`Failed to fetch replied message: ${e}`, 'warn', 'messageHandler.js');
        }

        const files = await uploadFilesToGemini(message, client);
        if (files.length > 0) {
            message.content += '[Attachment]';
        }

        const score = await reputation(message.author.id);
        // TODO: implement memory system
        const memories = await getMemories(message.author.id);
        let formattedMessage;
        if (repliedTo) {
            formattedMessage = `Replied to [${repliedTo.author.username} (ID: ${repliedTo.author.id})] ${repliedTo.member.displayName}: ${repliedTo.content}
            [Memories: ${memories}] [Reputation Score: ${score.toString()}] [${message.author.username} (ID: ${message.author.id})] ${message.member.displayName}: ${message.content}`;
        } else {
            formattedMessage = `[Memories: ${memories}] [Reputation Score: ${score.toString()}] [${message.author.username} (ID: ${message.author.id})] ${message.member.displayName}: ${message.content}`;
        }
        //console.log(formattedMessage);

        if (message.content.includes("forceartifact")) {
            let response = "```\ntestartifact\n```";
            return await chunkedMsg(message, response);
        }

        if (await checkForMentions(message, client)) {
            // this should run, bc it wouldn't be good if the bot randomly resets while getting back the response
            const cronReset = require('../cronJobs/cronReset');
            cronReset.reschedule();

            // send typing so it looks more realistic
            await message.channel.sendTyping();

            // skizofren enem azt mondja, h ne bizzak a ++ban
            state.msgCount += 1;

            let msgParts = [];
            msgParts.push({text: formattedMessage});
            if (files.length > 0) {
                files.forEach(file => {
                    msgParts.push({
                        file_data: {
                            file_uri: file.uri,
                            mime_type: file.mimeType,
                        }
                    });
                });
            }

            let response;
            let responseMsg;
            try {
                response = await gemini[channelId].sendMessage(msgParts);
                responseMsg = response.response.text().trim();
            } catch (e) {
                let msg;
                try {
                    if (e.response.promptFeedback.blockReason) {
                        msg = e.response.promptFeedback.blockReason;
                    }
                } catch {}

                let status;
                try {
                    if (e.statusText) {
                        status = e.statusText;
                    }
                } catch {}

                // check if msg exists then check blockreason
                if (msg && (msg === "SAFETY" || msg === "PROHIBITED_CONTENT" || msg ==="OTHER")) {
                    return await message.channel.send(await RNGArray(strings.geminiFiltered));

                //check for toomanyrequests
                } else if (status && (status === "Too Many Requests")) {
                    return await message.channel.send(await RNGArray(strings.geminiTooManyReqs));
                } else if (status && (status === "Service Unavailable")) {
                    return await message.channel.send(await RNGArray(strings.geminiGatewayUnavail));
                } else {
                    // generic err handler
                    log(e, 'error', 'messageHandler.js');
                    return await message.channel.send("Hiba történt. (Refer to console)");
                }
            }

            responseMsg = responseMsg.replaceAll('@everyone', '[blocked :3]');
            responseMsg = responseMsg.replaceAll('@here', '[blocked :3]');

            // TODO: parse commands from bot
            responseMsg = await parseBotCommands(responseMsg, message, gemini);

            return await chunkedMsg(message, responseMsg);
        } else {
            state.msgCount += 1;

            return await addToHistory('user', formattedMessage, channelId);
        }
    }
}

/**
 * pushol egy frissitest a historybe (ezt dobjuk at gemininek)
 * @param role - (`model`, `user`)
 * @param content - vajon mi lehet
 * @param channelId - channel id (history management miatt)
 */
async function addToHistory(role, content, channelId) {
    if (role && content) {
        if (role !== 'user' && role !== 'model') {
            log(`Got invalid role to be pushed to history: ${role}`, 'warn', 'messageHandler.js');
        }
        state.history[channelId.toString()].push({
            role: role,
            parts: [{text: content}]
        });
    }
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
            log(`Failed to save artifact: ${e}`, 'error', 'messageHandler.js');
        }
    }

    if (response.length <= chunkSize && response.trim().length > 0) {
        if (codeBlock.trim().length > 0) {
            await message.reply({
                content: response,
                files: [artifactPath]
            });
            fs.unlinkSync(artifactPath);
        } else {
            message.reply(response);
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
        await message.reply(chunks[0]);
        for (let i = 1; i < chunks.length; i++) {
            await message.channel.send(chunks[i]);
        }
    }

    if (codeBlock.trim().length > 0) {
        await message.channel.send({
            files: [artifactPath]
        });
        // delete artifact
        fs.unlinkSync(artifactPath);
    }

    return true;
}

module.exports = {messageHandler, addToHistory};