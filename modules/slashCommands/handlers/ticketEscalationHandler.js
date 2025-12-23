const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class TicketEscalationSystem {
    constructor(client) {
        this.client = client;
        this.escalations = new Map();
    }

    async createEscalation(ticketId, userId, reason, priority = 'medium') {
        const escalation = {
            ticketId,
            userId,
            reason,
            priority,
            createdAt: Date.now(),
            status: 'pending',
            assignedTo: null,
            notes: []
        };

        this.escalations.set(ticketId, escalation);
        return escalation;
    }

    async escalateTicket(channel, ticketId, reason, priority) {
        const escalation = this.escalations.get(ticketId);
        if (!escalation) return null;

        const priorityColor = {
            low: '#2ECC71',
            medium: '#F39C12',
            high: '#E74C3C',
            critical: '#8B0000'
        };

        const priorityEmoji = {
            low: '📍',
            medium: '⚠️',
            high: '🔴',
            critical: '🚨'
        };

        const embed = new EmbedBuilder()
            .setColor(priorityColor[priority] || '#F39C12')
            .setAuthor({ name: 'Ticket Escalation Notice', iconURL: this.client.user.displayAvatarURL() })
            .setTitle(`${priorityEmoji[priority]} Escalated Ticket #${ticketId}`)
            .addFields(
                { name: 'Priority Level', value: priority.toUpperCase(), inline: true },
                { name: 'Status', value: 'Pending Review', inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Created', value: `<t:${Math.floor(escalation.createdAt / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Escalation ID: ' + ticketId, iconURL: this.client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`escalation_assign_${ticketId}`)
                .setLabel('Assign to Me')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👤'),
            new ButtonBuilder()
                .setCustomId(`escalation_resolve_${ticketId}`)
                .setLabel('Mark Resolved')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`escalation_addnote_${ticketId}`)
                .setLabel('Add Note')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📝')
        );

        await channel.send({ embeds: [embed], components: [row] });
        return escalation;
    }

    async getEscalationStats(guildId) {
        const escalations = Array.from(this.escalations.values());
        
        return {
            total: escalations.length,
            pending: escalations.filter(e => e.status === 'pending').length,
            assigned: escalations.filter(e => e.assignedTo).length,
            resolved: escalations.filter(e => e.status === 'resolved').length,
            byPriority: {
                critical: escalations.filter(e => e.priority === 'critical').length,
                high: escalations.filter(e => e.priority === 'high').length,
                medium: escalations.filter(e => e.priority === 'medium').length,
                low: escalations.filter(e => e.priority === 'low').length
            }
        };
    }

    async createStatsEmbed(client) {
        const stats = await this.getEscalationStats();

        return new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'Ticket Escalation System', iconURL: client.user.displayAvatarURL() })
            .setTitle('📊 Escalation Statistics')
            .addFields(
                { name: 'Total Escalations', value: stats.total.toString(), inline: true },
                { name: 'Pending Review', value: stats.pending.toString(), inline: true },
                { name: 'Assigned', value: stats.assigned.toString(), inline: true },
                { name: '🚨 Critical', value: stats.byPriority.critical.toString(), inline: true },
                { name: '🔴 High', value: stats.byPriority.high.toString(), inline: true },
                { name: '⚠️ Medium', value: stats.byPriority.medium.toString(), inline: true }
            )
            .setFooter({ text: 'Monitor ticket escalations in real-time', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
    }
}

module.exports = TicketEscalationSystem;
