const state = require('../initializers/state');
const config = require('../config.json');

async function generateHistory() {
    for (const channel of config.CHANNELS) {
        state.history[channel] = [];
    }
}

module.exports = generateHistory;