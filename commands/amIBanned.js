/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const {SlashCommandBuilder} = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('am_i_banned')
        .setDescription('Shows if you are banned from using the bot.'),

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
                content: "Couldn't check your status. Please try again later.",
                flags: ["Ephemeral"]
            });
            return;
        }

        if (!banned) {
            await interaction.reply({
                content: `Your account can use the bot.`,
                flags: [
                    "Ephemeral"
                ]
            });
        } else {
            await interaction.reply({
                content: `Your account is banned from using the bot.
Reason: \`${reason}\`
TOS: https://mnus.moe/codex/domain/`,
                flags: [
                    "Ephemeral"
                ]
            });
        }
    }
};