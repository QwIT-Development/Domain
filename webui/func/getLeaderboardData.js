const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const state = require("../../initializers/state");

async function getLeaderboardData() {
  try {
    // Get only needed fields for leaderboard performance
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        repPoint: true,
        banned: true,
        banMessage: true,
        bondLvl: true,
        totalMsgCount: true,
      },
    });

    // Filter out banned users and create user entries using cached data when available, fallback to database
    const userEntries = allUsers
      .filter((user) => !user.banned)
      .map((user) => {
        const cachedUserInfo = state.usersCache[user.id];

        return {
          id: user.id,
          username: cachedUserInfo?.username || `User_${user.id.slice(-4)}`,
          avatarUrl: cachedUserInfo?.avatarUrl || null,
          lastUpdated: cachedUserInfo?.lastUpdated || Date.now(),
          score: user.repPoint || 0,
          banReason: user.banned ? user.banMessage : null,
          bondLvl: user.bondLvl || 0,
          totalMsgCount: user.totalMsgCount || 0,
        };
      });

    // Sort users by reputation score (descending), then by bond level (descending), then by message count (descending)
    const sortedUsers = userEntries.sort((a, b) => {
      // Primary sort: reputation score (descending)
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Secondary sort: bond level (descending)
      if (b.bondLvl !== a.bondLvl) {
        return b.bondLvl - a.bondLvl;
      }

      // Tertiary sort: message count (descending)
      return b.totalMsgCount - a.totalMsgCount;
    });

    // Calculate statistics (excluding banned users)
    const totalUsers = sortedUsers.length;
    const positiveUsers = sortedUsers.filter((user) => user.score > 0).length;
    const totalScore = sortedUsers.reduce((sum, user) => sum + user.score, 0);
    const averageScore = totalUsers > 0 ? totalScore / totalUsers : 0;
    const totalMessages = sortedUsers.reduce(
      (sum, user) => sum + user.totalMsgCount,
      0,
    );

    const stats = {
      totalUsers,
      positiveUsers,
      averageScore,
      totalMessages,
    };

    return {
      users: sortedUsers,
      stats,
    };
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return {
      users: [],
      stats: {
        totalUsers: 0,
        positiveUsers: 0,
        averageScore: 0,
        totalMessages: 0,
      },
    };
  }
}

module.exports = getLeaderboardData;
