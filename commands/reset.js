/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const { SlashCommandBuilder } = require('discord.js');
const {promptLoader, model} = require('../initializers/geminiClient');
const state = require('../initializers/state');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Alaphelyzetbe állítja a bot előzményeit.'),

    async execute(interaction) {
        if (global.OWNERS.includes(interaction.user.id)) {
            await interaction.reply({
                content: 'Alaphelyzetbe állítás...',
                ephemeral: true
            })

            const geminiModel = await model();
            state.history = [];
            global.geminiSession = promptLoader(geminiModel, state.history);
            // add +1 to lobotomization count
            state.resetCounts += 1;

            await interaction.editReply('Kész!');
        } else {
            await interaction.reply({
                content: 'Nincs jogod használni ezt a parancsot!',
                ephemeral: true
            })
        }
    }
};