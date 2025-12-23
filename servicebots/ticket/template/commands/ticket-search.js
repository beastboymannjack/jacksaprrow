const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-search')
        .setDescription('Search tickets with filters')
        .addStringOption(option =>
            option
                .setName('keyword')
                .setDescription('Search by keyword in reason/description')
                .setRequired(false))
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Filter by user')
                .setRequired(false))
        .addStringOption(option =>
            option
                .setName('status')
                .setDescription('Filter by status')
                .setRequired(false)
                .addChoices(
                    { name: 'Open', value: 'open' },
                    { name: 'Closed', value: 'closed' }
                ))
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Filter by ticket type ID (use /ticket-category list to see types)')
                .setRequired(false))
        .addStringOption(option =>
            option
                .setName('priority')
                .setDescription('Filter by priority')
                .setRequired(false)
                .addChoices(
                    { name: 'Low', value: 'low' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'High', value: 'high' },
                    { name: 'Urgent', value: 'urgent' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client) {
        const serverConfig = client.database.getServerConfig(interaction.guild.id);
        const isStaff = serverConfig.staffRoles.some(roleId => 
            interaction.member.roles.cache.has(roleId)
        );
        const isBotOwner = interaction.client.application.owner?.id === interaction.user.id ||
                          (interaction.client.application.owner?.ownerId && 
                           interaction.user.id === interaction.client.application.owner.ownerId);
        const isServerOwner = interaction.user.id === interaction.guild.ownerId;

        if (!isStaff && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !isBotOwner && !isServerOwner) {
            return interaction.reply({
                content: '❌ Only staff members can search tickets.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const filters = {
            keyword: interaction.options.getString('keyword'),
            userId: interaction.options.getUser('user')?.id,
            status: interaction.options.getString('status'),
            type: interaction.options.getString('type'),
            priority: interaction.options.getString('priority')
        };

        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        const results = client.database.searchTickets(interaction.guild.id, filters);

        if (results.length === 0) {
            return interaction.editReply({
                content: '🔍 No tickets found matching your search criteria.'
            });
        }

        const customCategories = serverConfig.customCategories || {};
        const allCategories = { ...config.ticketCategories, ...customCategories };

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('🔍 Ticket Search Results')
            .setDescription(`Found ${results.length} ticket(s)`)
            .setTimestamp();

        const displayResults = results.slice(0, 10);
        displayResults.forEach((ticket, index) => {
            const category = allCategories[ticket.type];
            const status = ticket.status === 'open' ? '🟢' : '🔒';
            const priority = ticket.priority ? config.priorityLevels[ticket.priority]?.emoji : '';
            const createdDate = new Date(ticket.createdAt).toLocaleDateString();

            let fieldValue = `${status} **Status:** ${ticket.status}\n`;
            fieldValue += `${category?.emoji || '📋'} **Type:** ${category?.label || ticket.type}\n`;
            if (priority) fieldValue += `${priority} **Priority:** ${ticket.priority}\n`;
            fieldValue += `👤 **User:** <@${ticket.userId}>\n`;
            fieldValue += `📅 **Created:** ${createdDate}\n`;
            fieldValue += `📝 **Reason:** ${ticket.reason?.substring(0, 50) || 'N/A'}`;

            embed.addFields({
                name: `Ticket #${index + 1}`,
                value: fieldValue,
                inline: true
            });
        });

        if (results.length > 10) {
            embed.setFooter({ text: `Showing first 10 of ${results.length} results` });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
