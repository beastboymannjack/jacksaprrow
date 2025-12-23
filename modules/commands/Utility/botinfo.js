const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'botinfo',
    aliases: ['bot', 'info'],
    category: 'Utility',
    description: 'Get comprehensive bot information',
    usage: ',botinfo',
    
    async execute(message, client) {
        const uptime = Math.floor(client.uptime / 1000);
        const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤖 Bot Information')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: 'Bot Name', value: client.user.username, inline: true },
                { name: 'Bot ID', value: `\`${client.user.id}\``, inline: true },
                { name: 'Created', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Uptime', value: uptimeStr, inline: true },
                { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: 'Users', value: `${client.users.cache.size}`, inline: true },
                { name: 'Channels', value: `${client.channels.cache.size}`, inline: true },
                { name: 'Prefix', value: '`,`', inline: true },
                { name: 'Discord.js', value: require('discord.js').version, inline: true },
                { name: 'Node.js', value: process.version, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        return message.reply({ embeds: [embed] });
    }
};
