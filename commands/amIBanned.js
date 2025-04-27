/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const {SlashCommandBuilder} = require('discord.js');
const state = require('../initializers/state');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('am_i_banned')
        .setDescription('Megmutatja, hogy tiltva vagy-e a használtattól'),

    async execute(interaction) {

        const userId = interaction.user.id;
        let banned = false;
        let reason = "";
        /*
        banlist format:
        {
            "userid": "sent brainrot messages like every 2 seconds",
            "userid2": "please stop telling me that I'm an AI"
        }
         */
        if (state.banlist[userId]) {
            banned = true;
            reason = state.banlist[userId];
        }

        if (!banned) {
            await interaction.reply({
                content: `A fiókod használhatja a botot.`,
                flags: [
                    "Ephemeral"
                ]
            })
        } else {
            await interaction.reply({
                content: `A fiókod tiltva van a bot használatától.
Ok: \`${reason}\`
TOS: https://mnus.moe/codex/domain/`,
                flags: [
                    "Ephemeral"
                ]
            })
        }
    }
};