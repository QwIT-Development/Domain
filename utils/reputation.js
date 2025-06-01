/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const log = require('../utils/betterLogs');
const config = require('../config.json');

/**
 * lekérő és változtató func
 * @param id - userid
 * @param type - `increase`/`decrease` vagy semmi (lekérdezés)
 * @returns {Promise<number|boolean>} - visszaad egy számot vagy boolt (változásnál)
 */
async function reputation(id, type = "") {
    if (!id) {
        log(`Missing argument`, 'error', 'reputation.js');
        return false;
    }

    const maxValue = 1000;

    let user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
        user = await prisma.user.create({ data: { id, repPoint: 0 } });
    }

    if (type === "increase") {
        let newRep = user.repPoint + 1;
        if (newRep > maxValue) {
            newRep = maxValue;
        }
        await prisma.user.update({ where: { id }, data: { repPoint: newRep } });
        return newRep;
    } else if (type === "decrease") {
        let newRep = user.repPoint - 1;
        if (newRep < -maxValue) {
            newRep = -maxValue;
        }
        await prisma.user.update({ where: { id }, data: { repPoint: newRep } });
        return newRep;
    } else {
        return user.repPoint;
    }
}

// precise reputation setter
async function reputationSet(id, value) {
    if (!id) {
        log(`Missing argument`, 'error', 'reputation.js');
        return false;
    }

    const maxValue = 1000;

    let user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
        user = await prisma.user.create({ data: { id, repPoint: 0 } });
    }

    let newRep = value;
    if (newRep > maxValue) {
        newRep = maxValue;
    }
    await prisma.user.update({ where: { id }, data: { repPoint: newRep } });
    return newRep;
}

module.exports = { reputation, reputationSet };