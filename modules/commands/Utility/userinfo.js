const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'userinfo',
    aliases: ['whois', 'ui', 'user'],
    category: 'Utility',
    description: 'Get comprehensive user information',
    usage: ',userinfo [@user]',
    
    async execute(message, args, client) {
        const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;
        const member = message.guild.members.cache.get(user.id) || await message.guild.members.fetch(user.id).catch(() => null);
        
        const badges = user.flags?.toArray() || [];
        const badgesText = badges.length > 0 ? badges.join(', ') : 'None';
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${user.username}'s Information`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'User ID', value: `\`${user.id}\``, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Bot Account', value: user.bot ? 'Yes ✓' : 'No', inline: true },
                { name: 'Nitro', value: user.nitro ? `Tier ${user.nitro}` : 'None', inline: true },
                { name: 'Status', value: member?.presence?.status?.toUpperCase() || 'OFFLINE', inline: true },
                { name: 'Badges', value: badgesText || 'None', inline: false }
            );
        
        if (member) {
            embed.addFields(
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Roles', value: member.roles.cache.size > 1 ? member.roles.cache.map(r => r.name).filter(n => n !== '@everyone').join(', ') || 'None' : 'None', inline: false }
            );
        }
        
        embed.setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        return message.reply({ embeds: [embed] });
    }
};
