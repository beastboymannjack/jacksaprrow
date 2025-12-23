const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('[Owner Only] Toggle maintenance mode for the bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable maintenance mode - disables all commands and ticket interactions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable maintenance mode - re-enable all commands and ticket interactions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current maintenance mode status')),
    
    async execute(interaction, client) {
        const botOwnerId = process.env.BOT_OWNER_ID;
        
        if (!botOwnerId) {
            return interaction.reply({
                content: '❌ Bot owner ID is not configured. Please set BOT_OWNER_ID in environment variables.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.user.id !== botOwnerId) {
            return interaction.reply({
                content: '❌ This command is only available to the bot owner.',
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'enable': {
                const embed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('🔧 Maintenance Mode Enabled')
                    .setDescription(
                        '**Status:** Maintenance mode is now **ACTIVE**\n\n' +
                        '**What\'s disabled:**\n' +
                        '• All slash commands (except /maintenance)\n' +
                        '• Ticket panel buttons\n' +
                        '• Ticket creation and management\n\n' +
                        '**Users will see:** A maintenance message when trying to interact with the bot.'
                    )
                    .addFields(
                        { name: 'Enabled By', value: `${interaction.user.tag}`, inline: true },
                        { name: 'Enabled At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

                // Send announcement to all servers
                const announcementEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('🔧 Maintenance Mode Active')
                    .setDescription(
                        '**The bot is currently undergoing maintenance.**\n\n' +
                        'All ticket features and commands are temporarily disabled.\n' +
                        'We apologize for any inconvenience. Please check back later.\n\n' +
                        '**Estimated Duration:** Updates will be posted here.'
                    )
                    .setTimestamp();

                let successCount = 0;
                let failCount = 0;
                const maintenanceMessages = {};

                console.log(`🔧 Sending maintenance enable message to ${client.guilds.cache.size} servers...`);

                for (const [guildId, guild] of client.guilds.cache) {
                    try {
                        const serverConfig = client.database.getServerConfig(guildId);
                        
                        console.log(`Guild ${guild.name} (${guildId}) - Panel Channel: ${serverConfig.panelChannelId || 'NOT SET'}`);
                        
                        if (serverConfig.panelChannelId) {
                            const channel = await guild.channels.fetch(serverConfig.panelChannelId).catch(() => null);
                            
                            if (channel && channel.isTextBased()) {
                                const sentMessage = await channel.send({ embeds: [announcementEmbed] });
                                console.log(`✅ Sent maintenance message to ${guild.name} in #${channel.name}`);
                                
                                // Store message ID and channel ID for later deletion
                                maintenanceMessages[guildId] = {
                                    messageId: sentMessage.id,
                                    channelId: channel.id
                                };
                                
                                successCount++;
                            } else {
                                console.log(`❌ Channel not found or not text-based in ${guild.name}`);
                                failCount++;
                            }
                        } else {
                            console.log(`❌ No panel channel configured for ${guild.name}`);
                            failCount++;
                        }
                    } catch (error) {
                        console.error(`Failed to send maintenance message to guild ${guildId}:`, error);
                        failCount++;
                    }
                }

                console.log(`📊 Results: ${successCount} success, ${failCount} failed`);

                // Save maintenance mode with message IDs
                client.database.setMaintenanceMode(true, interaction.user.id, maintenanceMessages);

                // Follow up with broadcast results
                await interaction.followUp({
                    content: `📢 Maintenance announcement sent to **${successCount}** server(s). ${failCount > 0 ? `Failed to send to **${failCount}** server(s) (no panel channel set or channel not accessible).` : ''}`,
                    flags: MessageFlags.Ephemeral
                });

                break;
            }

            case 'disable': {
                const maintenanceData = client.database.getMaintenanceMode();
                
                if (!maintenanceData.enabled) {
                    return interaction.reply({
                        content: '❌ Maintenance mode is already disabled.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('✅ Maintenance Mode Disabled')
                    .setDescription(
                        '**Status:** Maintenance mode is now **INACTIVE**\n\n' +
                        '**All features restored:**\n' +
                        '• All slash commands are working\n' +
                        '• Ticket panel buttons are functional\n' +
                        '• Ticket creation and management enabled\n\n' +
                        '**Users can now:** Use all bot features normally.'
                    )
                    .addFields(
                        { name: 'Disabled By', value: `${interaction.user.tag}`, inline: true },
                        { name: 'Disabled At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

                // Delete old maintenance messages first
                let deletedCount = 0;
                const storedMessages = maintenanceData.messages || {};

                console.log(`🗑️ Deleting old maintenance messages from ${Object.keys(storedMessages).length} servers...`);

                for (const [guildId, msgData] of Object.entries(storedMessages)) {
                    try {
                        const guild = client.guilds.cache.get(guildId);
                        if (guild) {
                            const channel = await guild.channels.fetch(msgData.channelId).catch(() => null);
                            if (channel && channel.isTextBased()) {
                                const message = await channel.messages.fetch(msgData.messageId).catch(() => null);
                                if (message) {
                                    await message.delete();
                                    console.log(`✅ Deleted old maintenance message in ${guild.name}`);
                                    deletedCount++;
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to delete old maintenance message in guild ${guildId}:`, error);
                    }
                }

                console.log(`📊 Deleted ${deletedCount} old maintenance message(s)`);

                // Disable maintenance mode
                client.database.setMaintenanceMode(false);

                // Send announcement to all servers
                const announcementEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('✅ Maintenance Complete')
                    .setDescription(
                        '**The bot is back online!**\n\n' +
                        'All ticket features and commands have been restored.\n' +
                        'Thank you for your patience during the maintenance period.\n\n' +
                        'You can now create tickets and use all bot features normally.'
                    )
                    .setTimestamp();

                let successCount = 0;
                let failCount = 0;

                console.log(`✅ Sending maintenance complete message to ${client.guilds.cache.size} servers...`);

                for (const [guildId, guild] of client.guilds.cache) {
                    try {
                        const serverConfig = client.database.getServerConfig(guildId);
                        
                        console.log(`Guild ${guild.name} (${guildId}) - Panel Channel: ${serverConfig.panelChannelId || 'NOT SET'}`);
                        
                        if (serverConfig.panelChannelId) {
                            const channel = await guild.channels.fetch(serverConfig.panelChannelId).catch(() => null);
                            
                            if (channel && channel.isTextBased()) {
                                const sentMessage = await channel.send({ embeds: [announcementEmbed] });
                                console.log(`✅ Sent maintenance complete message to ${guild.name} in #${channel.name}`);
                                
                                setTimeout(async () => {
                                    try {
                                        await sentMessage.delete();
                                        console.log(`🗑️ Deleted maintenance complete message in ${guild.name} after 5 seconds`);
                                    } catch (err) {
                                        console.error(`Failed to delete maintenance complete message in guild ${guildId}:`, err);
                                    }
                                }, 3600000); // Testing: 5 seconds (5000ms) | Production: 1 hour (3600000ms)
                                
                                successCount++;
                            } else {
                                console.log(`❌ Channel not found or not text-based in ${guild.name}`);
                                failCount++;
                            }
                        } else {
                            console.log(`❌ No panel channel configured for ${guild.name}`);
                            failCount++;
                        }
                    } catch (error) {
                        console.error(`Failed to send maintenance complete message to guild ${guildId}:`, error);
                        failCount++;
                    }
                }

                console.log(`📊 Results: ${successCount} success, ${failCount} failed`);

                // Follow up with broadcast results
                await interaction.followUp({
                    content: `📢 Deleted **${deletedCount}** old maintenance message(s). Maintenance complete announcement sent to **${successCount}** server(s). ${failCount > 0 ? `Failed to send to **${failCount}** server(s) (no panel channel set or channel not accessible).` : ''}`,
                    flags: MessageFlags.Ephemeral
                });

                break;
            }

            case 'status': {
                const maintenanceData = client.database.getMaintenanceMode();
                
                const embed = new EmbedBuilder()
                    .setColor(maintenanceData.enabled ? config.colors.warning : config.colors.success)
                    .setTitle(`${maintenanceData.enabled ? '🔧' : '✅'} Maintenance Mode Status`)
                    .setDescription(
                        `**Current Status:** ${maintenanceData.enabled ? '🔴 **ACTIVE**' : '🟢 **INACTIVE**'}\n\n` +
                        (maintenanceData.enabled 
                            ? '**Features disabled:**\n• All slash commands (except /maintenance)\n• Ticket panel buttons\n• Ticket creation and management'
                            : '**All features:** ✅ Fully operational')
                    )
                    .setTimestamp();

                if (maintenanceData.enabled && maintenanceData.enabledBy) {
                    embed.addFields(
                        { name: 'Enabled By', value: `<@${maintenanceData.enabledBy}>`, inline: true },
                        { name: 'Enabled At', value: `<t:${Math.floor(maintenanceData.enabledAt / 1000)}:R>`, inline: true }
                    );
                }

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }
        }
    }
};
