const log = require("../../utils/betterLogs");

const discordClient = global.discordClient;
async function getUserInfo(userId) {
    // client should be already initialized when webui is fired up
    try {
        const user = await discordClient.users.fetch(userId);
        if (!user) {
            return null;
        }
        const username = user.username;
        const avatarUrl = user.displayAvatarURL({dynamic: true, size: 256});

        return {username, avatarUrl};
    } catch (e) {
        log(`Error fetching user data: ${e}`, 'error', 'webui.js (getUserStats)');
        return null;
    }
}

module.exports = getUserInfo;