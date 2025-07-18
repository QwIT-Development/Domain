/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { SlashCommandBuilder } = require("discord.js");
const state = require("../initializers/state");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { model } = require("../initializers/openaiClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("call")
    .setDescription(
      "Calls the bot into the channel that will persist until the bot gets a reset.",
    ),

  async execute(interaction) {
    if (config.OWNERS.includes(interaction.user.id)) {
      await interaction.reply({
        content: "Reconfiguring...",
        flags: ["Ephemeral"],
      });

      const channel = interaction.channel.id;

      // Check if channel is already in permanent config
      if (Object.keys(config.CHANNELS).includes(channel)) {
        await interaction.editReply(
          "This channel is configured as a tracked channel. No need to call the bot here.",
        );
        return;
      }

      if (state.tempChannels[channel]) {
        delete state.tempChannels[channel];
        delete state.history[channel];
        await interaction.editReply(
          "The bot will no longer track this channel.",
        );
      } else {
        state.tempChannels[channel] = true;
        state.history[channel] = [];
        global.openaiModel = await model(state.history, false); // reinit model
        await interaction.editReply("The bot is now tracking this channel.");
      }
    } else {
      await interaction.reply({
        content: "You have no permission to use this command.",
        flags: ["Ephemeral"],
      });
    }
  },
};
