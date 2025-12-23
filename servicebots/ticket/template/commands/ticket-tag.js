const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-tag')
        .setDescription('Manage ticket tags')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a tag to this ticket')
                .addStringOption(option =>
                    option
                        .setName('tag')
                        .setDescription('Tag name')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Bug', value: 'bug' },
                            { name: 'Feature Request', value: 'feature' },
                            { name: 'Billing', value: 'billing' },
                            { name: 'Account', value: 'account' },
                            { name: 'Technical', value: 'technical' },
                            { name: 'Urgent', value: 'urgent' },
                            { name: 'Resolved', value: 'resolved' },
                            { name: 'Escalated', value: 'escalated' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a tag from this ticket')
                .addStringOption(option =>
                    option
                        .setName('tag')
                        .setDescription('Tag name')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Bug', value: 'bug' },
                            { name: 'Feature Request', value: 'feature' },
                            { name: 'Billing', value: 'billing' },
                            { name: 'Account', value: 'account' },
                            { name: 'Technical', value: 'technical' },
                            { name: 'Urgent', value: 'urgent' },
                            { name: 'Resolved', value: 'resolved' },
                            { name: 'Escalated', value: 'escalated' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View all tags for this ticket'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client) {
        const ticket = client.database.getTicket(interaction.guild.id, interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This command can only be used in ticket channels.',
                flags: MessageFlags.Ephemeral
            });
        }

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
                content: '❌ Only staff members can manage tags.',
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const tagName = interaction.options.getString('tag');

        if (subcommand === 'add') {
            const tags = client.database.addTag(
                interaction.guild.id,
                interaction.channel.id,
                tagName
            );

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`🏷️ Tag **${tagName}** added to ticket`)
                .addFields({
                    name: 'Current Tags',
                    value: tags.length > 0 ? tags.map(t => `\`${t}\``).join(', ') : 'None'
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } else if (subcommand === 'remove') {
            const tags = client.database.removeTag(
                interaction.guild.id,
                interaction.channel.id,
                tagName
            );

            const embed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setDescription(`🏷️ Tag **${tagName}** removed from ticket`)
                .addFields({
                    name: 'Current Tags',
                    value: tags.length > 0 ? tags.map(t => `\`${t}\``).join(', ') : 'None'
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } else if (subcommand === 'view') {
            const tags = client.database.getTags(interaction.guild.id, interaction.channel.id);

            const embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('🏷️ Ticket Tags')
                .setDescription(tags.length > 0 ? tags.map(t => `\`${t}\``).join(', ') : 'No tags added yet')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }
};
