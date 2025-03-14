const {Client, GatewayIntentBits, Events} = require('discord.js');
const config = require('../config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, () => {
    console.log(`Connected as ${client.user.tag}`);
});
client.login(config.DISCORD_TOKEN);

module.exports = client;