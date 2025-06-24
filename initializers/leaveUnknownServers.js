const {loadConfig} = require('../initializers/configuration');
const config = loadConfig();

async function leaveUnknownServers(client) {
    client.guilds.cache.forEach(guild => {
        const channels = guild.channels.cache.map(channel => channel.id);
        let configChannelIds = Object.keys(config.CHANNELS);
        const guildShouldBeLeft = !channels.some(channelId => configChannelIds.includes(channelId));
        
        if (guildShouldBeLeft) {
            console.log(`Leaving guild: ${guild.name} (${guild.id}) because none of its channels are in the config.`);
            guild.leave()
                .then(() => console.log(`Successfully left guild: ${guild.name} (${guild.id})`))
                .catch(error => console.error(`Failed to leave guild: ${guild.name} (${guild.id})`, error));
        }
    });
}

module.exports = leaveUnknownServers;