const checkAuthors = require('../functions/checkAuthors');

async function messageHandler(message, client) {
    if (await checkAuthors(message, client)) {

    }
}

module.exports = messageHandler;