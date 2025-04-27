const state = require("../../initializers/state");
const broadcastStats = require("../func/broadcastStats");
const repSave = async (req, res) => {
    const id = req.body.id;
    const score = req.body.score;

    if (!id || isNaN(score)) {
        return res.status(400).json({error: 'Invalid request'});
    }
    if (score > 1000) {
        return res.status(400).json({error: 'Score too high'});
    }
    if (score < -1000) {
        return res.status(400).json({error: 'Score too low'});
    }

    state.reputation[id] = score;

    // remove cached user
    if (state.usersCache[id]) {
        delete state.usersCache[id];
    }

    await broadcastStats();

    res.json({success: true});
}

module.exports = repSave;