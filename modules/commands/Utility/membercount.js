const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'membercount',
    aliases: ['members', 'mc'],
    category: 'Utility',
    description: 'Display member count and breakdown',
    usage: ',membercount',
    
    async execute(message, args, client) {
        const guild = message.guild;
        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const online = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👥 ${guild.name} Member Count`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Total Members', value: `${totalMembers}`, inline: true },
                { name: 'Humans', value: `${humans}`, inline: true },
                { name: 'Bots', value: `${bots}`, inline: true },
                { name: 'Online', value: `${online}`, inline: true },
                { name: 'Human Ratio', value: `${((humans / totalMembers) * 100).toFixed(1)}%`, inline: true },
                { name: 'Bot Ratio', value: `${((bots / totalMembers) * 100).toFixed(1)}%`, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        return message.reply({ embeds: [embed] });
    }
};
