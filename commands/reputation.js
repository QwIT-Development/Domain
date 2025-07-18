/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { SlashCommandBuilder } = require("discord.js");
const { reputation } = require("../db/reputation");
const state = require("../initializers/state");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reputation")
    .setDescription("Shows you reputation score."),

  async execute(interaction) {
    let score = await reputation(interaction.user.id);
    score = Number(score);
    if (isNaN(score)) {
      await interaction.reply({
        content: state.strings.reputation.couldntFetch,
        flags: ["Ephemeral"],
      });
      console.error(
        `Error fetching reputation score for user ${interaction.user.id} (NaN)`,
      );
      return;
    }

    let content = state.strings.reputation.score.replace(
      "{SCORE}",
      score.toString(),
    );
    if (user.decayed) {
      content += state.strings.reputation.decayed + "\n";
    }
    if (score < 0) {
      content += state.strings.reputation.youNeed0.replace(
        "{SCORE}",
        Math.abs(score).toString(),
      );
    }
    content += state.strings.reputation.percent100.replace(
      "{SCORE}",
      (1000 - score).toString(),
    );
    content += state.strings.reputation.currentPercent.replace(
      "{SCORE}",
      Math.floor((score / 1000) * 100).toString(),
    );

    await interaction.reply({
      content: content,
      flags: ["Ephemeral"],
    });
  },
};
