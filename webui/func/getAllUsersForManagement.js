const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const state = require("../../initializers/state");
const getCachedUserInfo = require("./getCachedUserInfo");

async function getAllUsersForManagement() {
  try {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        repPoint: true,
        banned: true,
        banMessage: true,
        bondLvl: true,
        totalMsgCount: true,
        hiddenFromLeaderboard: true,
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
        banReason: user.banned ? user.banMessage : null,
        bondLvl: user.bondLvl || 0,
        totalMsgCount: user.totalMsgCount || 0,
        hiddenFromLeaderboard: user.hiddenFromLeaderboard || false,
        isExpired: cachedUserInfo.isExpired,
      };
    });

    const sortedUsers = userEntries.sort((a, b) => {
      // reputation score
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // bond level
      if (b.bondLvl !== a.bondLvl) {
        return b.bondLvl - a.bondLvl;
      }

      // message count
      return b.totalMsgCount - a.totalMsgCount;
    });

    const visibleUsers = sortedUsers.filter(
      (user) => !user.banned && !user.hiddenFromLeaderboard,
    );
    const totalUsers = visibleUsers.length;
    const positiveUsers = visibleUsers.filter((user) => user.score > 0).length;
    const totalScore = visibleUsers.reduce((sum, user) => sum + user.score, 0);
    const averageScore = totalUsers > 0 ? totalScore / totalUsers : 0;
    const totalMessages = visibleUsers.reduce(
      (sum, user) => sum + user.totalMsgCount,
      0,
    );

    const stats = {
      totalUsers,
      positiveUsers,
      averageScore,
      totalMessages,
      hiddenUsers: sortedUsers.filter(
        (user) => user.hiddenFromLeaderboard && !user.banned,
      ).length,
      bannedUsers: sortedUsers.filter((user) => user.banned).length,
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
        positiveUsers: 0,
        averageScore: 0,
        totalMessages: 0,
        hiddenUsers: 0,
        bannedUsers: 0,
      },
    };
  }
}

module.exports = getAllUsersForManagement;
