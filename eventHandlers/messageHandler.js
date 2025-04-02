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

async function messageHandler(message, client, gemini) {
    if (await checkAuthors(message, client)) {
        const channelId = message.channel.id;
        /*
            A bot ezt a formatot kapja meg:
            [Reputation Score: 1000] [balazsmanus (ID: 710839743222513715)] Balazs: szia dave
            masneven
            [Reputation Score: int] [username (ID: userId)] DisplayName: MessageContent
        */

        const score = await reputation(message.author.id);
        const formattedMessage = `[Reputation Score: ${score.toString()}] [${message.author.username} (ID: ${message.author.id})] ${message.member.displayName}: ${message.content}`;

        if (message.content.includes("forceartifact")) {
            let response = "```\ntestartifact\n```";
            return await chunkedMsg(message, response);
        }

        if (await checkForMentions(message, client)) {
            // send typing so it looks more realistic
            await message.channel.sendTyping();

            // skizofren enem azt mondja, h ne bizzak a ++ban
            state.msgCount += 1;

            let response = await gemini[channelId].sendMessage(formattedMessage);
            response = response.response.text();

            // TODO: parse commands from bot
            response = await parseBotCommands(response, message);

            return await chunkedMsg(message, response);
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

module.exports = messageHandler;