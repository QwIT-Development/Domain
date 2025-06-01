/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const {SlashCommandBuilder} = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('am_i_banned')
        .setDescription('Megmutatja, hogy tiltva vagy-e a használtattól'),

    async execute(interaction) {
        const userId = interaction.user.id;
        let banned = false;
        let reason = "";

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (user && user.banned) {
                banned = true;
                reason = user.banMessage || "";
            }
        } catch (error) {
            await interaction.reply({
                content: "Hiba történt a tiltási állapot lekérdezése közben.",
                flags: ["Ephemeral"]
            });
            return;
        }

        if (!banned) {
            await interaction.reply({
                content: `A fiókod használhatja a botot.`,
                flags: [
                    "Ephemeral"
                ]
            });
        } else {
            await interaction.reply({
                content: `A fiókod tiltva van a bot használatától.
Ok: \`${reason}\`
TOS: https://mnus.moe/codex/domain/`,
                flags: [
                    "Ephemeral"
                ]
            });
        }
    }
};