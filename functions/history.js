/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const log = require('../utils/betterLogs');

async function saveHistory(channelId, history) {
    try {
        const historyString = JSON.stringify(history);
        await prisma.history.upsert({
            where: { channelId },
            update: { history: historyString },
            create: { channelId, history: historyString },
        });
    } catch (error) {
        log(`Error saving history for channel ${channelId}: ${error}`, 'error', 'prisma/history.js');
    }
}

async function loadHistory(channelId) {
    try {
        const result = await prisma.history.findUnique({
            where: { channelId },
        });
        if (result) {
            return JSON.parse(result.history);
        }
        return [];
    } catch (error) {
        log(`Error loading history for channel ${channelId}: ${error}`, 'error', 'prisma/history.js');
        return [];
    }
}

async function deleteHistory(channelId) {
    try {
        await prisma.history.delete({
            where: { channelId },
        });
    } catch (error) {
        if (error.code !== 'P2025') {
            log(`Error deleting history for channel ${channelId}: ${error}`, 'error', 'prisma/history.js');
        }
    }
}

async function loadAllHistories() {
    try {
        const results = await prisma.history.findMany();
        const histories = {};
        for (const result of results) {
            histories[result.channelId] = JSON.parse(result.history);
        }
        return histories;
    } catch (error) {
        log(`Error loading all histories: ${error}`, 'error', 'prisma/history.js');
        return {};
    }
}

module.exports = { saveHistory, loadHistory, deleteHistory, loadAllHistories };
