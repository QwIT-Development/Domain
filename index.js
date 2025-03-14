// async main thread hell yeah
async function main() {
    // imports
    const {Events} = require("discord.js");
    const promptLoader = require('./initializers/geminiClient');

    // initialize stuff inside async thingy
    let discordClientReady = false;
    const discordClient = require('./initializers/botClient');
    discordClient.once(Events.ClientReady, () => {
        discordClientReady = true;
    });
    while (!discordClientReady) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const geminiSession = promptLoader();



}

main().then();