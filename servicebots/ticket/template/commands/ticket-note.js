const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-note')
        .setDescription('Manage private staff notes for this ticket')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a private staff note')
                .addStringOption(option =>
                    option
                        .setName('note')
                        .setDescription('The note content')
                        .setRequired(true)
                        .setMaxLength(500)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View all staff notes'))
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
                content: '❌ Only staff members can manage notes.',
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const noteContent = interaction.options.getString('note');
            
            client.database.addStaffNote(
                interaction.guild.id,
                interaction.channel.id,
                interaction.user.id,
                noteContent
            );

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`📝 Staff note added by ${interaction.user}`)
                .addFields({ name: 'Note', value: noteContent })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });

        } else if (subcommand === 'view') {
            const notes = client.database.getStaffNotes(interaction.guild.id, interaction.channel.id);

            if (notes.length === 0) {
                return interaction.reply({
                    content: '📝 No staff notes for this ticket yet.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('📝 Staff Notes')
                .setDescription(`${notes.length} note(s) for this ticket`)
                .setTimestamp();

            notes.forEach((note, index) => {
                const timestamp = new Date(note.timestamp).toLocaleString();
                embed.addFields({
                    name: `Note #${index + 1} - <@${note.staffId}>`,
                    value: `${note.note}\n*${timestamp}*`,
                    inline: false
                });
            });

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
