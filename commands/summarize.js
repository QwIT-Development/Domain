/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/
const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const state = require("../initializers/state");
const { loadConfig } = require("../initializers/configuration");

const config = loadConfig();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("summarize")
    .setDescription("Shows the last summary of the channel."),

  async execute(interaction) {
    // megegyszer belehaluzol valamit geci copilot autofill es kilesz belezve a csaladod (o1, 3.5 meg a faszomtudja meg milyen szar modellek)
    // ugyhogy huzd meg magad copilot, vagy hivjalak inkabb szargptnek?
    if (!config.OWNERS.includes(interaction.user.id)) {
      return interaction.reply({
        content: state.strings.summarize.unauthorized,
        flags: ["Ephemeral"],
      });
    }

    const channelId = interaction.channel.id;
    const summary = state.summaries[channelId];

    if (!summary) {
      return interaction.reply({
        content: state.strings.summarize.unavailable,
        flags: ["Ephemeral"],
      });
    }

    const summaryFile = new AttachmentBuilder(Buffer.from(summary, "utf-8"), {
      name: "summary.txt",
    });

    await interaction.reply({
      content: state.strings.summarize.attached,
      files: [summaryFile],
      flags: ["Ephemeral"],
    });
  },
};
