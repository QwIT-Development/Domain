/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const log = require('../utils/betterLogs');
const {loadConfig} = require('../initializers/configuration');
const config = loadConfig();

/**
 * getter and setter func
 * @param id - userid
 * @param type - `increase`/`decrease` or nothing (getter)
 * @returns {Promise<number|boolean>} - returns a number on getting and a bool on setting
 */
async function reputation(id, type = "") {
    if (!id) {
        console.error(`Missing argument`);
        return false;
    }

    const maxValue = 2000; // old value = 1000 (100%)

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
        console.error(`Missing argument`);
        return false;
    }

    const maxValue = 1000;

    let user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
        await prisma.user.create({ data: { id, repPoint: 0 } });
    }

    let newRep = value;
    if (newRep > maxValue) {
        newRep = maxValue;
    }
    await prisma.user.update({ where: { id }, data: { repPoint: newRep } });
    return newRep;
}

module.exports = { reputation, reputationSet };