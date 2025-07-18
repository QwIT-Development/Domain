/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { SlashCommandBuilder } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const state = require("../initializers/state");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("am_i_banned")
    .setDescription("Shows if you are banned from using the bot."),

  async execute(interaction) {
    const userId = interaction.user.id;
    let banned = false;
    let reason = "";

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.banned) {
        banned = true;
        reason = user.banMessage || "";
      }
    } catch (error) {
      await interaction.reply({
        content: state.strings.amIBanned.couldntCheck,
        flags: ["Ephemeral"],
      });
      // "Handle this exception or don't catch it at all."
      // editor's choice was: ignore it
      // javascript forced editor: log it
      console.error(
        `Error checking ban status for user ${userId}: ${error.message}`,
      );
      return;
    }

    if (!banned) {
      await interaction.reply({
        content: state.strings.amIBanned.canUse,
        flags: ["Ephemeral"],
      });
    } else {
      await interaction.reply({
        content: state.strings.amIBanned.banned
          .replace("{REASON}", reason)
          .replace("{TOS}", config.TOS_URL),
        flags: ["Ephemeral"],
      });
    }
  },
};
