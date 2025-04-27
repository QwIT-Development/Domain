/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const {SlashCommandBuilder} = require('discord.js');
const {reputation} = require('../utils/reputation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reputation')
        .setDescription('Kiírja a reputáció pontjaid.'),

    async execute(interaction) {
        const score = await reputation(interaction.user.id);

        let content = `Reputációs pontjaid: ${score.toString()}\n`;
        if (score < 0) {
            content += `Az egészséges pontszám eléréséhez még kell ${Math.abs(score).toString()} pont!\n`;
        }
        content += `A 100%-oláshoz még kell ${(1000 - score).toString()} pont!\n`;
        content += `Jelenlegi állásod: ${Math.floor((score / 1000) * 100).toString()}%`;

        await interaction.reply({
            content: content,
            flags: [
                "Ephemeral"
            ]
        })
    }
};