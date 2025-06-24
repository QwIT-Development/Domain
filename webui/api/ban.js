const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const state = require("../../initializers/state");
const usersCache = state.usersCache;

const ban = async (req) => {
    let id, reason;
    try {
        const body = await req.json();
        id = body.id;
        reason = body.reason;
    } catch (e) {
        console.error(`Error parsing JSON in ban request: ${e.message}`);
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!id || !reason) {
        return new Response(JSON.stringify({ error: 'Invalid request, missing id or reason' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (existingUser?.banned) {
        return new Response(JSON.stringify({ error: 'User already banned' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await prisma.user.upsert({
        where: { id },
        update: { banned: true, banMessage: reason },
        create: { id, banned: true, banMessage: reason },
    });

    if (usersCache[id]) {
        delete usersCache[id];
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

module.exports = ban;