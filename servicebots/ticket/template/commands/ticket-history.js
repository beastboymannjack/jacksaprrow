const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-history')
        .setDescription('View your ticket history'),
    
    async execute(interaction, client) {
        const history = client.database.getUserTicketHistory(
            interaction.guild.id, 
            interaction.user.id, 
            10
        );

        if (history.length === 0) {
            return interaction.reply({
                content: '📋 You have no ticket history.',
                flags: MessageFlags.Ephemeral
            });
        }

        const serverConfig = client.database.getServerConfig(interaction.guild.id);
        const customCategories = serverConfig.customCategories || {};
        const allCategories = { ...config.ticketCategories, ...customCategories };

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📋 Your Ticket History')
            .setDescription(`Showing your last ${history.length} ticket(s)`)
            .setFooter({ text: `Total tickets created: ${history.length}` })
            .setTimestamp();

        history.forEach((ticket, index) => {
            const status = ticket.status === 'open' ? '🟢 Open' : '🔒 Closed';
            const category = allCategories[ticket.type];
            const createdDate = new Date(ticket.createdAt).toLocaleDateString();
            
            let fieldValue = `**Status:** ${status}\n`;
            fieldValue += `**Type:** ${category?.emoji || '📋'} ${category?.label || ticket.type}\n`;
            fieldValue += `**Created:** ${createdDate}\n`;
            fieldValue += `**Reason:** ${ticket.reason || 'N/A'}`;
            
            if (ticket.closedAt) {
                const closedDate = new Date(ticket.closedAt).toLocaleDateString();
                fieldValue += `\n**Closed:** ${closedDate}`;
            }

            embed.addFields({
                name: `Ticket #${index + 1}`,
                value: fieldValue,
                inline: false
            });
        });

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
};
