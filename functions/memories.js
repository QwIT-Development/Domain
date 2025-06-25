/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getMemories(channelId) {
    const memories = await prisma.memory.findMany({
        where: {
            channelId: channelId,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });
    // this returns a markdown formatted codeblock for each memory
    return memories.map(m => `- \`\`\`\n${m.content}\n\`\`\``).join("\n");
}

async function appendMemory(str, channelId) {
    await prisma.memory.create({
        data: {
            channelId: channelId,
            content: str,
        },
    });
}

module.exports = {getMemories, appendMemory};