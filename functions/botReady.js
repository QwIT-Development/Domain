const { ActivityType: {Custom} } = require("discord.js");

async function botReady(client) {
    await client.user.setPresence({
        activities: [{
            name: 'Említs meg, vagy válaszolj egy üzenetemre!',
            type: Custom
        }],
        status: 'online'
    })
}

module.exports = botReady;