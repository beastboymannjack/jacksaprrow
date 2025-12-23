const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('View server rules and guidelines'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'DeadLoom Server Rules', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('📋 Server Rules')
            .addFields(
                { name: '1️⃣ Respect', value: 'Treat all members with kindness and respect' },
                { name: '2️⃣ Clean Content', value: 'No NSFW content in public channels' },
                { name: '3️⃣ No Spam', value: 'Avoid spamming and excessive pinging' },
                { name: '4️⃣ Discord ToS', value: 'Follow Discord Terms of Service' },
                { name: '5️⃣ Respect Staff', value: 'Listen to moderators and staff members' }
            )
            .setFooter({ text: 'Violations will result in warnings and possible bans', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
