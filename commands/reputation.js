/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const {SlashCommandBuilder} = require('discord.js');
const {reputation} = require('../utils/reputation');
const {log} = require('../utils/betterLogs');
const strings = require('../data/strings.json');
const { StringSchemaSchema } = require('@modelcontextprotocol/sdk/types.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reputation')
        .setDescription('Shows you reputation score.'),

    async execute(interaction) {
        let score = await reputation(interaction.user.id);
        score = Number(score);
        if (isNaN(score)) {
            await interaction.reply({
                content: strings.reputation.couldntFetch,
                flags: ["Ephemeral"]
            });
            console.error(`Error fetching reputation score for user ${interaction.user.id} (NaN)`);
            return;
        }

        let content = strings.reputation.score.replace("{SCORE}", score.toString());
        if (score < 0) {
            content += strings.reputation.youNeed0.replace("{SCORE}", Math.abs(score).toString());
        }
        content += strings.reputation.percent100.replace("{SCORE}", (1000 - score).toString());
        content += strings.reputation.currentPercent.replace("{SCORE}", Math.floor((score / 1000) * 100).toString());

        await interaction.reply({
            content: content,
            flags: [
                "Ephemeral"
            ]
        })
    }
};