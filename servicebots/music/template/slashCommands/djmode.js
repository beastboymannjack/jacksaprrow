const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { GuildSettings } = require('../../database/models');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('djmode')
        .setDescription('Configure DJ vote mode for skip and stop actions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable DJ vote mode'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('threshold')
                .setDescription('Set the vote threshold percentage')
                .addIntegerOption(option =>
                    option.setName('percentage')
                        .setDescription('Percentage of users needed to skip (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Show current DJ mode settings')),

    async execute(interaction) {
        const { member, guild } = interaction;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand !== 'settings') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator) && 
                !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Only administrators can configure DJ mode!`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        let settings = await GuildSettings.findByPk(guild.id);
        if (!settings) {
            settings = await GuildSettings.create({ guildId: guild.id });
        }

        if (subcommand === 'toggle') {
            settings.djModeEnabled = !settings.djModeEnabled;
            await settings.save();
            
            const status = settings.djModeEnabled ? 'enabled' : 'disabled';
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.autoplay} DJ Vote Mode ${status}. ${settings.djModeEnabled ? `Users now need ${settings.skipVoteThreshold}% votes to skip/stop.` : ''}`);
            
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'threshold') {
            const percentage = interaction.options.getInteger('percentage');
            settings.skipVoteThreshold = percentage;
            await settings.save();
            
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.autoplay} Vote threshold set to ${percentage}%.`);
            
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'settings') {
            const status = settings.djModeEnabled ? 'Enabled' : 'Disabled';
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`**DJ Mode Settings**\n• Status: ${status}\n• Vote Threshold: ${settings.skipVoteThreshold}%`);
            
            return interaction.reply({ embeds: [embed] });
        }
    },
};
