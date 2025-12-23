const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Frequently asked questions'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setAuthor({ name: 'DeadLoom FAQ', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('❓ Frequently Asked Questions')
            .addFields(
                {
                    name: 'Q: How long does bot setup take?',
                    value: 'A: Usually 15-30 minutes depending on customization'
                },
                {
                    name: 'Q: What if I need to cancel?',
                    value: 'A: Cancel anytime with full refund within 7 days'
                },
                {
                    name: 'Q: Do you offer refunds?',
                    value: 'A: Yes! 7-day money-back guarantee on all plans'
                },
                {
                    name: 'Q: Can I upgrade my plan?',
                    value: 'A: Yes, upgrade or downgrade anytime'
                },
                {
                    name: 'Q: What hosting locations do you have?',
                    value: 'A: US, EU, and ASIA servers available'
                },
                {
                    name: 'Q: Do you provide support?',
                    value: 'A: Yes! Email, Discord, and phone support available'
                }
            )
            .setFooter({ text: 'Have more questions? Contact support!', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
