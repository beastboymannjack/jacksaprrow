const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-rolepick')
        .setDescription('Setup self-assignable role picking panel')
        .setDefaultMemberPermissions('ADMINISTRATOR'),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ You need Administrator permissions')],
                ephemeral: true
            });
        }

        // Hero Embed
        const heroEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'DeadLoom - Role Selection', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('👥 Customize Your Experience')
            .setDescription('Select roles to personalize your server experience')
            .setImage('https://img.freepik.com/free-photo/diversity-people_53876-88743.jpg?w=1200');

        // Info Embed
        const infoEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('📚 About Role Selection')
            .addFields(
                { name: '🎮 Gaming Roles', value: 'Connect with gamers and find teammates', inline: true },
                { name: '🎨 Creative Roles', value: 'Share your art and creative projects', inline: true },
                { name: '💻 Tech Roles', value: 'Discuss programming and development', inline: true },
                { name: '🎵 Music Roles', value: 'Share music and discover artists', inline: true },
                { name: '📚 Interest Roles', value: 'Connect over shared interests', inline: true },
                { name: '🏆 Achievement Roles', value: 'Unlock exclusive roles', inline: true }
            );

        // Features Embed
        const featuresEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('✨ Benefits')
            .setDescription(
                '✅ **Access role-specific channels**\n' +
                '✅ **Get targeted notifications**\n' +
                '✅ **Find community members**\n' +
                '✅ **Participate in activities**\n' +
                '✅ **Customize your profile**'
            );

        // CTA Embed
        const ctaEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🚀 Get Started')
            .setDescription(
                'Use the role selector below to choose up to 5 roles.\n\n' +
                'You can change your roles anytime!'
            )
            .setFooter({ text: 'Select roles to join communities' });

        const roleRow = new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('role_pick_menu')
                .setPlaceholder('👥 Click to select roles')
                .setMinValues(0)
                .setMaxValues(5)
        );

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('role_info')
                .setLabel('Learn More')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('ℹ️'),
            new ButtonBuilder()
                .setCustomId('role_reset')
                .setLabel('Clear Roles')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔄')
        );

        await interaction.reply({
            embeds: [heroEmbed, infoEmbed, featuresEmbed, ctaEmbed],
            components: [roleRow, buttons]
        });
    }
};
