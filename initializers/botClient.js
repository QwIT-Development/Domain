/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const {Client, GatewayIntentBits, Events} = require('discord.js');

/*
Fuck dotenv, config.jsont hasznalunk. legalabb nem kell kulon package csak azert h betoltsunk egy izet.
configot
 */
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