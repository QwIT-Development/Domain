/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae

        Cache warmup function that pre-populates the users cache at WebUI startup.

        Optional configuration settings (add to config.toml if desired):
        - WEBUI_CACHE_BATCH_SIZE: Number of users to process per batch (default: 5)
        - WEBUI_CACHE_BATCH_DELAY: Delay between batches in milliseconds (default: 200)

        These settings help control the rate of Discord API calls during cache warmup.
*/

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { changeSpinnerText, stopSpinner } = require("../../utils/processInfo");
const getUserInfo = require("./getUserInfo");
const state = require("../../initializers/state");
const { loadConfig } = require("../../initializers/configuration");
const config = loadConfig();

async function warmupCache() {
  try {
    changeSpinnerText("Starting user cache warmup...");

    const allUsers = await prisma.user.findMany();
    const userIds = allUsers.map((user) => user.id);

    if (userIds.length === 0) {
      stopSpinner(true, "No users found in database, cache warmup complete");
      return;
    }

    changeSpinnerText(`Found ${userIds.length} users, warming up cache...`);

    const now = Date.now();
    let successCount = 0;
    let failCount = 0;
    let processedCount = 0;

    const batchSize = config.WEBUI_CACHE_BATCH_SIZE || 20;
    const batchDelay = config.WEBUI_CACHE_BATCH_DELAY || 10;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (userId) => {
        try {
          // Check if Discord client is available
          if (!global.discordClient || !global.discordClient.isReady()) {
            state.usersCache[userId] = {
              username: "Unknown",
              avatarUrl: null,
              lastUpdated: now,
            };
            failCount++;
            processedCount++;
            changeSpinnerText(
              `Caching users: ${processedCount}/${userIds.length} (Discord client not ready)`,
            );
            return;
          }

          const apiUserInfo = await getUserInfo(userId);

          if (apiUserInfo) {
            state.usersCache[userId] = {
              username: apiUserInfo.username,
              avatarUrl: apiUserInfo.avatarUrl,
              lastUpdated: now,
            };
            successCount++;
          } else {
            // Cache as unknown user if Discord API fails
            state.usersCache[userId] = {
              username: "Unknown",
              avatarUrl: null,
              lastUpdated: now,
            };
            failCount++;
          }

          processedCount++;
          changeSpinnerText(
            `Caching users: ${processedCount}/${userIds.length} processed`,
          );
        } catch (error) {
          // Cache as unknown user on error
          state.usersCache[userId] = {
            username: "Unknown",
            avatarUrl: null,
            lastUpdated: now,
          };
          failCount++;
          processedCount++;
          changeSpinnerText(
            `Caching users: ${processedCount}/${userIds.length} processed (error on ${userId})`,
          );
        }
      });

      try {
        await Promise.allSettled(batchPromises);
      } catch (error) {
        // Batch processing error - continue with next batch
      }

      // Small delay between batches to be respectful to Discord API
      if (i + batchSize < userIds.length) {
        await new Promise((resolve) => setTimeout(resolve, batchDelay));
      }
    }

    stopSpinner(
      true,
      `Cache warmup complete: ${successCount} cached, ${failCount} failed/unknown`,
    );
  } catch (error) {
    stopSpinner(false, `Cache warmup failed: ${error.message}`);
    console.error("Cache warmup error:", error);
  }
}

module.exports = warmupCache;
