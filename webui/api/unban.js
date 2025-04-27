const state = require("../../initializers/state");
const path = require("path");
const fs = require("fs");
const usersCache = state.usersCache;
const dataDir = path.join(global.dirname, 'data', 'running');

const unban = async (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).json({error: 'Invalid request'});
    }

    if (state.banlist[id]) {
        delete state.banlist[id];
        if (usersCache[id]) {
            delete usersCache[id];
        }
        const banlistPath = path.join(dataDir, 'banlist.json');
        fs.writeFileSync(banlistPath, JSON.stringify(state.banlist, null, 2));
        res.json({success: true});
    } else {
        res.status(404).json({error: 'User not found'});
    }
}

module.exports = unban;