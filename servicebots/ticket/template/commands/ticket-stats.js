const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-stats')
        .setDescription('View ticket statistics')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('View server-wide ticket statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('staff')
                .setDescription('View staff performance leaderboard'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('personal')
                .setDescription('View your personal ticket statistics')),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'server': {
                const stats = client.database.getTicketStats(interaction.guild.id);
                
                const avgTime = stats.avgCloseTime > 0 ? formatDuration(stats.avgCloseTime) : 'N/A';
                
                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('📊 Server Ticket Statistics')
                    .addFields(
                        { name: '🎫 Open Tickets', value: stats.openTickets.toString(), inline: true },
                        { name: '✅ Closed Today', value: stats.closedToday.toString(), inline: true },
                        { name: '📈 Total Tickets', value: stats.totalTickets.toString(), inline: true },
                        { name: '⏱️ Average Close Time', value: avgTime, inline: true }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'staff': {
                const topStaff = client.database.getTopStaff(interaction.guild.id, 10);
                
                if (topStaff.length === 0) {
                    return interaction.reply({
                        content: '📊 No staff statistics available yet.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const leaderboard = topStaff.map((staff, index) => {
                    const avgTime = staff.ticketsHandled > 0 
                        ? formatDuration(staff.totalResponseTime / staff.ticketsHandled)
                        : 'N/A';
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    return `${medal} <@${staff.userId}> — **${staff.ticketsHandled}** tickets (Avg: ${avgTime})`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('🏆 Top Support Staff')
                    .setDescription(leaderboard)
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'personal': {
                const stats = client.database.getStaffStats(interaction.guild.id, interaction.user.id);
                
                const avgTime = stats.ticketsHandled > 0 
                    ? formatDuration(stats.totalResponseTime / stats.ticketsHandled)
                    : 'N/A';
                
                const lastClosed = stats.lastTicketClosed 
                    ? `<t:${Math.floor(stats.lastTicketClosed / 1000)}:R>`
                    : 'Never';

                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle(`📊 ${interaction.user.username}'s Statistics`)
                    .addFields(
                        { name: '🎫 Tickets Handled', value: stats.ticketsHandled.toString(), inline: true },
                        { name: '⏱️ Average Response Time', value: avgTime, inline: true },
                        { name: '🕐 Last Ticket Closed', value: lastClosed, inline: true }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }
        }
    }
};

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
