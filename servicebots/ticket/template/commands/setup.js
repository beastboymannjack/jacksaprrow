const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const database = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure ticket bot settings (CATEGORY_ID, LOG_CHANNEL_ID, SUPPORT_ROLE_ID)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('category')
                .setDescription('Ticket category channel')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName('log_channel')
                .setDescription('Log channel for ticket actions')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName('support_role')
                .setDescription('Support staff role')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const categoryChannel = interaction.options.getChannel('category');
        const logChannel = interaction.options.getChannel('log_channel');
        const supportRole = interaction.options.getRole('support_role');
        
        try {
            // Save bot configuration
            const config = database.getServerConfig(interaction.guildId);
            config.categoryId = categoryChannel.id;
            config.logChannelId = logChannel.id;
            config.supportRoleId = supportRole.id;
            
            database.updateServerConfig(interaction.guildId, config);
            
            // Track bot invite
            database.trackBotInvite(interaction.guildId, {
                categoryId: categoryChannel.id,
                logChannelId: logChannel.id,
                supportRoleId: supportRole.id,
                setupBy: interaction.user.id,
                setupAt: Date.now(),
                lastReinviteAt: Date.now()
            });
            
            await interaction.reply({
                content: `✅ Ticket bot configured successfully!\n\n**Configuration:**\n- Category: <#${categoryChannel.id}>\n- Log Channel: <#${logChannel.id}>\n- Support Role: <@&${supportRole.id}>`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Setup command error:', error);
            await interaction.reply({
                content: '❌ Error setting up bot. Please try again.',
                ephemeral: true
            });
        }
    }
};
