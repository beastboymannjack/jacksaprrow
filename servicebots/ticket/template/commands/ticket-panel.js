const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Create or refresh the ticket panel with category buttons')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const serverConfig = client.database.getServerConfig(interaction.guild.id);
        const stats = client.database.getTicketStats(interaction.guild.id);
        const avgWaitTime = client.database.getAverageWaitTime(interaction.guild.id);
        const ratingStats = client.database.getRatingStats(interaction.guild.id);
        
        const waitMinutes = Math.round(avgWaitTime / 60000);
        const statusEmoji = serverConfig.statusOnline ? '🟢' : '🔴';
        const statusText = serverConfig.statusOnline ? 'Online' : 'Offline';
        
        const enabledCategories = serverConfig.enabledCategories || [];
        const customCategories = serverConfig.customCategories || {};
        const allCategories = { ...config.ticketCategories, ...customCategories };

        if (enabledCategories.length === 0) {
            return interaction.reply({
                content: '❌ No ticket categories are enabled. Use `/ticket-category` to enable categories first.',
                flags: MessageFlags.Ephemeral
            });
        }

        let categoriesDescription = '';
        enabledCategories.forEach(catId => {
            const category = allCategories[catId];
            if (category) {
                categoriesDescription += `${category.emoji} **${category.label}**\n${category.description}\n\n`;
            }
        });
        
        const embed = new EmbedBuilder()
            .setColor(serverConfig.statusOnline ? '#57F287' : '#ED4245')
            .setTitle(`${statusEmoji} Support Ticket Center`)
            .setDescription(
                `**${statusText} - Ready to help you!**\n` +
                `Select the category that best matches your needs below.\n\n` +
                `📊 **Current Stats**\n` +
                `• Open Tickets: **${stats.openTickets}**\n` +
                `• Avg Wait Time: **${waitMinutes > 0 ? waitMinutes + ' min' : 'Less than 1 min'}**\n` +
                `• Rating: **${ratingStats.avgRating > 0 ? ratingStats.avgRating.toFixed(1) + '/5.0 ⭐' : 'N/A'}**\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                categoriesDescription +
                `━━━━━━━━━━━━━━━━━━━━━━`
            )
            .setFooter({ text: 'Our team will respond as soon as possible • Click refresh to update stats' })
            .setTimestamp();

        if (serverConfig.panelImage) {
            embed.setImage(serverConfig.panelImage);
        }

        const buttonStyles = [
            ButtonStyle.Primary,
            ButtonStyle.Success,
            ButtonStyle.Secondary,
            ButtonStyle.Danger,
            ButtonStyle.Primary,
            ButtonStyle.Success,
            ButtonStyle.Secondary,
            ButtonStyle.Primary,
            ButtonStyle.Success
        ];

        const components = [];
        let currentRow = new ActionRowBuilder();
        let buttonsInRow = 0;
        let buttonStyleIndex = 0;

        enabledCategories.forEach((catId, index) => {
            const category = allCategories[catId];
            if (!category) return;

            const button = new ButtonBuilder()
                .setCustomId(`ticket_create_${catId}`)
                .setLabel(category.label)
                .setEmoji(category.emoji)
                .setStyle(buttonStyles[buttonStyleIndex % buttonStyles.length]);

            currentRow.addComponents(button);
            buttonsInRow++;
            buttonStyleIndex++;

            if (buttonsInRow === 5 || index === enabledCategories.length - 1) {
                components.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonsInRow = 0;
            }
        });

        if (components.length < 5) {
            const utilityRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_refresh')
                    .setLabel('Refresh Stats')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('panel_faq')
                    .setLabel('Quick Help')
                    .setEmoji('❓')
                    .setStyle(ButtonStyle.Secondary)
            );
            components.push(utilityRow);
        } else if (buttonsInRow > 0 && buttonsInRow < 4) {
            components[components.length - 1].addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_refresh')
                    .setLabel('Refresh')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (serverConfig.panelMessageId && serverConfig.panelChannelId) {
            try {
                const channel = await interaction.guild.channels.fetch(serverConfig.panelChannelId);
                const message = await channel.messages.fetch(serverConfig.panelMessageId);
                
                await message.edit({
                    embeds: [embed],
                    components
                });

                await interaction.reply({
                    content: '✅ Ticket panel refreshed!',
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                const newMessage = await interaction.channel.send({
                    embeds: [embed],
                    components
                });

                client.database.updateServerConfig(interaction.guild.id, {
                    panelMessageId: newMessage.id,
                    panelChannelId: interaction.channel.id
                });

                await interaction.reply({
                    content: '✅ New ticket panel created!',
                    flags: MessageFlags.Ephemeral
                });
            }
        } else {
            const newMessage = await interaction.channel.send({
                embeds: [embed],
                components
            });

            client.database.updateServerConfig(interaction.guild.id, {
                panelMessageId: newMessage.id,
                panelChannelId: interaction.channel.id
            });

            await interaction.reply({
                content: '✅ Ticket panel created!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
