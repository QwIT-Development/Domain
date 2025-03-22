/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const {checkAuthors, checkForMentions} = require('../functions/checkAuthors');
const state = require('../initializers/state');

async function messageHandler(message, client, gemini) {
    if (await checkAuthors(message, client)) {
        if (await checkForMentions(message, client)) {
            // skizofren enem azt mondja, h ne bizzak a ++ban
            state.msgCount += 1;

            let response = await gemini.sendMessage(message.content);
            response = response.response.text();
            message.reply(response);
        }
    }
}

module.exports = messageHandler;