/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const state = require("../initializers/state");
const log = require("../utils/betterLogs");
const { botReady, botSleeping } = require("./presenceManager");
const { changeSpinnerText, stopSpinner } = require("../utils/processInfo");
const fs = require("fs");
const path = require("path");
const { callOpenAI } = require("../utils/searx");
const { openai } = require("../initializers/openaiClient");
const { appendMemory } = require("./memories");

// kibasszuk a sleeptimert ha meg nem null
if (state.sleepCycleTimer === undefined) state.sleepCycleTimer = null;
if (state.isSleeping === undefined) state.isSleeping = false;

/**
 * starts configuring the sleep cycle
 * @param {string} range - format: `10:00-11:00`
 * @param {*} client
 * @returns {boolean} - if everything is good it returns true, otherwise false
 */
function schedSleep(range, client) {
  state.locationHelper.init = "sleeping.js/schedSleep";
  changeSpinnerText("Scheduling sleep...").then();

  try {
    if (!range || typeof range !== "string") {
      console.error(`Invalid range format: ${range}, expected: 10:00-11:00`);
      stopSpinner(false, "Invalid sleep range format").then();
      return false;
    }
    const parts = range.split("-").map((t) => t.trim());

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      console.error(`Invalid range format: ${range}, expected: 10:00-11:00`);
      stopSpinner(false, "Invalid sleep range format").then();
      return false;
    }
    const [startStr, endStr] = parts;

    const startTimeMs = parseTime(startStr);
    const endTimeMs = parseTime(endStr);

    if (startTimeMs === null || endTimeMs === null) {
      console.error(
        `Invalid values in range: "${range}". Are you sure you used the format?`,
      );
      stopSpinner(false, "Invalid time values in sleep range").then();
      return false;
    }

    scheduleSleepCycle(startTimeMs, endTimeMs, client, endStr);

    log(`Sleep schedule set: ${startStr} - ${endStr}`, "info", "sleeping.js");
    stopSpinner(true, `Sleep schedule set: ${startStr} - ${endStr}`).then();
    return true;
  } catch (error) {
    console.error(`Error scheduling sleep: ${error.message}`);
    if (state.sleepCycleTimer) {
      clearTimeout(state.sleepCycleTimer);
      state.sleepCycleTimer = null;
    }
    stopSpinner(false, `Error scheduling sleep: ${error.message}`).then();
    return false;
  }
}

async function createSummariesAndClearHistories() {
  log("Creating summaries and clearing histories...", "info", "sleeping.js");
  try {
    const summarizePromptTemplate = fs.readFileSync(
      path.join(global.dirname, "data", "summarize.md"),
      "utf8",
    );

    // pretty good at night cleaning
    for (const channelId of Object.keys(state.tempChannels)) {
      delete state.history[channelId];
    }
    state.tempChannels = {};

    for (const channelId in state.history) {
      if (Object.hasOwn(state.history, channelId)) {
        const history = state.history[channelId];
        if (history && history.length > 0) {
          try {
            const historyText = history
              .map((h) => `${h.role}: ${h.parts[0].text}`)
              .join("\n");
            let prompt = summarizePromptTemplate.replace(
              "{history}",
              historyText,
            );
            prompt = prompt.replace(
              "{bot_prompt}",
              state.prompts[channelId] || "",
            );

            const summary = await callOpenAI(openai, prompt, {
              model: "gemini-2.5-flash",
            });

            state.summaries[channelId] = summary;
            await appendMemory(summary, channelId);

            log(
              `Summary created for channel ${channelId}`,
              "info",
              "sleeping.js",
            );
          } catch (error) {
            log(
              `Failed to create summary for channel ${channelId}: ${error}`,
              "error",
              "sleeping.js",
            );
          }
        }
      }
    }
    // Clear all histories
    for (const channel in state.history) {
      state.history[channel] = [];
    }
    log(
      "Finished creating summaries and cleared all histories.",
      "info",
      "sleeping.js",
    );
  } catch (e) {
    log(
      `Error in createSummariesAndClearHistories: ${e}`,
      "error",
      "sleeping.js",
    );
  }
}

/**
 * parses time string
 * @param {string} timeStr - format (`10:00`)
 * @returns {number|null} - millisec from midnight
 */
function parseTime(timeStr) {
  state.locationHelper.init = "sleeping.js/parseTime";
  try {
    const timeRegex = /(\d{1,2}):(\d{2})/;
    const matches = timeRegex.exec(timeStr);

    if (!matches) return null;

    const hours = parseInt(matches[1], 10);
    const minutes = parseInt(matches[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.error(
        `Invalid time: ${hours}:${minutes}, are you sure this right?`,
      );
      return null;
    }

    return (hours * 60 + minutes) * 60 * 1000;
  } catch (error) {
    console.error(`Error parsing time string: ${timeStr}, ${error.message}`);
    return null;
  }
}

/**
 * Sets the next sleep event
 * @param {number} sleepTime - start time ms
 * @param {number} wakeTime - end tiem ms
 * @param {*} client
 * @param {string} wakeTimeStr - time string
 */
function scheduleSleepCycle(sleepTime, wakeTime, client, wakeTimeStr) {
  state.locationHelper.init = "sleeping.js/scheduleSleepCycle";
  if (state.sleepCycleTimer) clearTimeout(state.sleepCycleTimer);
  state.sleepCycleTimer = null;

  const now = new Date();
  const midnight = new Date(now).setHours(0, 0, 0, 0);
  const currentTimeMs = now.getTime() - midnight;
  const dayInMs = 24 * 60 * 60 * 1000;

  const isOvernight = sleepTime > wakeTime;

  let shouldBeSleeping;
  if (isOvernight) {
    // ejszakai idokre (e.g., 22:00-06:00)
    shouldBeSleeping = currentTimeMs >= sleepTime || currentTimeMs < wakeTime;
  } else {
    // egynapos idore (e.g., 01:00-05:00)
    shouldBeSleeping = currentTimeMs >= sleepTime && currentTimeMs < wakeTime;
  }

  if (shouldBeSleeping && !state.isSleeping) {
    state.isSleeping = true;
    botSleeping(client, wakeTimeStr).catch((err) =>
      console.error(`Error setting sleeping status: ${err}`),
    );
  } else if (!shouldBeSleeping && state.isSleeping) {
    state.isSleeping = false;
    botReady(client).catch((err) =>
      console.error(`Error setting ready status: ${err}`),
    );
  }

  let msUntilNextEvent;
  let nextAction;

  if (state.isSleeping) {
    msUntilNextEvent = wakeTime - currentTimeMs;
    if (msUntilNextEvent <= 0) {
      msUntilNextEvent += dayInMs;
    }
    log(
      `Bot is sleeping, waking up at: ${formatDuration(msUntilNextEvent)}`,
      "info",
      "sleeping.js",
    );

    nextAction = () => {
      log("Bot is now awake", "info", "sleeping.js");
      state.isSleeping = false;
      state.sleepCycleTimer = null;
      botReady(client).catch((err) =>
        console.error(`Error setting ready status on wake: ${err}`),
      );
      scheduleSleepCycle(sleepTime, wakeTime, client, wakeTimeStr);
    };
  } else {
    msUntilNextEvent = sleepTime - currentTimeMs;
    if (msUntilNextEvent <= 0) {
      msUntilNextEvent += dayInMs;
    }
    log(
      `Bot is awake, sleeping at: ${formatDuration(msUntilNextEvent)}`,
      "info",
      "sleeping.js",
    );

    nextAction = async () => {
      log("Bot is now sleeping", "info", "sleeping.js");
      await createSummariesAndClearHistories();
      state.isSleeping = true;
      state.sleepCycleTimer = null;
      botSleeping(client, wakeTimeStr).catch((err) =>
        console.error(`Error setting sleeping status on sleep: ${err}`),
      );
      scheduleSleepCycle(sleepTime, wakeTime, client, wakeTimeStr);
    };
  }

  if (msUntilNextEvent < 0) msUntilNextEvent = 0;

  state.sleepCycleTimer = setTimeout(nextAction, msUntilNextEvent);
}

/**
 * formats the time to humanly forms
 * @param {number} ms - milisec
 * @returns {string} - sexy formatted string
 */
function formatDuration(ms) {
  if (ms < 0) ms = 0; // handle rollowers
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return `${hours}h ${minutes}m ${seconds}s`;
}

module.exports = schedSleep;
