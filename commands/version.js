/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const {SlashCommandBuilder} = require('discord.js');
const state = require('../initializers/state');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('version')
        .setDescription('Kiírja a bot verzióját.'),

    async execute(interaction) {
        await interaction.reply({
            content: `Bejegyzett verzió: ${state.version}`,
            flags: [
                "Ephemeral"
            ]
        })
    }
};