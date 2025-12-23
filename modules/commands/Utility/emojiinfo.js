const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'emojiinfo',
    aliases: ['emoji', 'ei'],
    category: 'Utility',
    description: 'Get emoji information and details',
    usage: ',emojiinfo <emoji>',
    
    async execute(message, args, client) {
        if (!args.length) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Please provide an emoji.')
                ]
            });
        }
        
        const emojiRegex = /<a?:(\w+):(\d+)>/;
        const match = args[0].match(emojiRegex);
        
        if (!match) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ That is not a valid custom emoji.')
                ]
            });
        }
        
        const [, name, id] = match;
        const emoji = message.guild.emojis.cache.get(id);
        
        if (!emoji) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Emoji not found in this server.')
                ]
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emoji.animated ? 'Animated' : 'Static'} Emoji Info`)
            .setImage(emoji.url)
            .addFields(
                { name: 'Name', value: emoji.name, inline: true },
                { name: 'ID', value: `\`${emoji.id}\``, inline: true },
                { name: 'Created', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Animated', value: emoji.animated ? 'Yes ✓' : 'No', inline: true },
                { name: 'Managed', value: emoji.managed ? 'Yes ✓' : 'No', inline: true },
                { name: 'Emoji Code', value: `\`${emoji.toString()}\``, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        return message.reply({ embeds: [embed] });
    }
};
