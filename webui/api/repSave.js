const broadcastStats = require("../func/broadcastStats");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const state = require("../../initializers/state");
const {log} = require('../../utils/betterLogs');

const repSave = async (req) => {
    let id, score;
    try {
        const body = await req.json();
        id = body.id;
        score = body.score;
    } catch (e) {
        console.error(`Failed to parse JSON: ${e.message}`);
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!id || isNaN(score)) {
        return new Response(JSON.stringify({ error: 'Invalid request, missing id or score is not a number' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const numericScore = Number(score);
    if (numericScore > 1000) {
        return new Response(JSON.stringify({ error: 'Score too high' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (numericScore < -1000) {
        return new Response(JSON.stringify({ error: 'Score too low' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        await prisma.user.upsert({
            where: { id },
            update: { repPoint: numericScore },
            create: { id, repPoint: numericScore },
        });

        // remove cached user
        if (state.usersCache[id]) {
            delete state.usersCache[id];
        }

        await broadcastStats();

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error(`Failed to save reputation: ${error.message}`);
        return new Response(JSON.stringify({ error: 'Failed to save reputation' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

module.exports = repSave;