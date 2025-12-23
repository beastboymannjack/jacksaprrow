const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'permissions',
    aliases: ['perms', 'userperms'],
    category: 'Utility',
    description: 'Check user permissions in the server',
    usage: ',permissions [@user]',
    
    async execute(message, args, client) {
        const user = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ User not found in this server.')
                ]
            });
        }
        
        const perms = member.permissions.toArray();
        const permChunks = [];
        
        for (let i = 0; i < perms.length; i += 10) {
            permChunks.push(perms.slice(i, i + 10).join('\n'));
        }
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🔐 ${member.user.username}'s Permissions`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: 'Permission Count', value: `${perms.length}`, inline: true },
                { name: 'Administrator', value: member.permissions.has('Administrator') ? '✓ Yes' : '✗ No', inline: true }
            );
        
        if (permChunks.length > 0) {
            permChunks.forEach((chunk, idx) => {
                embed.addFields(
                    { name: `Permissions ${idx + 1}`, value: chunk || 'None', inline: false }
                );
            });
        }
        
        embed.setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        return message.reply({ embeds: [embed] });
    }
};
