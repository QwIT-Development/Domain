/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const state = require('../initializers/state');
const usersCache = state.usersCache;
const {reputationSet, reputation} = require('../utils/reputation');

const firstGiftCount = 10;
const exponent = 1.8;
const scalingFactor = 5;

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
    const required = firstGiftCount + Math.pow(bondLvl - 1, exponent) * scalingFactor;
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
    const requiredMsgs = await calcRequiredMsgs(currentBondLvl + 1);
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