const state = require("../../initializers/state");
const {resetPrompt} = require("../../initializers/geminiClient");
const broadcastStats = require("../func/broadcastStats");
const lobotomize = async (req, res) => {
    for (const channel in state.history) {
        state.history[channel] = [];
        global.geminiSession = resetPrompt(global.geminiModel, state.history, channel);
        state.resetCounts += 1;
    }

    await broadcastStats();
    res.json({
        success: true
    });
}

module.exports = lobotomize;