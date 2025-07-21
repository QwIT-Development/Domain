const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const state = require("../../initializers/state");

async function getCurrentStats() {
  const allUsers = await prisma.user.findMany();

  const userEntries = allUsers.map((user) => {
    const cachedUserInfo = state.usersCache[user.id];

    return {
      id: user.id,
      username: cachedUserInfo?.username || `User_${user.id.slice(-4)}`,
      avatarUrl: cachedUserInfo?.avatarUrl || null,
      banReason: user.banned ? user.banMessage : null,
    };
  });

  const mem = process.memoryUsage();

  const stats = {
    ram: {
      total: mem.heapTotal,
      used: mem.heapUsed,
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
      historyCount: Object.keys(state.history).length,
    },
    users:
      userEntries.map((entry) => ({
        id: entry.id,
        username: entry.username,
        avatarUrl: entry.avatarUrl,
        banReason: entry.banReason,
      })) || [],
    muteCount: state.muteCount,
    logs: state.logs.toReversed() || [],
  };

  return stats;
}

module.exports = getCurrentStats;
