const { EmbedBuilder } = require('discord.js');
const inviteTracking = require('../../inviteTracking');
const mainconfig = require('../../../mainconfig');

module.exports = {
    name: "botexpiration",
    aliases: ["exptime", "expiration", "timeremaining"],
    category: "Information",
    description: "Check bot hosting expiration time",
    usage: ",botexpiration <botname>",
    run: async (client, message, args, cmduser, text, prefix) => {
        if (!args[0]) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(`Usage: \`${prefix}botexpiration <botname>\``)
            ]});
        }

        const botName = args[0].toLowerCase();
        
        // Try to get from invite tracking system first (new system)
        const botExpiration = inviteTracking.getBotExpiration(botName);
        
        if (botExpiration) {
            const now = Date.now();
            const remaining = botExpiration.expiresAt - now;
            const isExpired = remaining <= 0;

            if (isExpired) {
                const expiredEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🔴 Bot Hosting Expired')
                    .setDescription(`Your bot **${botName}** hosting has expired!`)
                    .addFields(
                        { name: 'Status', value: '❌ Expired', inline: true },
                        { name: 'Expired On', value: `<t:${Math.floor(botExpiration.expiresAt / 1000)}:F>`, inline: true },
                        { name: 'Renewal', value: `Use \`${prefix}renew ${botName}\` to extend for 7 more days` }
                    );
                return message.reply({ embeds: [expiredEmbed] });
            }

            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
            const requiredInvites = mainconfig.InviteRequirements.RequiredInvites || 5;

            const activeEmbed = new EmbedBuilder()
                .setColor(days > 3 ? 0x00FF00 : 0xFFAA00)
                .setTitle('⏰ Bot Hosting Status')
                .setDescription(`Your bot **${botName}** is active!`)
                .addFields(
                    { name: 'Remaining Time', value: `${days}d ${hours}h`, inline: true },
                    { name: 'Expires On', value: `<t:${Math.floor(botExpiration.expiresAt / 1000)}:R>`, inline: true },
                    { name: 'Payment Method', value: 'Server Invites', inline: true },
                    { name: 'Renewal Info', value: `Renew with ${requiredInvites} new invites (users cannot be reinvited)`, inline: false }
                );

            if (days <= 3) {
                activeEmbed.addFields({
                    name: '⚠️ Warning',
                    value: `Your hosting expires soon! Use \`${prefix}renew ${botName}\` to extend.`
                });
            }

            return message.reply({ embeds: [activeEmbed] });
        }

        // Fallback to old system for legacy bots
        let botFound = false;
        let botData = null;

        client.bots.forEach((data, id) => {
            if (id.toLowerCase() === botName || (data.name && data.name.toLowerCase() === botName)) {
                botFound = true;
                botData = data;
            }
        });

        if (!botFound) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(`Bot \`${botName}\` not found`)
            ]});
        }

        if (!botData.expirationDate) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor(0xFFAA00)
                    .setTitle('Bot Status')
                    .addFields({ name: 'Bot Name', value: `\`${botName}\``, inline: true })
                    .setDescription('This bot has **no expiration date** set')
            ]});
        }

        const expirationTime = new Date(botData.expirationDate).getTime();
        const now = Date.now();
        const remaining = expirationTime - now;
        const isExpired = remaining <= 0;

        if (isExpired) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Bot Expired')
                    .addFields(
                        { name: 'Bot Name', value: `\`${botName}\``, inline: true },
                        { name: 'Expired On', value: `<t:${Math.floor(expirationTime / 1000)}:F>`, inline: false }
                    )
                    .setDescription('This bot has expired and cannot be started.')
            ]});
        }

        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remaining / 1000 / 60) % 60);

        const embed = new EmbedBuilder()
            .setColor(days > 7 ? 0x00FF00 : days > 3 ? 0xFFAA00 : 0xFF0000)
            .setTitle('Bot Expiration Status')
            .addFields(
                { name: 'Bot Name', value: `\`${botName}\``, inline: true },
                { name: 'Status', value: days > 0 ? 'Active' : 'Expiring Soon', inline: true },
                { name: 'Expires On', value: `<t:${Math.floor(expirationTime / 1000)}:F>`, inline: false },
                { name: 'Time Remaining', value: `<t:${Math.floor(expirationTime / 1000)}:R>`, inline: false },
                { name: 'Countdown', value: `${days}d ${hours}h ${minutes}m`, inline: true }
            );

        if (botData.expirationSetBy) {
            embed.setFooter({ text: `Expiration set by user ${botData.expirationSetBy}` });
        }

        return message.reply({ embeds: [embed] });
    }
};
