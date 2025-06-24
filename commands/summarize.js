/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/
const { SlashCommandBuilder } = require('discord.js');
const state = require('../initializers/state');
const {loadConfig} = require('../initializers/configuration');

const config = loadConfig();
const state = require('../initializers/state');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('summarize')
        .setDescription('Shows the last summary of the channel.'),

    async execute(interaction) {
        // megegyszer belehaluzol valamit geci copilot autofill es kilesz belezve a csaladod (o1, 3.5 meg a faszomtudja meg milyen szar modellek)
        // ugyhogy huzd meg magad copilot, vagy hivjalak inkabb szargptnek?
        if (!config.OWNERS.includes(interaction.user.id)) {
            return interaction.reply({
                content: state.strings.summarize.unauthorized,
                flags: ["Ephemeral"]
            });
        }

        const channelId = interaction.channel.id;
        const summary = state.summaries[channelId];

        if (!summary) {
            return interaction.reply({
                content: state.strings.summarize.unavailable,
                flags: ["Ephemeral"]
            });
        }

        await interaction.reply({
            content: summary,
            flags: ["Ephemeral"]
        });
    }
};
