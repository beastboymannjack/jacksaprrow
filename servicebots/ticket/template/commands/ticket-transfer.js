const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-transfer')
        .setDescription('Transfer ticket to another staff member')
        .addUserOption(option =>
            option
                .setName('staff')
                .setDescription('Staff member to transfer to')
                .setRequired(true))
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
                content: '❌ Only staff members can transfer tickets.',
                flags: MessageFlags.Ephemeral
            });
        }

        const targetStaff = interaction.options.getUser('staff');
        const targetMember = await interaction.guild.members.fetch(targetStaff.id);

        const isTargetStaff = serverConfig.staffRoles.some(roleId => 
            targetMember.roles.cache.has(roleId)
        );

        if (!isTargetStaff) {
            return interaction.reply({
                content: '❌ The target user must be a staff member.',
                flags: MessageFlags.Ephemeral
            });
        }

        client.database.updateTicket(interaction.guild.id, interaction.channel.id, {
            claimed: targetStaff.id,
            claimedAt: Date.now(),
            transferredBy: interaction.user.id,
            transferredAt: Date.now()
        });

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('🔄 Ticket Transferred')
            .setDescription(
                `**From:** ${interaction.user}\n` +
                `**To:** ${targetStaff}\n` +
                `**Time:** <t:${Math.floor(Date.now() / 1000)}:R>`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        if (serverConfig.staffAlertsEnabled) {
            try {
                const customCategories = serverConfig.customCategories || {};
                const allCategories = { ...config.ticketCategories, ...customCategories };
                
                await targetStaff.send({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.info)
                        .setTitle('🎫 Ticket Transferred to You')
                        .setDescription(
                            `You have been assigned a ticket in **${interaction.guild.name}**\n\n` +
                            `**Ticket:** ${interaction.channel}\n` +
                            `**Transferred by:** ${interaction.user.tag}\n` +
                            `**Type:** ${allCategories[ticket.type]?.label || ticket.type}`
                        )
                        .setTimestamp()]
                });
            } catch (error) {
                console.log('Could not DM staff member');
            }
        }
    }
};
