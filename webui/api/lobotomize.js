const state = require("../../initializers/state");
const broadcastStats = require("../func/broadcastStats");

const lobotomize = async (req) => {
    for (const channel in state.history) {
        state.history[channel] = [];
        state.resetCounts += 1;
    }

    await broadcastStats();
    return new Response(JSON.stringify({
        success: true
    }), { headers: { 'Content-Type': 'application/json' } });
}

module.exports = lobotomize;