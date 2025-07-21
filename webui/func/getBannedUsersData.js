const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const state = require("../../initializers/state");
const getCachedUserInfo = require("./getCachedUserInfo");

async function getBannedUsersData() {
  try {
    const bannedUsers = await prisma.user.findMany({
      where: { banned: true },
      select: {
        id: true,
        repPoint: true,
        banned: true,
        banMessage: true,
        bondLvl: true,
        totalMsgCount: true,
        hiddenFromLeaderboard: true,
        lastInteraction: true,
        muteCount: true,
      },
    });

    const userEntries = bannedUsers.map((user) => {
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
        totalMsgCount: user.totalMsgCount || 0,
        hiddenFromLeaderboard: user.hiddenFromLeaderboard || false,
        lastInteraction: user.lastInteraction,
        muteCount: user.muteCount || 0,
        isExpired: cachedUserInfo.isExpired,
      };
    });

    const sortedUsers = userEntries.sort((a, b) => {
      return new Date(b.lastInteraction) - new Date(a.lastInteraction);
    });

    const totalBannedUsers = sortedUsers.length;
    const recentBans = sortedUsers.filter((user) => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(user.lastInteraction) > oneDayAgo;
    }).length;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyBans = sortedUsers.filter((user) => {
      return new Date(user.lastInteraction) > oneWeekAgo;
    }).length;

    const averageReputation =
      totalBannedUsers > 0
        ? sortedUsers.reduce((sum, user) => sum + user.score, 0) /
          totalBannedUsers
        : 0;

    const highMuteCount = sortedUsers.filter(
      (user) => user.muteCount > 5,
    ).length;

    const stats = {
      totalBannedUsers,
      recentBans,
      weeklyBans,
      averageReputation,
      highMuteCount,
    };

    return {
      users: sortedUsers,
      stats,
    };
  } catch (error) {
    console.error("Error fetching banned users data:", error);
    return {
      users: [],
      stats: {
        totalBannedUsers: 0,
        recentBans: 0,
        weeklyBans: 0,
        averageReputation: 0,
        highMuteCount: 0,
      },
    };
  }
}

module.exports = getBannedUsersData;
