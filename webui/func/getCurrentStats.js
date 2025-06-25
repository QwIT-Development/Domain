const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const state = require("../../initializers/state");
const getEntry = require("./getEntry");

async function getCurrentStats() {
    const allUsers = await prisma.user.findMany();
    const userIds = allUsers.map(user => user.id);

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
            historyClears: state.resetCounts,
            isSleeping: state.isSleeping,
            websocketClients: state.wsClients.size,
            retryCount: Object.keys(state.retryCounts).length,
            messageQueueCount: Object.keys(state.messageQueues).length,
            processingTaskCount: Object.keys(state.isProcessing).length,
            version: state.version,
            historyCount: Object.keys(state.history).length
        },
        users: userEntries.map(entry => ({
            id: entry.id,
            username: entry.username,
            avatarUrl: entry.avatarUrl,
            score: entry.score,
            banReason: entry.banReason,
            bondLvl: entry.bondLvl,
            totalMsgCount: entry.totalMsgCount
        })) || [],
        muteCount: state.muteCount,
        logs: state.logs.toReversed() || [],
    }
}

module.exports = getCurrentStats;