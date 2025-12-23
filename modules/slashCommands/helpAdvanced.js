const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View DeadLoom commands and information'),
    
    async execute(interaction) {
        const categories = [
            {
                id: 'overview',
                emoji: '📚',
                name: 'Overview',
                description: 'General information about DeadLoom'
            },
            {
                id: 'setup',
                emoji: '⚙️',
                name: 'Setup Commands',
                description: 'Configure server features',
                commands: [
                    { name: '/setup-prices', desc: 'Configure pricing panel' },
                    { name: '/setup-rolepick', desc: 'Setup role picker' },
                    { name: '/setup-rules', desc: 'Configure rules panel' },
                    { name: '/setup-suggestion', desc: 'Setup suggestions system' },
                    { name: '/setup-codesembed', desc: 'Setup code sharing' }
                ]
            },
            {
                id: 'info',
                emoji: 'ℹ️',
                name: 'Info Commands',
                description: 'View server information',
                commands: [
                    { name: '/rules', desc: 'View server rules' },
                    { name: '/prices', desc: 'View pricing plans' },
                    { name: '/features', desc: 'View our features' },
                    { name: '/faq', desc: 'Frequently asked questions' },
                    { name: '/about', desc: 'About DeadLoom' }
                ]
            },
            {
                id: 'ai',
                emoji: '🤖',
                name: 'AI Commands',
                description: 'Advanced AI features',
                commands: [
                    { name: '/ai chat', desc: 'Chat with AI' },
                    { name: '/ai code', desc: 'Get code help' },
                    { name: '/ai translate', desc: 'Translate text' },
                    { name: '/aiquiz', desc: 'Take an AI quiz' }
                ]
            },
            {
                id: 'moderation',
                emoji: '🛡️',
                name: 'Moderation',
                description: 'Manage your server',
                commands: [
                    { name: '/warn', desc: 'Warn a user' },
                    { name: '/kick', desc: 'Kick a user' },
                    { name: '/ban', desc: 'Ban a user' },
                    { name: '/timeout', desc: 'Timeout a user' },
                    { name: '/purge', desc: 'Delete messages' }
                ]
            },
            {
                id: 'staff',
                emoji: '👔',
                name: 'Staff Commands',
                description: 'Staff management',
                commands: [
                    { name: '/staff points', desc: 'Award staff points' },
                    { name: '/staff leaderboard', desc: 'View leaderboard' },
                    { name: '/loa request', desc: 'Request leave of absence' },
                    { name: '/loa approve', desc: 'Approve LOA' }
                ]
            }
        ];

        let currentPage = 0;
        
        function getOverviewEmbed() {
            return new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: '👑 DeadLoom Bot Services', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle('Welcome to DeadLoom')
                .setDescription(
                    '**Your Premium Discord Bot Hosting Solution**\n\n' +
                    'DeadLoom provides enterprise-grade bot hosting, custom development, and professional Discord solutions.\n\n' +
                    '**📊 Quick Stats:**\n' +
                    '• 500+ Hosted Bots\n' +
                    '• 99.9% Uptime\n' +
                    '• 24/7 Support\n' +
                    '• Custom Features\n\n' +
                    '**🎯 Get Started:**\n' +
                    'Use the dropdown below to explore categories, or type `/help <category>` for details.'
                )
                .addFields(
                    { name: '⚙️', value: 'Setup Commands', inline: true },
                    { name: 'ℹ️', value: 'Info & Pricing', inline: true },
                    { name: '🤖', value: 'AI Features', inline: true },
                    { name: '🛡️', value: 'Moderation', inline: true },
                    { name: '👔', value: 'Staff Tools', inline: true },
                    { name: '📚', value: 'More Help', inline: true }
                )
                .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
                .setFooter({ text: 'Select a category from the dropdown to continue', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();
        }

        function getCategoryEmbed(categoryId) {
            const category = categories.find(c => c.id === categoryId);
            if (!category) return getOverviewEmbed();

            if (categoryId === 'overview') {
                return getOverviewEmbed();
            }

            let description = `${category.description}\n\n`;
            
            if (category.commands) {
                description += '**Available Commands:**\n';
                category.commands.forEach(cmd => {
                    description += `\n${category.emoji} **${cmd.name}**\n    ${cmd.desc}`;
                });
            }

            return new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: `👑 DeadLoom - ${category.name}`, iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(category.name)
                .setDescription(description)
                .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
                .setFooter({ text: 'Use the dropdown to switch categories', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();
        }

        function createSelectMenu() {
            return new StringSelectMenuBuilder()
                .setCustomId('help_category')
                .setPlaceholder('Select a category...')
                .addOptions(
                    categories.map(cat => ({
                        label: cat.name,
                        value: cat.id,
                        emoji: cat.emoji,
                        description: cat.description.substring(0, 50)
                    }))
                );
        }

        function createButtons() {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('help_home')
                    .setLabel('Home')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏠'),
                new ButtonBuilder()
                    .setCustomId('help_support')
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💬'),
                new ButtonBuilder()
                    .setCustomId('help_contact')
                    .setLabel('Contact')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📧')
            );
        }

        const selectRow = new ActionRowBuilder().addComponents(createSelectMenu());
        const buttonRow = createButtons();

        const helpMessage = await interaction.reply({
            embeds: [getOverviewEmbed()],
            components: [selectRow, buttonRow],
            fetchReply: true
        });

        const collector = helpMessage.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'help_category') {
                const selected = i.values[0];
                await i.update({
                    embeds: [getCategoryEmbed(selected)],
                    components: [selectRow, buttonRow]
                });
            } else if (i.customId === 'help_home') {
                await i.update({
                    embeds: [getOverviewEmbed()],
                    components: [selectRow, buttonRow]
                });
            }
        });

        collector.on('end', async () => {
            const disabledSelect = createSelectMenu().setDisabled(true);
            const disabledButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Primary).setEmoji('🏠').setDisabled(true),
                new ButtonBuilder().setCustomId('help_support').setLabel('Support').setStyle(ButtonStyle.Secondary).setEmoji('💬').setDisabled(true),
                new ButtonBuilder().setCustomId('help_contact').setLabel('Contact').setStyle(ButtonStyle.Secondary).setEmoji('📧').setDisabled(true)
            );

            await helpMessage.edit({
                components: [new ActionRowBuilder().addComponents(disabledSelect), disabledButtons]
            }).catch(() => {});
        });
    }
};
