/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { SlashCommandBuilder } = require('discord.js');
const { loadConfig } = require('../initializers/configuration');
const config = loadConfig();
const state = require('../initializers/state');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('a few debug functions')
        .addStringOption(option =>
            option.setName('subcommand')
                .setDescription('The subcommand to execute')
                .setRequired(true)
                .addChoices(
                    { name: 'show servers', value: 'show_servers' },
                    { name: 'show history count for channel', value: 'channel_history_count' }
                )
        ),

    async execute(interaction) {
        // csak nekem van jogom hasznalni, nyugi nem leakel semmi infot amit nem kene
        if (interaction.user.id !== '710839743222513715') {
            await interaction.reply({
                content: 'You are not allowed to use this command.',
                flags: ['Ephemeral']
            });
            return;
        }

        const subcommand = interaction.options.getString('subcommand');

        if (subcommand === 'show_servers') {
            let response = "The server the bot present in:\n";
            global.discordClient.guilds.cache.forEach(guild => {
                const channels = guild.channels.cache.map(channel => channel.id);
                let configChannelIds = Object.keys(config.CHANNELS);
                const guildShouldBeLeft = !channels.some(channelId => configChannelIds.includes(channelId));

                response += `${guild.name} (${guild.id}) - ${guildShouldBeLeft ? "Unknown guild" : "Known guild"}.\n`;
            });
            response += `-# This information might not be up to date.`;
            await interaction.reply({
                content: response,
                flags: ['Ephemeral']
            });
        }

        if (subcommand === 'channel_history_count') {
            const channel = interaction.channel.id;
            const historyCount = state.history[channel].length || 0;
            const allHistory = [];
            for (const channel in state.history) {
                allHistory.push({
                    channelId: channel,
                    count: state.history[channel].length || 0
                });
            }
            await interaction.reply({
                content: `This channel has ${historyCount} messages in history.
History count for all channels:\n${allHistory.map(item => `${item.channelId}: ${item.count}`).join('\n')}`,
                flags: ['Ephemeral']
            });
            return;
        }
    }

};