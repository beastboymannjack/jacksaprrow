const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: "channelinfo",
    description: "Get information about a channel",
    usage: "channelinfo [#channel]",
    aliases: ["cinfo"],

    run: async (client, message, args) => {
        const channel = message.mentions.channels.first() || message.channel;

        const createdAt = Math.floor(channel.createdTimestamp / 1000);
        const channelType = channel.type === ChannelType.GuildText ? 'Text' : 
                           channel.type === ChannelType.GuildVoice ? 'Voice' :
                           channel.type === ChannelType.GuildCategory ? 'Category' :
                           channel.type === ChannelType.GuildForum ? 'Forum' : 'Unknown';

        let description = `**Channel:** ${channel.toString()}\n`;
        description += `**Type:** ${channelType}\n`;

        if (channel.topic) {
            description += `**Topic:** ${channel.topic}\n`;
        }

        if (channel.parent) {
            description += `**Category:** ${channel.parent.name}\n`;
        }

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle(`📍 ${channel.name}`)
            .setDescription(description)
            .addFields(
                { name: "🆔 Channel ID", value: `\`${channel.id}\``, inline: true },
                { name: "📅 Created", value: `<t:${createdAt}:d>`, inline: true },
                { name: "👥 Position", value: channel.position.toString(), inline: true }
            );

        if (channel.type === ChannelType.GuildText) {
            embed.addFields(
                { name: "🔒 NSFW", value: channel.nsfw ? 'Yes' : 'No', inline: true },
                { name: "⏱️ Slowmode", value: channel.rateLimitPerUser > 0 ? `${channel.rateLimitPerUser}s` : 'None', inline: true }
            );
        }

        if (channel.type === ChannelType.GuildVoice) {
            embed.addFields(
                { name: "🎤 Bitrate", value: `${channel.bitrate / 1000}kbps`, inline: true },
                { name: "👥 User Limit", value: channel.userLimit || 'Unlimited', inline: true }
            );
        }

        embed.setFooter({ text: "Channel Info" })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
