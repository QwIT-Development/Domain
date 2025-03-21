// async main thread hell yeah
async function main() {
    require('./utils/webui'); // fire up webui
    // imports
    const {Events} = require("discord.js");
    const {promptLoader, model} = require('./initializers/geminiClient');
    const messageHandler = require('./eventHandlers/messageHandler');

    // initialize stuff inside async thingy
    let discordClientReady = false;
    const discordClient = require('./initializers/botClient');
    discordClient.once(Events.ClientReady, () => {
        discordClientReady = true;
    });
    while (!discordClientReady) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const geminiModel = await model();
    let history = [];
    global.geminiSession = promptLoader(geminiModel, history);

    discordClient.on(Events.MessageCreate, message => {
        messageHandler(
            message,
            discordClient,
            global.geminiSession
        )
    });

}

main().then();