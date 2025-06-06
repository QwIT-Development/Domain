/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const {SlashCommandBuilder} = require('discord.js');
const state = require('../initializers/state');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('version')
        .setDescription('Shows the current version of the instance.'),

    async execute(interaction) {
        await interaction.reply({
            content: `Version in package.json: ${state.version}`,
            flags: [
                "Ephemeral"
            ]
        })
    }
};