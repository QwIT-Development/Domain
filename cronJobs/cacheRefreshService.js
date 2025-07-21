const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const state = require("../initializers/state");
const getUserInfo = require("../webui/func/getUserInfo");
const log = require("../utils/betterLogs");

class CacheRefreshService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.refreshInterval = 30000; // 30 sec
    this.batchSize = 5;
    this.refreshDelay = 200;
  }

  start() {
    if (this.isRunning) {
      log(
        "Cache refresh service is already running",
        "warn",
        "cacheRefreshService.js",
      );
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.refreshExpiredCaches().catch((error) => {
        console.error("Error in cache refresh service:", error);
      });
    }, this.refreshInterval);

    log("Cache refresh service started", "info", "cacheRefreshService.js");
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    log("Cache refresh service stopped", "info", "cacheRefreshService.js");
  }

  async refreshExpiredCaches() {
    const now = Date.now();
    const expiredUserIds = [];

    for (const [userId, cachedInfo] of Object.entries(state.usersCache)) {
      if (
        cachedInfo &&
        now - cachedInfo.lastUpdated > config.TIMINGS.userCacheDuration
      ) {
        expiredUserIds.push(userId);
      }
    }

    if (expiredUserIds.length === 0) {
      return;
    }

    for (let i = 0; i < expiredUserIds.length; i += this.batchSize) {
      const batch = expiredUserIds.slice(i, i + this.batchSize);
      await this.processBatch(batch);

      if (i + this.batchSize < expiredUserIds.length) {
        await this.delay(this.batchSize * this.refreshDelay);
      }
    }
  }

  /**
   * refreshes a batch of userids
   * @param {string[]} userIds
   */
  async processBatch(userIds) {
    const refreshPromises = userIds.map(async (userId, index) => {
      if (index > 0) {
        await this.delay(index * this.refreshDelay);
      }

      return this.refreshUserCache(userId);
    });

    await Promise.allSettled(refreshPromises);
  }

  /**
   * refresh cache of a singlular user
   * @param {string} userId
   */
  async refreshUserCache(userId) {
    try {
      if (!global.discordClient || !global.discordClient.isReady()) {
        if (state.usersCache[userId]) {
          state.usersCache[userId].lastUpdated = Date.now();
        }
        return;
      }

      const apiUserInfo = await getUserInfo(userId);

      if (apiUserInfo) {
        state.usersCache[userId] = {
          username: apiUserInfo.username,
          avatarUrl: apiUserInfo.avatarUrl,
          lastUpdated: Date.now(),
        };
      } else {
        if (state.usersCache[userId]) {
          state.usersCache[userId].lastUpdated = Date.now();
        } else {
          state.usersCache[userId] = {
            username: `User_${userId.slice(-4)}`,
            avatarUrl: null,
            lastUpdated: Date.now(),
          };
        }
      }
    } catch (error) {
      log(
        `Error refreshing cache for user ${userId}: ${error.message}`,
        "warn",
        "cacheRefreshService.js",
      );

      if (state.usersCache[userId]) {
        state.usersCache[userId].lastUpdated = Date.now();
      }
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      refreshInterval: this.refreshInterval,
      batchSize: this.batchSize,
      refreshDelay: this.refreshDelay,
      totalCachedUsers: Object.keys(state.usersCache).length,
      expiredCount: this.getExpiredCount(),
    };
  }

  getExpiredCount() {
    const now = Date.now();
    let expired = 0;

    for (const [userId, cachedInfo] of Object.entries(state.usersCache)) {
      if (
        cachedInfo &&
        now - cachedInfo.lastUpdated > config.TIMINGS.userCacheDuration
      ) {
        expired++;
      }
    }

    return expired;
  }
}

const cacheRefreshService = new CacheRefreshService();

module.exports = cacheRefreshService;
