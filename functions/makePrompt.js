/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const path = require("path");
const fs = require("fs");
const log = require("../utils/betterLogs");
const { getContext } = require("../utils/searx");
const { getMemories } = require("../functions/memories");
const knowledgePath = global.dirname + "/knowledge";
const state = require("../initializers/state");

/**
 * Formats the time to a much better format
 * @param date
 * @returns string - 2025. jan 01. Wednesday 12:00
 */
function formatDate(date) {
  const year = date.getFullYear();
  // noinspection JSCheckFunctionSignatures
  const month = date.toLocaleString(config.LOCALE, { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  // noinspection JSCheckFunctionSignatures
  const weekday = date.toLocaleString(config.LOCALE, { weekday: "long" });
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}. ${month} ${day}. ${weekday} ${hour}:${minute}`;
}

/**
 * **REQUIRED** creates a prompt
 * @returns {Promise<string>}
 */
async function makePrompt(channelId, showLog = true) {
  let promptPath;
  // i really hope this will work
  if (Object.hasOwn(state.tempChannels, channelId)) {
    promptPath = config.DEFAULT_PROMPT;
  } else {
    promptPath = config.CHANNELS[channelId]?.prompt || config.DEFAULT_PROMPT;
  }
  // noinspection JSUnresolvedReference
  const aliases = config.ALIASES;
  let prompt;

  // try to load prompt, if it's nonexistent, return empty string, which will defaults
  // gemini to its default prompt
  try {
    // path: ./prompts/<PROMPT_PATH>
    // noinspection JSUnresolvedReference
    prompt = fs.readFileSync(
      path.join(global.dirname, "prompts", promptPath),
      "utf8",
    );
    if (showLog) {
      log(`Loaded prompt: ${promptPath}`, "info", "makeprompt.js");
    }
  } catch (e) {
    console.error(`Failed to load prompt: ${e}`);
    console.log("Defaulting to nothing");
    return "";
  }

  // insert aliases to ${ALIASES}
  if (prompt.includes("{ALIASES}")) {
    prompt = prompt.replace("{ALIASES}", aliases.join(", "));
  }

  // set current time in prompt ${CURRENT_TIME}
  // date will look like this: 2025. jan 01. Wednesday 12:00
  if (prompt.includes("{CURRENT_TIME}")) {
    prompt = prompt.replace("{CURRENT_TIME}", formatDate(new Date()));
  }

  const knowledgeFiles = fs
    .readdirSync(knowledgePath)
    .filter((file) => file.endsWith(".md") || file.endsWith(".txt"));
  // load wiki contents, if possible
  // added ?, so if the channel doesn't have assigned wiki urls it won't crash
  if (
    (config.CHANNELS[channelId]?.wikis?.length > 0 ||
      knowledgeFiles.length > 0) &&
    prompt.includes("{WIKI_CONTENT}")
  ) {
    let content = "";
    for (const url of config.CHANNELS[channelId]?.wikis ?? []) {
      content += `\n${await getContext(url)}`;
    }
    for (const file of knowledgeFiles) {
      content += `\n${fs.readFileSync(path.join(knowledgePath, file), "utf-8")}`;
    }
    if (showLog) {
      log(
        `Loaded ${config.CHANNELS[channelId]?.wikis?.length ?? 0} wiki pages and ${knowledgeFiles.length} knowledge files`,
        "info",
        "makeprompt.js",
      );
    }
    prompt = prompt.replace("{WIKI_CONTENT}", content);
  } else if (prompt.includes("{WIKI_CONTENT}")) {
    prompt = prompt.replace("{WIKI_CONTENT}", "");
  }

  if (prompt.includes("{MEMORIES}")) {
    const memories = await getMemories(channelId);
    if (memories.length > 0) {
      prompt = prompt.replace("{MEMORIES}", memories);
      if (showLog) {
        log(`Loaded ${memories.length} memories`, "info", "makeprompt.js");
      }
    } else {
      prompt = prompt.replace("{MEMORIES}", "");
    }
  }

  // load mute words, for later use
  let muteWords;
  try {
    // path: ./data/muteWords.json
    // noinspection JSUnresolvedReference
    muteWords = fs.readFileSync(
      path.join(global.dirname, "data", "muteWords.json"),
      "utf8",
    );
    muteWords = JSON.parse(muteWords);
  } catch (e) {
    console.error(`Failed to load mute words: ${e}`);
    muteWords = [];
  }

  // add words, what the bot don't like and will mute users on trigger
  if (prompt.includes("{MUTE_WORDS}")) {
    prompt = prompt.replace("{MUTE_WORDS}", muteWords.join(", "));
  }

  return prompt;
}

module.exports = { makePrompt, formatDate };
