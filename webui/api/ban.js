const state = require("../../initializers/state");
const path = require("path");
const fs = require("fs");
const usersCache = state.usersCache;
const dataDir = path.join(global.dirname, 'data', 'running');

const ban = async (req) => {
    let id, reason;
    try {
        const body = await req.json();
        id = body.id;
        reason = body.reason;
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!id || !reason) {
        return new Response(JSON.stringify({ error: 'Invalid request, missing id or reason' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (state.banlist[id]) {
        return new Response(JSON.stringify({ error: 'User already banned' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    state.banlist[id] = reason;
    if (usersCache[id]) {
        delete usersCache[id];
    }
    const banlistPath = path.join(dataDir, 'banlist.json');
    fs.writeFileSync(banlistPath, JSON.stringify(state.banlist, null, 2));
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

module.exports = ban;