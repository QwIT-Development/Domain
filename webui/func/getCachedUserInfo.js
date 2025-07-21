const { loadConfig } = require("../../initializers/configuration");
const config = loadConfig();
const state = require("../../initializers/state");

/**
 * gets userinfo from cache without refreshing it
 * @param {string} userId
 * @returns {object} user info with expired flag
 */
function getCachedUserInfo(userId) {
  const now = Date.now();
  const cachedUserInfo = state.usersCache[userId];

  if (!cachedUserInfo) {
    return {
      username: `User_${userId.slice(-4)}`,
      avatarUrl: null,
      lastUpdated: now,
      isExpired: true,
      exists: false,
    };
  }

  const isExpired =
    now - cachedUserInfo.lastUpdated > config.TIMINGS.userCacheDuration;

  return {
    username: cachedUserInfo.username || `User_${userId.slice(-4)}`,
    avatarUrl: cachedUserInfo.avatarUrl || null,
    lastUpdated: cachedUserInfo.lastUpdated,
    isExpired: isExpired,
    exists: true,
  };
}

module.exports = getCachedUserInfo;
