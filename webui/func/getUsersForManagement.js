const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const getCachedUserInfo = require("./getCachedUserInfo");

async function getUsersForManagement() {
  try {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        repPoint: true,
        banned: true,
        banMessage: true,
        bondLvl: true,
        msgCount: true,
        totalMsgCount: true,
        hiddenFromLeaderboard: true,
        lastInteraction: true,
        muteCount: true,
        decayed: true,
      },
    });

    const userEntries = allUsers.map((user) => {
      const cachedUserInfo = getCachedUserInfo(user.id);

      return {
        id: user.id,
        username: cachedUserInfo.username,
        avatarUrl: cachedUserInfo.avatarUrl,
        lastUpdated: cachedUserInfo.lastUpdated,
        score: user.repPoint || 0,
        banned: user.banned,
        banReason: user.banMessage,
        bondLvl: user.bondLvl || 0,
        msgCount: user.msgCount || 0,
        totalMsgCount: user.totalMsgCount || 0,
        hiddenFromLeaderboard: user.hiddenFromLeaderboard || false,
        lastInteraction: user.lastInteraction,
        muteCount: user.muteCount || 0,
        decayed: user.decayed || false,
        isExpired: cachedUserInfo.isExpired,
      };
    });

    const sortedUsers = userEntries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.bondLvl !== a.bondLvl) {
        return b.bondLvl - a.bondLvl;
      }
      return b.totalMsgCount - a.totalMsgCount;
    });

    const totalUsers = sortedUsers.length;
    const activeUsers = sortedUsers.filter((user) => !user.banned).length;
    const bannedUsers = sortedUsers.filter((user) => user.banned).length;
    const hiddenUsers = sortedUsers.filter(
      (user) => user.hiddenFromLeaderboard && !user.banned,
    ).length;

    const visibleUsers = sortedUsers.filter(
      (user) => !user.banned && !user.hiddenFromLeaderboard,
    );

    const positiveUsers = sortedUsers.filter((user) => user.score > 0).length;
    const negativeUsers = sortedUsers.filter((user) => user.score < 0).length;

    const totalScore = sortedUsers.reduce((sum, user) => sum + user.score, 0);
    const totalMessages = sortedUsers.reduce(
      (sum, user) => sum + user.totalMsgCount,
      0,
    );
    const averageScore = totalUsers > 0 ? totalScore / totalUsers : 0;
    const averageMessages = totalUsers > 0 ? totalMessages / totalUsers : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentlyActiveUsers = sortedUsers.filter((user) => {
      return (
        user.lastInteraction && new Date(user.lastInteraction) > thirtyDaysAgo
      );
    }).length;

    const highActivityUsers = sortedUsers.filter(
      (user) => user.totalMsgCount > 100,
    ).length;

    const highMuteUsers = sortedUsers.filter(
      (user) => user.muteCount > 5,
    ).length;

    const stats = {
      totalUsers,
      activeUsers,
      bannedUsers,
      hiddenUsers,
      visibleUsers: visibleUsers.length,
      positiveUsers,
      negativeUsers,
      averageScore: parseFloat(averageScore.toFixed(2)),
      totalScore,
      totalMessages,
      averageMessages: parseFloat(averageMessages.toFixed(1)),
      highActivityUsers,
      recentlyActiveUsers,
      highMuteUsers,
    };

    return {
      users: sortedUsers,
      stats,
    };
  } catch (error) {
    console.error("Error fetching users for management:", error);
    return {
      users: [],
      stats: {
        totalUsers: 0,
        activeUsers: 0,
        bannedUsers: 0,
        hiddenUsers: 0,
        visibleUsers: 0,
        positiveUsers: 0,
        negativeUsers: 0,
        averageScore: 0,
        totalScore: 0,
        totalMessages: 0,
        averageMessages: 0,
        highActivityUsers: 0,
        recentlyActiveUsers: 0,
        highMuteUsers: 0,
      },
    };
  }
}

module.exports = getUsersForManagement;
