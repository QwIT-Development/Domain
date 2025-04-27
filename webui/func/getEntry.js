const config = require("../../config.json");
const state = require("../../initializers/state");

const getUserInfo = require("./getUserInfo");
const usersCache = state.usersCache;

async function getEntry(userId) {
    const now = Date.now();
    let entry = usersCache[userId];
    let needsRefresh = false;

    if (!entry || (now - entry.lastUpdated > config.TIMINGS.userCacheDuration)) {
        needsRefresh = true;
    }

    let userInfo = null;
    if (needsRefresh) {
        userInfo = await getUserInfo(userId);
        if (userInfo) {
            entry = {
                id: userId,
                username: userInfo.username,
                avatarUrl: userInfo.avatarUrl,
                lastUpdated: now,
                // this shouldn't fail, but if it does fail we just return 0
                score: state.reputation[userId] || 0,
                banReason: state.banlist[userId] || null,
            };
            usersCache[userId] = entry;
        } else {
            if (entry) {
                entry.lastUpdated = now;
            } else {
                entry = {
                    id: userId,
                    username: 'Unknown',
                    avatarUrl: null,
                    lastUpdated: now,
                    score: state.reputation[userId] || 0,
                    banReason: state.banlist[userId] || null,
                };
                usersCache[userId] = entry;
            }
        }
    }
    return entry;
}

module.exports = getEntry;