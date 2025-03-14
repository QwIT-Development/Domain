const {Client, GatewayIntentBits, Events} = require('discord.js');
const config = require('../config.json');

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

discordClient.once(Events.ClientReady, async () => {
    console.log(`Connected as ${discordClient.user.tag}`);
    await discordClient.user.setPresence({
        activities: [],
        status: 'idle'
    })
});

discordClient.login(config.DISCORD_TOKEN).then(() => {
    console.log('logged in');
}).catch(err => {
    console.error('failed to login:', err);
    process.exit(1);
})

module.exports = discordClient;