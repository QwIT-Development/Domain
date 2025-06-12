/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const {SlashCommandBuilder} = require('discord.js');
const {reputation} = require('../utils/reputation');
const {log} = require('../utils/betterLogs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reputation')
        .setDescription('Shows you reputation score.'),

    async execute(interaction) {
        let score = await reputation(interaction.user.id);
        score = Number(score);
        if (isNaN(score)) {
            await interaction.reply({
                content: "Couldn't fetch your reputation score. Please try again later.",
                flags: ["Ephemeral"]
            });
            console.error(`Error fetching reputation score for user ${interaction.user.id} (NaN)`);
            return;
        }

        let content = `Reputation score: ${score.toString()}\n`;
        if (score < 0) {
            content += `You need ${Math.abs(score).toString()} more points for a healthy score!\n`;
        }
        content += `You need ${(1000 - score).toString()} points until you 100% the bot.\n`;
        content += `Current completion: ${Math.floor((score / 1000) * 100).toString()}%`;

        await interaction.reply({
            content: content,
            flags: [
                "Ephemeral"
            ]
        })
    }
};