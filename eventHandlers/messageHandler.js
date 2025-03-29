/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const {checkAuthors, checkForMentions} = require('../functions/checkAuthors');
const state = require('../initializers/state');
const log = require('../utils/betterLogs');

const wpm = 160;

async function messageHandler(message, client, gemini) {
    if (await checkAuthors(message, client)) {
        /*
            A bot ezt a formatot kapja meg:
            [Reputation Score: 1000] [balazsmanus (ID: 710839743222513715)] Balazs: szia dave
            masneven
            [Reputation Score: int] [username (ID: userId)] DisplayName: MessageContent
        */

        // TODO: implement reputation system
        const score = 0
        const formattedMessage = `[Reputation Score: ${score}] [${message.author.username} (ID: ${message.author.id})] ${message.member.displayName}: ${message.content}`;

        if (await checkForMentions(message, client)) {
            // send typing so it looks more realistic
            await message.channel.sendTyping();

            // skizofren enem azt mondja, h ne bizzak a ++ban
            state.msgCount += 1;

            let response = await gemini.sendMessage(formattedMessage);
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

            message.reply(response);
        } else {
            state.msgCount += 1;

            await addToHistory('user', formattedMessage);
        }
    }
}

/**
 * pushol egy frissitest a historybe (ezt dobjuk at gemininek)
 * @param role - (`model`, `user`)
 * @param content - vajon mi lehet
 */
async function addToHistory(role, content) {
    if (role && content) {
        if (role !== 'user' && role !== 'model') {
            log(`Got invalid role to be pushed to history: ${role}`, 'warn', 'messageHandler.js');
        }
        state.history.push({
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

module.exports = messageHandler;