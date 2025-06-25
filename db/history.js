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
        let history;
        if (result) {
            history = JSON.parse(result.history);
        }
        if (Array.isArray(history) && history.length > 0) {
            console.log(`Reloaded history for channel ${channelId} with ${history.length} messages.`);
            return history;
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
            const history = JSON.parse(result.history);
            if (!Array.isArray(history) || history.length === 0) {
                continue;
            }

            const cleanedHistory = history
                .map(message => {
                    if (message.parts && Array.isArray(message.parts)) {
                        const cleanedParts = message.parts.filter(part => !part.fileData);
                        return { ...message, parts: cleanedParts };
                    }
                    return message;
                })
                .filter(message => !(message.parts && Array.isArray(message.parts) && message.parts.length === 0));

            if (cleanedHistory.length > 0) {
                histories[result.channelId] = cleanedHistory;
                console.log(`Reloaded history for channel ${result.channelId} with ${cleanedHistory.length} messages.`);
            }
        }
        return histories;
    } catch (error) {
        log(`Error loading all histories: ${error}`, 'error', 'prisma/history.js');
        return {};
    }
}

module.exports = { saveHistory, loadHistory, deleteHistory, loadAllHistories };
