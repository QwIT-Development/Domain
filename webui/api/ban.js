const state = require("../../initializers/state");
const path = require("path");
const fs = require("fs");
const usersCache = state.usersCache;
const dataDir = path.join(global.dirname, 'data', 'running');

const ban = async (req, res) => {
    const id = req.body.id;
    const reason = req.body.reason;
    if (!id || !reason) {
        return res.status(400).json({error: 'Invalid request'});
    }
    if (state.banlist[id]) {
        return res.status(400).json({error: 'User already banned'});
    }
    state.banlist[id] = reason;
    if (usersCache[id]) {
        delete usersCache[id];
    }
    const banlistPath = path.join(dataDir, 'banlist.json');
    fs.writeFileSync(banlistPath, JSON.stringify(state.banlist, null, 2));
}

module.exports = ban;