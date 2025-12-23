const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-codesembed')
        .setDescription('Setup code sharing system')
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
            .setColor('#2ECC71')
            .setAuthor({ name: 'DeadLoom - Code Sharing', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('💻 Share Code & Learn Together')
            .setDescription('Share snippets, tutorials, and projects with the community')
            .setImage('https://img.freepik.com/free-photo/coding_53876-88745.jpg?w=1200');

        // Languages Embed
        const languagesEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🔤 Supported Languages')
            .setDescription(
                '```javascript  Python     Java\n' +
                'C++         C#         Rust\n' +
                'Go          PHP        HTML/CSS\n' +
                'SQL         TypeScript  Kotlin\n' +
                'Swift       Ruby       Bash```'
            );

        // Features Embed
        const featuresEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('✨ Features')
            .addFields(
                { name: '🎨 Syntax Highlighting', value: 'Beautiful code formatting', inline: true },
                { name: '🔒 Secure Storage', value: 'Private and protected code', inline: true },
                { name: '⭐ Star System', value: 'Like and bookmark favorites', inline: true },
                { name: '💬 Comments', value: 'Discuss code with community', inline: true },
                { name: '📊 Analytics', value: 'Track code popularity', inline: true },
                { name: '📥 Download', value: 'Save and use shared code', inline: true }
            );

        // Rules Embed
        const rulesEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('⚠️ Code Sharing Rules')
            .setDescription(
                '✅ **DO:**\n' +
                '• Share educational code\n' +
                '• Credit original authors\n' +
                '• Help others learn\n\n' +
                '❌ **DON\'T:**\n' +
                '• Share malicious code\n' +
                '• Post API keys or secrets\n' +
                '• Steal others\' code\n' +
                '• Share NSFW content'
            );

        // CTA Embed
        const ctaEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🚀 Start Sharing')
            .setDescription(
                'Upload your first code snippet now!\n\n' +
                'Join 500+ developers sharing and learning together.'
            )
            .setFooter({ text: 'Building a community of developers' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('code_upload')
                .setLabel('Upload Code')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📤'),
            new ButtonBuilder()
                .setCustomId('code_browse')
                .setLabel('Browse Codes')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📚'),
            new ButtonBuilder()
                .setCustomId('code_trending')
                .setLabel('Trending')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔥')
        );

        await interaction.reply({
            embeds: [heroEmbed, languagesEmbed, featuresEmbed, rulesEmbed, ctaEmbed],
            components: [buttons]
        });
    }
};
