/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { SlashCommandBuilder } = require('discord.js');
const state = require('../initializers/state');
const {loadConfig} = require('../initializers/configuration');
const config = loadConfig();
const {model} = require('./initializers/geminiClient');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('call')
        .setDescription('Calls the bot into the channel that will persist until the bot gets a reset.'),

    async execute(interaction) {
        if (config.OWNERS.includes(interaction.user.id)) {
            await interaction.reply({
                content: 'Reconfiguring...',
                flags: [
                    "Ephemeral"
                ]
            });

            const channel = interaction.channel.id;

            if (state.tempChannels[channel]) {
                await interaction.editReply('This channel is already tracked by the bot.');
                return;
            }

            state.tempChannels[channel] = true;
            state.history[channel] = [];
            global.geminiModel = await model(state.history, false);

            await interaction.editReply('The bot is now tracking this channel.');
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