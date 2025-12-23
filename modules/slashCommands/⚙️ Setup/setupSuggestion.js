const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-suggestion')
        .setDescription('Setup server suggestion system')
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
            .setColor('#9B59B6')
            .setAuthor({ name: 'DeadLoom - Suggestions', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('💡 Community Ideas & Feedback')
            .setDescription('Your ideas shape the future of our server')
            .setImage('https://img.freepik.com/free-photo/brainstorm_53876-88744.jpg?w=1200');

        // What to Suggest Embed
        const suggestionEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎯 What Can You Suggest?')
            .addFields(
                { name: '✨ Feature Requests', value: 'New channels, roles, or systems', inline: true },
                { name: '🎉 Events & Activities', value: 'Server events and contests', inline: true },
                { name: '🛠️ Improvements', value: 'Better features and updates', inline: true },
                { name: '🎨 Design Ideas', value: 'Visual and UX improvements', inline: true },
                { name: '📋 Rules & Policy', value: 'Suggest rule changes', inline: true },
                { name: '🤝 Community', value: 'Social and partnership ideas', inline: true }
            );

        // Process Embed
        const processEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('📊 How It Works')
            .setDescription(
                '**Step 1:** Click "Submit Suggestion"\n' +
                '**Step 2:** Describe your idea clearly\n' +
                '**Step 3:** Members vote with reactions\n' +
                '**Step 4:** Top ideas reviewed by staff\n' +
                '**Step 5:** Best suggestions implemented!\n\n' +
                '⭐ Your ideas matter to us!'
            );

        // Success Stories Embed
        const storiesEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🏆 Community Impact')
            .setDescription(
                '✅ **50+** suggestions implemented\n' +
                '✅ **500+** active voters\n' +
                '✅ **1000+** total suggestions\n' +
                '✅ **10,000+** member engagement\n\n' +
                'Your voice makes a difference!'
            );

        // CTA Embed
        const ctaEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🚀 Ready to Suggest?')
            .setDescription(
                'Have a great idea? Let us know!\n\n' +
                'Click the button below to submit your suggestion.'
            )
            .setFooter({ text: 'Help us build a better community' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('suggest_submit')
                .setLabel('Submit Suggestion')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💡'),
            new ButtonBuilder()
                .setCustomId('suggest_view')
                .setLabel('View Top Ideas')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📈'),
            new ButtonBuilder()
                .setCustomId('suggest_vote')
                .setLabel('Vote Now')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🗳️')
        );

        await interaction.reply({
            embeds: [heroEmbed, suggestionEmbed, processEmbed, storiesEmbed, ctaEmbed],
            components: [buttons]
        });
    }
};
