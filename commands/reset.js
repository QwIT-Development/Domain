/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const { SlashCommandBuilder } = require('discord.js');
const {resetPrompt} = require('../initializers/geminiClient');
const state = require('../initializers/state');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Alaphelyzetbe állítja a bot előzményeit.'),

    async execute(interaction) {
        if (config.OWNERS.includes(interaction.user.id)) {
            await interaction.reply({
                content: 'Alaphelyzetbe állítás...',
                flags: [
                    "Ephemeral"
                ]
            })
            const channel = interaction.channel.id;

            state.history[channel] = [];
            global.geminiSession = resetPrompt(global.geminiModel, state.history, channel);
            // add +1 to lobotomization count
            state.resetCounts += 1;

            await interaction.editReply('Alaphelyzetbe állítva!');
        } else {
            await interaction.reply({
                content: 'Nincs jogod használni ezt a parancsot!',
                flags: [
                    "Ephemeral"
                ]
            })
        }
    }
};