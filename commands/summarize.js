/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/
const { SlashCommandBuilder } = require('discord.js');
const state = require('../initializers/state');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('summarize')
        .setDescription('Shows the last summary of the channel.'),

    async execute(interaction) {
        if (!config.ADMIN_USERS.includes(interaction.user.id)) {
            return interaction.reply({
                content: 'You are not authorized to use this command.',
                ephemeral: true
            });
        }

        const channelId = interaction.channel.id;
        const summary = state.summaries[channelId];

        if (!summary) {
            return interaction.reply({
                content: 'No summary available for this channel at the moment.',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: summary,
            ephemeral: true
        });
    }
};
