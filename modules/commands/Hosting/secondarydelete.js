const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const mainconfig = require('../../../mainconfig');
const remoteBotClient = require('../../api/remoteBotClient');

module.exports = {
    name: "secondarydelete",
    aliases: ["secdelete", "sdelete", "secondary-delete"],
    category: "Hosting",
    description: "Delete a bot from deadloom hosting",
    usage: ",secondarydelete <botName>",
    permissions: ["ADMINISTRATOR"],
    run: async (client, message, args, cmduser, text, prefix) => {
        const hasPermission = message.member.permissions.has("ADMINISTRATOR") ||
            message.member.roles.cache.has(mainconfig.ServerRoles.FounderId) ||
            message.member.roles.cache.has(mainconfig.ServerRoles.BotCreatorRoleId) ||
            message.member.roles.cache.has(mainconfig.ServerRoles.ChiefBotCreatorRoleId) ||
            message.author.id === mainconfig.BotOwnerID;

        if (!hasPermission) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ You do not have permission to use this command.')
            ]});
        }

        if (!remoteBotClient.isConfigured()) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ deadloom hosting Not Configured')
                    .setDescription('Remote bot hosting is not configured. Please set up `REMOTE_LOG_URL` and `REMOTE_LOG_API_KEY` environment variables.')
            ]});
        }

        if (!args[0]) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription(`❌ Usage: \`${prefix}secondarydelete <botName>\``)
            ]});
        }

        const botKey = args[0].toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
        
        // Confirmation message
        const confirmEmbed = new EmbedBuilder()
            .setColor('#ff6600')
            .setTitle('⚠️ Confirm Deletion')
            .setDescription(`Are you sure you want to delete \`${botKey}\` from deadloom hosting?\n\nThis action **cannot** be undone!`)
            .setFooter({ text: 'You have 30 seconds to confirm' });

        const confirmMsg = await message.reply({ 
            embeds: [confirmEmbed],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_delete')
                        .setLabel('Yes, Delete')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_delete')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });

        try {
            const interaction = await confirmMsg.awaitMessageComponent({ time: 30000 });

            if (interaction.customId === 'cancel_delete') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('❌ Deletion Cancelled')
                    .setDescription(`Bot deletion has been cancelled.`);

                return await interaction.update({ embeds: [cancelEmbed], components: [] });
            }

            if (interaction.customId === 'confirm_delete') {
                const deletingEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⏳ Deleting Bot')
                    .setDescription(`Deleting bot \`${botKey}\` from deadloom hosting...\nPlease wait...`);

                await interaction.update({ embeds: [deletingEmbed], components: [] });

                try {
                    await remoteBotClient.deleteBot(botKey);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Bot Deleted')
                        .addFields({ name: 'Bot Name', value: `\`${botKey}\``, inline: true })
                        .addFields({ name: 'Location', value: '🖥️ deadloom hosting', inline: true })
                        .setDescription('The bot has been successfully deleted.')
                        .setFooter({ text: `Deleted by ${message.author.tag}` })
                        .setTimestamp();

                    await confirmMsg.edit({ embeds: [successEmbed] });
                } catch (error) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Failed to Delete Bot')
                        .addFields({ name: 'Bot Name', value: `\`${botKey}\``, inline: true })
                        .setDescription(`\`\`\`\n${error.message}\n\`\`\``)
                        .setFooter({ text: `Error: ${error.message}` })
                        .setTimestamp();

                    await confirmMsg.edit({ embeds: [errorEmbed] });
                }
            }
        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Confirmation Timeout')
                .setDescription('The confirmation window has expired. The bot was not deleted.');

            await confirmMsg.edit({ embeds: [timeoutEmbed], components: [] });
        }
    }
};
