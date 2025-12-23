const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-remove')
        .setDescription('Remove a user from the current ticket')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to remove')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const ticket = client.database.getTicket(interaction.guild.id, interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This command can only be used in a ticket channel.',
                flags: MessageFlags.Ephemeral
            });
        }

        const serverConfig = client.database.getServerConfig(interaction.guild.id);
        const hasStaffRole = serverConfig.staffRoles.some(roleId => 
            interaction.member.roles.cache.has(roleId)
        );
        const isBotOwner = interaction.client.application.owner?.id === interaction.user.id ||
                          (interaction.client.application.owner?.ownerId && 
                           interaction.user.id === interaction.client.application.owner.ownerId);
        const isServerOwner = interaction.user.id === interaction.guild.ownerId;

        if (!hasStaffRole && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !isBotOwner && !isServerOwner) {
            return interaction.reply({
                content: '❌ You need to be a staff member to remove users from tickets.',
                flags: MessageFlags.Ephemeral
            });
        }

        const user = interaction.options.getUser('user');
        
        if (user.id === ticket.userId) {
            return interaction.reply({
                content: '❌ You cannot remove the ticket creator.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.channel.permissionOverwrites.delete(user);

            await interaction.reply({
                content: `✅ Removed ${user} from this ticket.`
            });
        } catch (error) {
            console.error('Error removing user from ticket:', error);
            await interaction.reply({
                content: '❌ Failed to remove user from ticket.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
