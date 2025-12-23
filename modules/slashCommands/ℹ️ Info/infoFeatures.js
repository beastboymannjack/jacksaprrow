const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('features')
        .setDescription('View DeadLoom features'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setAuthor({ name: 'DeadLoom Features', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('✨ Our Features')
            .addFields(
                {
                    name: '🤖 Advanced Bot Hosting',
                    value: '24/7 uptime with automatic backups and recovery'
                },
                {
                    name: '🎯 Custom Features',
                    value: 'Build and deploy custom features for your bots'
                },
                {
                    name: '📊 Analytics Dashboard',
                    value: 'Track bot performance and member interactions'
                },
                {
                    name: '🔐 Security',
                    value: 'Enterprise-grade security and data protection'
                },
                {
                    name: '💬 Support',
                    value: 'Priority 24/7 support from our expert team'
                },
                {
                    name: '🚀 Scalability',
                    value: 'Grow your bots without limits'
                }
            )
            .setFooter({ text: 'Join hundreds of servers using DeadLoom', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
