const { EmbedBuilder } = require('discord.js');
const { extractInviteCodes, fetchServerFromInvite } = require('../../utils/inviteServerFetcher');

module.exports = {
    name: 'serverid',
    aliases: ['guildid', 'inviteinfo'],
    category: 'Utility',
    description: 'Extract server ID from Discord invite link',
    usage: ',serverid <invite_link>',
    
    async execute(message, args, client) {
        if (!args.length) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Please provide an invite link.\nUsage: `,serverid <discord.gg/invite>`')
                ]
            });
        }
        
        const text = args.join(' ');
        const codes = extractInviteCodes(text);
        
        if (codes.length === 0) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ No valid Discord invite links found in your message.')
                ]
            });
        }
        
        const results = [];
        for (const code of codes) {
            const result = await fetchServerFromInvite(client, code);
            if (result.success) {
                results.push(result);
            }
        }
        
        if (results.length === 0) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Could not fetch server information from the invite(s).')
                ]
            });
        }
        
        const embeds = results.map((result, index) => {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📍 Server ${index + 1}`)
                .addFields(
                    { name: 'Server Name', value: result.guildName, inline: false },
                    { name: 'Server ID', value: `\`${result.guildId}\``, inline: true },
                    { name: 'Invite Code', value: `\`${result.inviteCode}\``, inline: true },
                    { name: 'Members', value: result.memberCount.toString(), inline: true },
                    { name: 'Inviter', value: result.inviterUsername || 'Unknown', inline: true }
                );
            
            if (result.guildIcon) {
                embed.setThumbnail(result.guildIcon);
            }
            
            return embed;
        });
        
        embeds[embeds.length - 1].setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        return message.reply({ embeds });
    }
};
