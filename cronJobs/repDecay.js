/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const log = require("../utils/betterLogs");
const { loadConfig } = require("../initializers/configuration");
const state = require("../initializers/state");

const config = loadConfig();
const intervalMilliseconds = 24 * 60 * 60 * 1000; // 24 hours
let timeoutId = null;

const task = async () => {
  try {
    log("Running reputation decay task...", "info", "repDecay.js");
    const users = await prisma.user.findMany();
    const sevenDaysAgo = new Date(Date.now() - 7 * intervalMilliseconds); // 7 days

    for (const user of users) {
      if (user.lastInteraction < sevenDaysAgo && !user.decayed) {
        const newRep = user.repPoint - 2; // was 10, but it would be too much
        await prisma.user.update({
          where: { id: user.id },
          data: { repPoint: newRep, decayed: true },
        });
        log(`Decayed reputation for user ${user.id}`, "info", "repDecay.js");

        try {
          const discordUser = await global.discordClient.users.fetch(user.id);
          await discordUser.send(state.strings.reputation.decayed);
        } catch (e) {
          log(
            `Couldn't send decay message to user ${user.id}: ${e}`,
            "warn",
            "repDecay.js",
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error while running reputation decay task: ${error}`);
  } finally {
    timeoutId = setTimeout(task, intervalMilliseconds);
  }
};

const reschedule = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  timeoutId = setTimeout(task, intervalMilliseconds);
};

timeoutId = setTimeout(task, intervalMilliseconds);

module.exports = { reschedule };
