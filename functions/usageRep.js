/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const state = require("../initializers/state");
const usersCache = state.usersCache;
const { reputationSet, reputation } = require("../db/reputation");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();

const firstGiftCount = 10;

/**
 * calcs the cumulative messages needed for reputation points
 * @param {number} bondLvl - The current bond level
 * @returns {number} - messages required
 */
async function calcRequiredMsgs(bondLvl) {
  if (bondLvl <= 0) {
    return 0;
  }
  if (bondLvl === 1) {
    return firstGiftCount;
  }

  let required;
  const cumulativeMode = config.CUMULATIVE_MODE || "classic";

  switch (cumulativeMode) {
    case "classic":
      required = firstGiftCount + Math.pow(bondLvl - 1, 1.8) * 5;
      break;
    case "noise":
      required =
        firstGiftCount +
        1.5 * Math.pow(bondLvl - 1, 1.3) +
        5 * Math.sin(0.8 * bondLvl) +
        3 * Math.cos(1.5 * bondLvl + Math.PI / 2) +
        2 * Math.sin(2.5 * bondLvl + Math.PI / 3);
      break;
    case "worse":
      required =
        firstGiftCount +
        1.2 * Math.pow(bondLvl - 1, 1.45) +
        (3 + 2 * Math.sin(0.3 * bondLvl + Math.PI / 7)) *
          Math.sin(1.1 * bondLvl + bondLvl / 5) +
        4 * Math.cos(2.5 * bondLvl - Math.pow(bondLvl, 1.1) / 3 + Math.PI / 3) +
        2.5 * Math.sin(7 * bondLvl) * Math.cos(0.6 * bondLvl + Math.PI / 5) +
        1.8 * Math.sin(12 * bondLvl + 3 * Math.cos(bondLvl)) -
        0.1 * bondLvl * Math.sin(0.2 * bondLvl);
      break;
    default:
      required = firstGiftCount + Math.pow(bondLvl - 1, 1.8) * 5; // fallback, if user didn't set mode
      break;
  }

  return Math.ceil(required);
  /*
    bond lvl 1: 10 messages
    bond lvl 2: 15 messages // 10 + (1^1.8 * 5)
    bond lvl 3: 28 messages // 10 + (2^1.8 * 5)
    bond lvl 4: 47 messages // 10 + (3^1.8 * 5)
    bond lvl 5: 70 messages // 10 + (4^1.8 * 5)
    ...
    */
}

async function bondUpdater(userId) {
  // the user should already exist at this point
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const msgCount = user.msgCount || 0;
  const totalMsgCount = user.totalMsgCount || 0;
  await prisma.user.update({
    where: { id: userId },
    data: {
      msgCount: msgCount + 1,
      totalMsgCount: totalMsgCount + 1, // analytics
    },
  });
  const currentBondLvl = user.bondLvl || 0;
  const requiredMsgs = calcRequiredMsgs(currentBondLvl + 1);
  if (msgCount >= requiredMsgs) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        bondLvl: currentBondLvl + 1,
        msgCount: 0, // reset message count, bc of cumulative thing
      },
    });
    const currentRep = await reputation(userId);
    const newRep = currentRep + currentBondLvl + 1;
    await reputationSet(userId, newRep);
    if (usersCache[userId]) {
      delete usersCache[userId];
    }
  }
}

module.exports = { bondUpdater };
