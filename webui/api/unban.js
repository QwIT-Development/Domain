const state = require("../../initializers/state");
const path = require("path");
const fs = require("fs");
const usersCache = state.usersCache;
const dataDir = path.join(global.dirname, 'data', 'running');

const unban = async (req) => {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (state.banlist[id]) {
        delete state.banlist[id];
        if (usersCache[id]) {
            delete usersCache[id];
        }
        const banlistPath = path.join(dataDir, 'banlist.json');
        fs.writeFileSync(banlistPath, JSON.stringify(state.banlist, null, 2));
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } else {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
}

module.exports = unban;