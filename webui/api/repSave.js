const state = require("../../initializers/state");
const broadcastStats = require("../func/broadcastStats");

const repSave = async (req) => {
    let id, score;
    try {
        const body = await req.json();
        id = body.id;
        score = body.score;
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!id || isNaN(score)) {
        return new Response(JSON.stringify({ error: 'Invalid request, missing id or score is not a number' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (score > 1000) {
        return new Response(JSON.stringify({ error: 'Score too high' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (score < -1000) {
        return new Response(JSON.stringify({ error: 'Score too low' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    state.reputation[id] = Number(score);

    // remove cached user
    if (state.usersCache[id]) {
        delete state.usersCache[id];
    }

    await broadcastStats();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

module.exports = repSave;