const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prices')
        .setDescription('View DeadLoom pricing plans'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setAuthor({ name: 'DeadLoom Pricing', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('💰 Our Pricing Plans')
            .addFields(
                {
                    name: '🚀 Starter - $4.99/month',
                    value: '• Basic Bot Hosting\n• 1 Bot Instance\n• 24/7 Uptime\n• Email Support'
                },
                {
                    name: '⭐ Premium - $9.99/month',
                    value: '• Advanced Features\n• 5 Bot Instances\n• Priority Support\n• Custom Branding'
                },
                {
                    name: '👑 Elite - $24.99/month',
                    value: '• Unlimited Bots\n• Priority Support\n• Custom Features\n• Dedicated Server'
                },
                {
                    name: '💎 Special Offers',
                    value: '• Annual Plan: 20% OFF\n• Lifetime: $199 (One-time)\n• Referral Credits Available'
                }
            )
            .setFooter({ text: 'Contact sales for custom packages', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
