const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-prices')
        .setDescription('Setup the pricing panel for bot services')
        .setDefaultMemberPermissions('ADMINISTRATOR'),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ You need Administrator permissions')],
                ephemeral: true
            });
        }

        // Hero Embed
        const heroEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'DeadLoom Bot Services', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('💎 Premium Bot Hosting Plans')
            .setDescription(
                '**Affordable. Reliable. Professional.**\n\n' +
                'Choose the perfect hosting plan for your Discord bot.'
            )
            .setImage('https://img.freepik.com/free-photo/digital-abstract-glitch_53876-88742.jpg?w=1200')
            .setFooter({ text: 'DeadLoom - Your Bot Hosting Partner' });

        // Plans Embed
        const plansEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('📦 Our Plans')
            .addFields(
                {
                    name: '🚀 Starter',
                    value: '```\n• 1 Bot Instance\n• 24/7 Hosting\n• Email Support\n• Basic Analytics\n\n$4.99/month```',
                    inline: true
                },
                {
                    name: '⭐ Professional',
                    value: '```\n• 5 Bot Instances\n• Priority Support\n• Custom Features\n• Advanced Analytics\n\n$9.99/month```',
                    inline: true
                },
                {
                    name: '👑 Enterprise',
                    value: '```\n• Unlimited Bots\n• 24/7 Support\n• Dedicated Server\n• Custom Integration\n\n$24.99/month```',
                    inline: true
                }
            );

        // Features Embed
        const featuresEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('✨ What\'s Included')
            .addFields(
                { name: '✅ All Plans', value: '• 99.9% Uptime Guarantee\n• Auto-backups\n• SSL Security\n• Global CDN' },
                { name: '🎁 Bonuses', value: '• Free Setup Assistance\n• Migration Help\n• Monitoring & Alerts\n• Community Support' }
            );

        // Special Offers Embed
        const offersEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎉 Special Offers')
            .addFields(
                { name: 'Annual Plan', value: '**Save 20%** when you pay yearly' },
                { name: 'Lifetime License', value: '**$199 one-time** - Never pay again!' },
                { name: 'Referral Program', value: '**Get Credits** when you refer friends' }
            );

        // CTA Embed
        const ctaEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🚀 Ready to Get Started?')
            .setDescription(
                'Join 500+ servers already using DeadLoom!\n\n' +
                '**Step 1:** Choose your plan\n' +
                '**Step 2:** Complete setup\n' +
                '**Step 3:** Deploy your bot\n\n' +
                'No credit card required for free trial!'
            )
            .setFooter({ text: 'Questions? Contact our support team!' });

        // Buttons
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('pricing_purchase')
                .setLabel('Purchase Now')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💳'),
            new ButtonBuilder()
                .setCustomId('pricing_trial')
                .setLabel('Start Free Trial')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🆓'),
            new ButtonBuilder()
                .setCustomId('pricing_contact')
                .setLabel('Contact Sales')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💬')
        );

        await interaction.reply({
            embeds: [heroEmbed, plansEmbed, featuresEmbed, offersEmbed, ctaEmbed],
            components: [buttons]
        });
    }
};
