const state = require("../../initializers/state");

const getEntry = require("./getEntry");
async function getCurrentStats() {
    const userIds = Object.keys(state.reputation || {});
    const entryPromises = userIds.map(async userId => getEntry(userId));
    const userEntries = (await Promise.all(entryPromises)).filter(entry => entry !== null);

    const mem = process.memoryUsage();
    return {
        ram: {
            total: mem.heapTotal,
            used: mem.heapUsed
        },
        botStats: {
            msgCount: state.msgCount,
            historyClears: state.resetCounts
        },
        users: userEntries.map(entry => ({
            id: entry.id,
            username: entry.username,
            avatarUrl: entry.avatarUrl,
            score: entry.score,
            banReason: entry.banReason,
        })) || [],
        logs: state.logs.toReversed() || [],
    }
}

module.exports = getCurrentStats;