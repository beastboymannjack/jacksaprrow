const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-rules')
        .setDescription('Setup server rules panel')
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
            .setAuthor({ name: 'DeadLoom - Server Rules', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('📋 Community Guidelines')
            .setDescription('Keep our community safe and welcoming for everyone')
            .setImage('https://img.freepik.com/free-photo/teamwork_53876-88742.jpg?w=1200');

        // Core Rules Embed
        const rulesEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🔒 Core Rules')
            .addFields(
                { name: '1️⃣ Be Respectful', value: '• Treat members with kindness\n• No harassment or discrimination\n• No bullying or hate speech' },
                { name: '2️⃣ Keep It Clean', value: '• No NSFW in general channels\n• Minimal profanity\n• Appropriate content only' },
                { name: '3️⃣ No Spam', value: '• No repeated messages\n• No unsolicited promotion\n• No excessive pinging' },
                { name: '4️⃣ Follow Discord ToS', value: '• Obey Discord Terms of Service\n• No illegal content\n• No account trading' }
            );

        // Enforcement Embed
        const enforcementEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('⚖️ Enforcement')
            .setDescription(
                '**Progressive Discipline System:**\n\n' +
                '1️⃣ **Warning** - First offense\n' +
                '2️⃣ **Timeout** - Repeated offense (1-24h)\n' +
                '3️⃣ **Mute** - Continued violation\n' +
                '4️⃣ **Kick** - Final warning\n' +
                '5️⃣ **Ban** - Serious/repeated infractions\n\n' +
                '⚠️ **Serious violations** may result in immediate ban'
            );

        // Appeals Embed
        const appealsEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('📧 Appeals & Questions')
            .setDescription(
                'If you believe a punishment was unfair:\n\n' +
                '**1. Send a DM** to our moderation team\n' +
                '**2. Explain** your situation clearly\n' +
                '**3. Wait** for a response (24-48h)\n\n' +
                'We review all appeals fairly!'
            );

        // CTA Embed
        const ctaEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('✅ I Understand')
            .setDescription(
                'By clicking **Accept**, you agree to follow all server rules.\n\n' +
                'Questions? Contact the moderation team for clarification.'
            )
            .setFooter({ text: 'DeadLoom - Building Better Communities' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('rules_accept')
                .setLabel('I Accept')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('rules_contact')
                .setLabel('Contact Mods')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💬'),
            new ButtonBuilder()
                .setCustomId('rules_appeal')
                .setLabel('Appeal')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('📧')
        );

        await interaction.reply({
            embeds: [heroEmbed, rulesEmbed, enforcementEmbed, appealsEmbed, ctaEmbed],
            components: [buttons]
        });
    }
};
