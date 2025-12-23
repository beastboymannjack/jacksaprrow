const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Learn about DeadLoom'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setAuthor({ name: 'About DeadLoom', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('👑 DeadLoom Bot Services')
            .setDescription(
                '**Your Ultimate Discord Bot Hosting Solution**\n\n' +
                'DeadLoom provides premium bot hosting, custom bot development, and professional Discord solutions for communities of all sizes.'
            )
            .addFields(
                {
                    name: '🎯 Our Mission',
                    value: 'Empower Discord communities with cutting-edge bot hosting and custom development services'
                },
                {
                    name: '📈 By The Numbers',
                    value: '• 500+ Hosted Bots\n• 10,000+ Active Users\n• 99.9% Uptime\n• 24/7 Support'
                },
                {
                    name: '🏆 Why Choose Us?',
                    value: '• Custom Coded Bots\n• Blazing Fast Servers\n• Expert Support Team\n• Affordable Pricing'
                },
                {
                    name: '📞 Contact',
                    value: 'Discord: Open a ticket\nEmail: support@deadloom.dev\nWebsite: deadloom.dev'
                }
            )
            .setFooter({ text: 'Trusted by Discord communities worldwide', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
