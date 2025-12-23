const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-analytics')
        .setDescription('View detailed ticket analytics and reports')
        .addStringOption(option =>
            option
                .setName('period')
                .setDescription('Time period for analytics')
                .setRequired(false)
                .addChoices(
                    { name: 'Last 7 Days', value: '7' },
                    { name: 'Last 30 Days', value: '30' },
                    { name: 'Last 90 Days', value: '90' },
                    { name: 'All Time', value: 'all' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const period = interaction.options.getString('period') || '30';
        const days = period === 'all' ? 36500 : parseInt(period);
        
        const startDate = period === 'all' ? 0 : Date.now() - (days * 24 * 60 * 60 * 1000);
        const endDate = Date.now();

        const tickets = client.database.getTicketsByDateRange(
            interaction.guild.id,
            startDate,
            endDate
        );

        const totalTickets = tickets.length;
        const openTickets = tickets.filter(t => t.status === 'open').length;
        const closedTickets = tickets.filter(t => t.status === 'closed').length;
        const claimedTickets = tickets.filter(t => t.claimed).length;

        const avgCloseTime = closedTickets > 0
            ? tickets
                .filter(t => t.closedAt && t.createdAt)
                .reduce((sum, t) => sum + (t.closedAt - t.createdAt), 0) / closedTickets
            : 0;

        const avgResponseTime = claimedTickets > 0
            ? tickets
                .filter(t => t.claimedAt && t.createdAt)
                .reduce((sum, t) => sum + (t.claimedAt - t.createdAt), 0) / claimedTickets
            : 0;

        const serverConfig = client.database.getServerConfig(interaction.guild.id);
        const customCategories = serverConfig.customCategories || {};
        const allCategories = { ...config.ticketCategories, ...customCategories };
        
        const ticketsByType = {};
        Object.keys(allCategories).forEach(type => {
            ticketsByType[type] = tickets.filter(t => t.type === type).length;
        });

        const ticketsByPriority = {
            low: tickets.filter(t => t.priority === 'low').length,
            medium: tickets.filter(t => t.priority === 'medium').length,
            high: tickets.filter(t => t.priority === 'high').length,
            urgent: tickets.filter(t => t.priority === 'urgent').length
        };

        const ratingStats = client.database.getRatingStats(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📊 Ticket Analytics Dashboard')
            .setDescription(`Report for ${period === 'all' ? 'All Time' : `Last ${days} Days`}`)
            .addFields(
                {
                    name: '📈 Overview',
                    value: 
                        `**Total Tickets:** ${totalTickets}\n` +
                        `**Open:** 🟢 ${openTickets}\n` +
                        `**Closed:** 🔒 ${closedTickets}\n` +
                        `**Claimed:** ✅ ${claimedTickets}`,
                    inline: true
                },
                {
                    name: '⏱️ Response Times',
                    value:
                        `**Avg Response:** ${formatTime(avgResponseTime)}\n` +
                        `**Avg Close Time:** ${formatTime(avgCloseTime)}\n` +
                        `**Resolution Rate:** ${totalTickets > 0 ? ((closedTickets / totalTickets) * 100).toFixed(1) : 0}%`,
                    inline: true
                },
                {
                    name: '⭐ Ratings',
                    value:
                        `**Average:** ${ratingStats.avgRating.toFixed(1)}/5.0\n` +
                        `**Total Reviews:** ${ratingStats.totalRatings}\n` +
                        `**5 ⭐:** ${ratingStats.distribution[5] || 0}\n` +
                        `**4 ⭐:** ${ratingStats.distribution[4] || 0}\n` +
                        `**3 ⭐:** ${ratingStats.distribution[3] || 0}\n` +
                        `**2 ⭐:** ${ratingStats.distribution[2] || 0}\n` +
                        `**1 ⭐:** ${ratingStats.distribution[1] || 0}`,
                    inline: true
                }
            );

        let typeBreakdown = '';
        Object.entries(ticketsByType).forEach(([type, count]) => {
            const category = allCategories[type];
            if (count > 0) {
                typeBreakdown += `${category?.emoji || '📋'} **${category?.label || type}:** ${count} (${((count / totalTickets) * 100).toFixed(1)}%)\n`;
            }
        });

        if (typeBreakdown) {
            embed.addFields({
                name: '📋 Tickets by Category',
                value: typeBreakdown,
                inline: false
            });
        }

        const priorityTotal = Object.values(ticketsByPriority).reduce((a, b) => a + b, 0);
        if (priorityTotal > 0) {
            let priorityBreakdown = '';
            Object.entries(ticketsByPriority).forEach(([priority, count]) => {
                if (count > 0) {
                    const priorityConfig = config.priorityLevels[priority];
                    priorityBreakdown += `${priorityConfig?.emoji || '⚪'} **${priorityConfig?.label || priority}:** ${count} (${((count / priorityTotal) * 100).toFixed(1)}%)\n`;
                }
            });

            embed.addFields({
                name: '🎯 Tickets by Priority',
                value: priorityBreakdown,
                inline: false
            });
        }

        const topStaff = client.database.getTopStaff(interaction.guild.id, 5);
        if (topStaff.length > 0) {
            let staffBreakdown = '';
            topStaff.forEach((staff, index) => {
                const avgTime = staff.ticketsHandled > 0 
                    ? staff.totalResponseTime / staff.ticketsHandled 
                    : 0;
                staffBreakdown += `**${index + 1}.** <@${staff.userId}> - ${staff.ticketsHandled} tickets (Avg: ${formatTime(avgTime)})\n`;
            });

            embed.addFields({
                name: '👔 Top Staff Members',
                value: staffBreakdown,
                inline: false
            });
        }

        embed.setFooter({ text: `Generated on ${new Date().toLocaleDateString()}` });
        embed.setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else {
        return `${minutes}m`;
    }
}
