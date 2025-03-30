/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const {checkAuthors, checkForMentions} = require('../functions/checkAuthors');
const state = require('../initializers/state');
const log = require('../utils/betterLogs');
const reputation = require('../utils/reputation');

const wpm = 160;

async function messageHandler(message, client, gemini) {
    if (await checkAuthors(message, client)) {
        const channelId = message.channel.id;
        /*
            A bot ezt a formatot kapja meg:
            [Reputation Score: 1000] [balazsmanus (ID: 710839743222513715)] Balazs: szia dave
            masneven
            [Reputation Score: int] [username (ID: userId)] DisplayName: MessageContent
        */

        // TODO: implement reputation system
        const score = await reputation(message.author.id);
        const formattedMessage = `[Reputation Score: ${score.toString()}] [${message.author.username} (ID: ${message.author.id})] ${message.member.displayName}: ${message.content}`;

        if (await checkForMentions(message, client)) {
            // send typing so it looks more realistic
            await message.channel.sendTyping();

            // skizofren enem azt mondja, h ne bizzak a ++ban
            state.msgCount += 1;

            let response = await gemini[channelId].sendMessage(formattedMessage);
            response = response.response.text();

            const typingTime = await calculateWPMTime(response);
            const interval = 5;

            // realistic typing, idobe telik hogy irjon, erted. ettol realisabbnak tunik!!1!
            let i = 0;
            while (i < typingTime) {
                await message.channel.sendTyping();
                const sleepTime = Math.min(interval, typingTime - i);
                await new Promise(resolve => setTimeout(resolve, sleepTime * 1000));
                i += interval;
            }

            await chunkedMsg(message, response);
        } else {
            state.msgCount += 1;

            await addToHistory('user', formattedMessage, channelId);
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

/**
 * uber realistic wpm time calculator 2000
 * @param message - üzenet
 * @returns {Promise<number>}
 * @desc
 * lényeg az, hogy megszámolja mennyi szó van\
 * a wpm-et elosztja 60-al (hogy wps legyen)\
 * a szavak számát elosztja wps-el es megkapjuk eredmenyt\
 * minden igaz igy van *majomgépelésen* is
 */
async function calculateWPMTime(message) {
    // seconds = words / (wpm / 60)
    const words = message.match(/\S+/g);
    return words.length / (wpm / 60);
}

async function chunkedMsg(message, response) {
    const chunkSize = 1000;

    if (response.length <= chunkSize) {
        return message.reply(response);
    }

    let chunks = [];
    let currChunk = "";

    const lines = response.split('\n');
    for (const line of lines) {
        if (currChunk.length + line.length + 1 > chunkSize && currentChunk.length > 0) {
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

    await message.reply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
        await message.channel.send(chunks[i]);
    }

    return true;
}

module.exports = messageHandler;