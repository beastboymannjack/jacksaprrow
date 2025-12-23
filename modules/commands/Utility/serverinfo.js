const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    aliases: ['guildinfo', 'si'],
    category: 'Utility',
    description: 'Display detailed server information',
    usage: ',serverinfo',
    
    async execute(message, args, client) {
        const guild = message.guild;
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 ${guild.name} Information`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Members', value: `${guild.memberCount} members`, inline: true },
                { name: 'Roles', value: `${guild.roles.cache.size} roles`, inline: true },
                { name: 'Channels', value: `${guild.channels.cache.size} channels`, inline: true },
                { name: 'Text Channels', value: `${guild.channels.cache.filter(c => c.isTextBased()).size}`, inline: true },
                { name: 'Voice Channels', value: `${guild.channels.cache.filter(c => c.isVoiceBased()).size}`, inline: true },
                { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
                { name: 'Boost Count', value: `${guild.premiumSubscriptionCount || 0} boosts`, inline: true },
                { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                { name: 'Stickers', value: `${guild.stickers.cache.size}`, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        if (guild.bannerURL({ dynamic: true })) {
            embed.setImage(guild.bannerURL({ dynamic: true, size: 512 }));
        }
        
        return message.reply({ embeds: [embed] });
    }
};
