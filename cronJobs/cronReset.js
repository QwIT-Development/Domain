const log = require('../utils/betterLogs');
const config = require('../config.json');
const state = require("../initializers/state");
const {model} = require("../initializers/geminiClient");
log(`Prompt reset schedule set`, 'info', 'cronReset.js');

const intervalMilliseconds = config.TIMINGS.resetPrompt * 1000;
let timeoutId = null;

const task = async () => {
    let count = 0;
    try {
        // rebuild models (so prompt updates too)
        global.geminiModel = await model(state.history, false);

        // this won't reset history, instead it just refreshes the models
        // this shouldn't add up to the global reset count
        count = Object.keys(state.history).length;
    } catch (error) {
        console.error(`Error while resetting prompt reset task: ${error}`);
    } finally {
        timeoutId = setTimeout(task, intervalMilliseconds);
    }
};

const reschedule = () => {
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }

    timeoutId = setTimeout(task, intervalMilliseconds);
};

timeoutId = setTimeout(task, intervalMilliseconds);

module.exports = {reschedule};