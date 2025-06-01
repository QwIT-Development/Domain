/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const {SlashCommandBuilder} = require('discord.js');
const {reputation} = require('../utils/reputation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reputation')
        .setDescription('Shows you reputation score.'),

    async execute(interaction) {
        const score = await reputation(interaction.user.id);

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