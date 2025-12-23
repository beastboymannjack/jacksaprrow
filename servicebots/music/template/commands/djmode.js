const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { GuildSettings } = require('../../database/models');
const emojis = require('../emojis.json');

module.exports = {
    name: 'djmode',
    aliases: ['dj'],
    description: 'Configure DJ vote mode for skip and stop actions',

    async execute(message, args) {
        const { member, guild } = message;
        const action = args[0]?.toLowerCase();

        if (action !== 'settings' && action !== 'status') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator) && 
                !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} Only administrators can configure DJ mode!`);
                return message.reply({ embeds: [embed] });
            }
        }

        let settings = await GuildSettings.findByPk(guild.id);
        if (!settings) {
            settings = await GuildSettings.create({ guildId: guild.id });
        }

        if (!action || action === 'toggle') {
            settings.djModeEnabled = !settings.djModeEnabled;
            await settings.save();
            
            const status = settings.djModeEnabled ? 'enabled' : 'disabled';
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.autoplay} DJ Vote Mode ${status}. ${settings.djModeEnabled ? `Users now need ${settings.skipVoteThreshold}% votes to skip/stop.` : ''}`);
            
            return message.reply({ embeds: [embed] });
        }

        if (action === 'threshold') {
            const percentage = parseInt(args[1]);
            if (isNaN(percentage) || percentage < 1 || percentage > 100) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} Please provide a valid percentage between 1 and 100.`);
                return message.reply({ embeds: [embed] });
            }
            
            settings.skipVoteThreshold = percentage;
            await settings.save();
            
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.autoplay} Vote threshold set to ${percentage}%.`);
            
            return message.reply({ embeds: [embed] });
        }

        if (action === 'settings' || action === 'status') {
            const status = settings.djModeEnabled ? 'Enabled' : 'Disabled';
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`**DJ Mode Settings**\n• Status: ${status}\n• Vote Threshold: ${settings.skipVoteThreshold}%`);
            
            return message.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(0xff6b6b)
            .setDescription(`${emojis.error} Usage: djmode [toggle|threshold <1-100>|settings]`);
        return message.reply({ embeds: [embed] });
    },
};
