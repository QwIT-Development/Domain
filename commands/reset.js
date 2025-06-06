/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { SlashCommandBuilder } = require('discord.js');
const {resetPrompt} = require('../initializers/geminiClient');
const state = require('../initializers/state');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Resets the bot\'s history for the current channel.'),

    async execute(interaction) {
        if (config.OWNERS.includes(interaction.user.id)) {
            await interaction.reply({
                content: 'Resetting history...',
                flags: [
                    "Ephemeral"
                ]
            })
            const channel = interaction.channel.id;

            state.history[channel] = [];
            // add +1 to lobotomization count
            state.resetCounts += 1;

            await interaction.editReply('History reset!');
        } else {
            await interaction.reply({
                content: 'You have no permission to use this command.',
                flags: [
                    "Ephemeral"
                ]
            })
        }
    }
};