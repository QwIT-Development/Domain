const log = require("../utils/betterLogs");
const { loadConfig } = require("../initializers/configuration");
const state = require("../initializers/state");
const { model } = require("../initializers/geminiClient");
log(`Prompt reset schedule set`, "info", "cronReset.js");

const config = loadConfig();
const intervalMilliseconds = config.TIMINGS.resetPrompt * 1000;
let timeoutId = null;

const task = async () => {
  try {
    // rebuild models (so prompt updates too)
    global.geminiModel = await model(state.history, false);
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

module.exports = { reschedule };
