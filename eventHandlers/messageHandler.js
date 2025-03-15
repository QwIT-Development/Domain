const checkAuthors = require('../functions/checkAuthors');
const state = require('../initializers/state');

async function messageHandler(message, client, gemini) {
    if (await checkAuthors(message, client)) {
        state.msgCount++;

        let response = await gemini.sendMessage(message.content);
        response = response.response.text();
        message.reply(response);
    }
}

module.exports = messageHandler;