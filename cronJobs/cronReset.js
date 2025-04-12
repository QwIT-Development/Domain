const log = require('../utils/betterLogs');
const config = require('../config.json');
const {initializeSpinner, changeSpinnerText, stopSpinner} = require('../utils/processInfo');
const state = require("../initializers/state");
const {resetPrompt, model} = require("../initializers/geminiClient");
log(`Prompt reset schedule set`, 'info', 'cronReset.js');

const intervalMilliseconds = config.TIMINGS.resetPrompt * 1000;
let timeoutId = null;

const task = async () => {
    await initializeSpinner();
    await changeSpinnerText('Running prompt reset task...');
    let count = 0;
    try {
        // rebuild models (so prompt updates too)
        global.geminiModel = await model(state.history);

        // this won't reset history, instead it just refreshes the models
        for (const channel in state.history) {
            global.geminiSession = resetPrompt(global.geminiModel, state.history, channel);
            // this shouldn't add up to the global reset count
            count += 1;
        }
        await stopSpinner(true, `Refreshed ${count} models.`);
    } catch (error) {
        log(`Error while resetting prompt reset task: ${error}`, 'error', 'cronReset.js');
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