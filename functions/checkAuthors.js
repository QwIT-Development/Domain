/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const jailbreaks = require("../data/jailbreaks.json");
const state = require("../initializers/state");
const log = require("../utils/betterLogs");
const { splitFuzzySearch } = require("../utils/fuzzySearch");
const { PrismaClient } = require("@prisma/client");
const { shouldRespond } = require("./shouldRespond");
const { makePrompt } = require("./makePrompt");
const prisma = new PrismaClient();

/**
 * Checks if the message meets certain criteria (described in more detail in the description)
 * @param message - message
 * @param client - client (for muting)
 * @returns Promise<boolean>
 * @async
 *
 * @desc
 * **I am the desc**\
 * The point is that it checks if the message comes from a bot, if so, it ignores it\
 * Same if Domain sends it (this is mostly so it doesn't have a schizo attack)
 * // is also ignored\
 * If the message is not sent in a tracked channel, it returns instantly\
 * Also mutes for jailbreak attempts
 */
async function checkAuthors(message, client) {
  // check if message is sent into a tracked channel
  if (
    !Object.keys(config.CHANNELS).includes(message.channel.id) &&
    !Object.keys(state.tempChannels).includes(message.channel.id)
  )
    return false;

  // if bot send messsagre = bad
  if (message.author.bot) return false;

  // domain shouldn't reply to himself, bc it makes him look like a schizo
  if (message.author.id === client.user.id) return false;

  // if message start with //, it ignor
  if (message.content.startsWith("//")) return false;

  // don't allow banned users
  try {
    const user = await prisma.user.findUnique({
      where: { id: message.author.id },
    });
    if (user?.banned) {
      return false; // User is banned
    }
  } catch (error) {
    console.error(
      `Error checking ban status for user ${message.author.id}: ${error.message}`,
    );
    return false; // fallback
  }

  // anti-jailbreak thing
  if (
    jailbreaks.some((jailbreak) =>
      message.content.toLowerCase().includes(jailbreak.toLowerCase()),
    )
  ) {
    await message.delete();

    // mute user, bc of trying to use jailbreaks :3
    const userId = message.author.id;
    const time = 1000 * 30 * 60; // 30 minutes

    try {
      const guild = message.guild;
      if (!guild) {
        log(`Message wasn't sent into a guild.`, "warn", "checkAuthors.js");
        return false;
      }

      const member = await guild.members.fetch(userId);
      await member.timeout(time, state.strings.jailbreak - attempt);
    } catch (e) {
      // ignoralhato hiba, anyways megy a false
      log(`Failed to mute user: ${e}`, "warn", "checkAuthors.js");
      return false;
    }
    return false;
  }

  // return true if checks didn't get triggered
  return true;
}

/**
 * Checks if Domain is mentioned
 * @param message - message
 * @param client - client (for id)
 * @returns Promise<boolean>
 * @async
 */
async function checkForMentions(message, client) {
  const channelId = message.channel.id;
  const channelConfig = config.CHANNELS[channelId];
  const generic = {
    shouldRespond: true,
    respondReason: "Bot was mentioned",
    reply: true,
  };

  // check if bot is mentioned
  const mentioned = message.mentions.users.has(client.user.id);
  if (mentioned) return generic;

  // check if user is replying to the bot
  // noinspection JSUnresolvedReference
  const replied =
    message.reference?.messageId &&
    (await message.channel.messages.fetch(message.reference.messageId)).author
      .id === client.user.id;
  if (replied) return generic;

  // noinspection RedundantIfStatementJS
  if (splitFuzzySearch(message.content, config.ALIASES)) return generic;

  // contextual respond thingy
  if (channelConfig?.contextRespond) {
    const history = state.history[channelId] || [];
    const prompt = await makePrompt(channelId, false);
    let response = await shouldRespond(message, client, history, prompt);
    const should = response.shouldRespond;
    if (should === true) return response;
  }

  return {
    shouldRespond: false,
    respondReason: "No mention or context",
    reply: false,
  };
}

module.exports = { checkAuthors, checkForMentions };
