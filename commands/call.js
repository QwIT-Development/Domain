/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { SlashCommandBuilder } = require('discord.js');
const state = require('../initializers/state');
const {loadConfig} = require('../initializers/configuration');
const config = loadConfig();
const {model} = require('../initializers/geminiClient');

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

            // Check if channel is already in permanent config
            if (Object.keys(config.CHANNELS).includes(channel)) {
                await interaction.editReply('This channel is already permanently tracked by the bot and cannot be managed by this command.');
                return;
            }

            if (state.tempChannels[channel]) {
                // Channel is in tempChannels, so remove it (toggle off)
                delete state.tempChannels[channel];
                delete state.history[channel]; // Also remove its history
                // No need to reset global.geminiModel here, as it's shared and will adapt or be re-init on next message
                await interaction.editReply('The bot will no longer track this channel.');
            } else {
                // Channel is not in tempChannels, so add it (toggle on)
                state.tempChannels[channel] = true;
                state.history[channel] = [];
                // Consider if geminiModel needs re-initialization or if it's handled elsewhere
                // For now, assuming it adapts or is re-initialized as needed when a message comes from a new channel.
                // global.geminiModel = await model(state.history, false); // This might be intensive to do here.
                await interaction.editReply('The bot is now tracking this channel.');
            }
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