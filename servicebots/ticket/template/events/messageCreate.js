const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;
        
        const ticket = client.database.getTicket(message.guild.id, message.channel.id);
        if (!ticket || ticket.status !== 'open') return;

        const serverConfig = client.database.getServerConfig(message.guild.id);
        
        if (!serverConfig.staffAlertsEnabled || !ticket.claimed) return;

        if (message.author.id === ticket.userId) {
            try {
                const staffMember = await client.users.fetch(ticket.claimed);
                
                const alertEmbed = new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setTitle('💬 New Reply in Your Claimed Ticket')
                    .setDescription(
                        `**Server:** ${message.guild.name}\n` +
                        `**Ticket:** ${message.channel.name}\n` +
                        `**User:** ${message.author.tag}\n\n` +
                        `**Message:**\n${message.content.substring(0, 500)}${message.content.length > 500 ? '...' : ''}`
                    )
                    .addFields({
                        name: 'Quick Actions',
                        value: `[Jump to Message](${message.url})`
                    })
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp();

                if (message.attachments.size > 0) {
                    alertEmbed.addFields({
                        name: '📎 Attachments',
                        value: `${message.attachments.size} file(s) attached`
                    });
                }

                await staffMember.send({ embeds: [alertEmbed] });
            } catch (error) {
                console.log('Could not send DM alert to staff member:', error.message);
            }
        }
    }
};
