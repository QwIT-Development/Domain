const checkAuthors = require('../functions/checkAuthors');

async function messageHandler(message, client, gemini) {
    if (await checkAuthors(message, client)) {
        console.log("message will be handled")

        let response = await gemini.sendMessage(message.content);
        response = response.response.text();

        console.log(response);

        message.reply(response);
    }
}

module.exports = messageHandler;