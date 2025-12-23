const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    category: 'Utility',
    description: 'View user avatar in high quality',
    usage: ',avatar [@user]',
    
    async execute(message, args, client) {
        const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;
        const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${user.username}'s Avatar`)
            .setImage(avatarUrl)
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Download (512x)')
                .setStyle(ButtonStyle.Link)
                .setURL(user.displayAvatarURL({ dynamic: true, size: 512 })),
            new ButtonBuilder()
                .setLabel('Download (1024x)')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarUrl)
        );
        
        return message.reply({ embeds: [embed], components: [buttons] });
    }
};
