const { loadConfig } = require("../../initializers/configuration");
const config = loadConfig();
const state = require("../../initializers/state");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const getUserInfo = require("./getUserInfo");
const usersCache = state.usersCache;

async function getEntry(userId) {
  const now = Date.now();
  let cachedUserInfo = usersCache[userId];
  let needsAPIRefresh = false;

  if (
    !cachedUserInfo ||
    now - cachedUserInfo.lastUpdated > config.TIMINGS.userCacheDuration
  ) {
    needsAPIRefresh = true;
  }

  let apiUserInfo = null;
  if (needsAPIRefresh) {
    try {
      apiUserInfo = await getUserInfo(userId);
      if (apiUserInfo) {
        cachedUserInfo = {
          // id: userId
          username: apiUserInfo.username,
          avatarUrl: apiUserInfo.avatarUrl,
          lastUpdated: now,
        };
        usersCache[userId] = cachedUserInfo;
      } else if (cachedUserInfo) {
        cachedUserInfo.lastUpdated = now;
      } else {
        cachedUserInfo = {
          username: "Unknown",
          avatarUrl: null,
          lastUpdated: now,
        };
        usersCache[userId] = cachedUserInfo;
      }
    } catch (error) {
      console.error(`Error getting user info for ${userId}: ${error.message}`);
      if (!cachedUserInfo) {
        cachedUserInfo = {
          username: "Unknown",
          avatarUrl: null,
          lastUpdated: now,
        };
        usersCache[userId] = cachedUserInfo;
      }
    }
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });

    const entry = {
      id: userId,
      username: cachedUserInfo.username,
      avatarUrl: cachedUserInfo.avatarUrl,
      lastUpdated: cachedUserInfo.lastUpdated,
      score: dbUser ? dbUser.repPoint : 0,
      banReason: dbUser?.banned ? dbUser.banMessage : null,
      bondLvl: dbUser ? dbUser.bondLvl : 0,
      totalMsgCount: dbUser ? dbUser.totalMsgCount : 0,
    };
    return entry;
  } catch (error) {
    console.error(`Database error for user ${userId}: ${error.message}`);
    return {
      id: userId,
      username: cachedUserInfo.username || "Unknown",
      avatarUrl: cachedUserInfo.avatarUrl || null,
      lastUpdated: cachedUserInfo.lastUpdated || now,
      score: 0,
      banReason: null,
      bondLvl: 0,
      totalMsgCount: 0,
    };
  }
}

module.exports = getEntry;
