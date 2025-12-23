const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-admin')
        .setDescription('Admin panel for ticket system configuration')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-log-channel')
                .setDescription('Set the channel where ticket events will be logged')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The text channel for ticket logs')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-staff-role')
                .setDescription('Add a role that can view and manage all tickets')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to give staff permissions')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-staff-role')
                .setDescription('Remove a role from having staff permissions')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The staff role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-staff-roles')
                .setDescription('View all configured staff roles'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-category')
                .setDescription('Set which category tickets of a specific type will be created in')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Ticket type (use /ticket-category list to see all types)')
                        .setRequired(true))
                .addChannelOption(option =>
                    option
                        .setName('category')
                        .setDescription('The Discord category channel')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-categories')
                .setDescription('View all configured ticket categories'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-cooldown')
                .setDescription('Enable or disable ticket cooldown'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-cooldown')
                .setDescription('Set how long users must wait before creating another ticket')
                .addIntegerOption(option =>
                    option
                        .setName('minutes')
                        .setDescription('Cooldown time in minutes (1-60)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(60)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-sla')
                .setDescription('Enable or disable SLA (Service Level Agreement) response time tracking'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-sla-time')
                .setDescription('Set the target response time before SLA alerts are triggered')
                .addIntegerOption(option =>
                    option
                        .setName('minutes')
                        .setDescription('Minutes before unclaimed tickets trigger SLA alerts (1-1440)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-max-tickets')
                .setDescription('Set the maximum number of open tickets each user can have')
                .addIntegerOption(option =>
                    option
                        .setName('max')
                        .setDescription('Maximum open tickets per user (1-10)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-voice')
                .setDescription('Enable or disable voice channel creation for tickets'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-staff-alerts')
                .setDescription('Enable or disable direct message alerts to staff for new tickets'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-queue')
                .setDescription('Enable or disable the ticket queue and wait time tracking system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-panel-image')
                .setDescription('Set a custom banner image for the ticket panel')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('Direct image URL (or type "remove" to clear)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-language')
                .setDescription('Set the display language for the ticket panel')
                .addStringOption(option =>
                    option
                        .setName('language')
                        .setDescription('Choose panel language')
                        .setRequired(true)
                        .addChoices(
                            { name: 'English', value: 'en' },
                            { name: 'Español', value: 'es' },
                            { name: 'Français', value: 'fr' },
                            { name: 'Deutsch', value: 'de' },
                            { name: 'Português', value: 'pt' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-status')
                .setDescription('Toggle the support team online/offline status display'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset-counter')
                .setDescription('Reset the ticket numbering counter back to 0'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view-config')
                .setDescription('View current configuration'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        const isBotOwner = interaction.client.application.owner?.id === interaction.user.id ||
                          (interaction.client.application.owner?.ownerId && 
                           interaction.user.id === interaction.client.application.owner.ownerId);
        
        if (!isOwner && !isBotOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Only server owners, bot owners, or administrators can use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const serverConfig = client.database.getServerConfig(interaction.guild.id);

        switch (subcommand) {
            case 'set-log-channel': {
                const channel = interaction.options.getChannel('channel');
                
                const botPermissions = channel.permissionsFor(interaction.guild.members.me);
                if (!botPermissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                    return interaction.reply({
                        content: `❌ I don't have the required permissions in ${channel}!\n**Required:** View Channel, Send Messages, Embed Links`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                client.database.updateServerConfig(interaction.guild.id, {
                    logChannel: channel.id
                });
                await interaction.reply({
                    content: `✅ Log channel set to ${channel}\n📋 Ticket events will now be logged here.`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'add-staff-role': {
                const role = interaction.options.getRole('role');
                
                if (role.managed) {
                    return interaction.reply({
                        content: '❌ Cannot add a managed role (bot role or integration role) as staff role.',
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                if (role.id === interaction.guild.id) {
                    return interaction.reply({
                        content: '❌ Cannot add @everyone as a staff role.',
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                if (!serverConfig.staffRoles.includes(role.id)) {
                    serverConfig.staffRoles.push(role.id);
                    client.database.updateServerConfig(interaction.guild.id, {
                        staffRoles: serverConfig.staffRoles
                    });
                    await interaction.reply({
                        content: `✅ Added ${role} as a staff role\n👥 Members with this role can now view and manage all tickets.`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: `❌ ${role} is already configured as a staff role.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            }

            case 'remove-staff-role': {
                const role = interaction.options.getRole('role');
                const index = serverConfig.staffRoles.indexOf(role.id);
                if (index > -1) {
                    serverConfig.staffRoles.splice(index, 1);
                    client.database.updateServerConfig(interaction.guild.id, {
                        staffRoles: serverConfig.staffRoles
                    });
                    await interaction.reply({
                        content: `✅ Removed ${role} from staff roles\n⚠️ Members with this role will no longer have access to ticket channels.`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: `❌ ${role} is not configured as a staff role.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            }

            case 'list-staff-roles': {
                if (serverConfig.staffRoles.length === 0) {
                    return interaction.reply({
                        content: '❌ No staff roles configured.\n💡 Use `/ticket-admin add-staff-role` to add one.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const rolesList = serverConfig.staffRoles
                    .map((roleId, index) => `${index + 1}. <@&${roleId}> (ID: ${roleId})`)
                    .join('\n');

                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('👥 Staff Roles')
                    .setDescription(`**Total:** ${serverConfig.staffRoles.length} role(s)\n\n${rolesList}`)
                    .setFooter({ text: 'Members with these roles can view and manage all tickets' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'set-category': {
                const type = interaction.options.getString('type');
                const category = interaction.options.getChannel('category');
                
                const customCategories = serverConfig.customCategories || {};
                const allCategories = { ...config.ticketCategories, ...customCategories };
                
                if (!allCategories[type]) {
                    return interaction.reply({
                        content: `❌ Invalid ticket type \`${type}\`\n💡 Use \`/ticket-category list\` to see all available types.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                const botPermissions = category.permissionsFor(interaction.guild.members.me);
                if (!botPermissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels])) {
                    return interaction.reply({
                        content: `❌ I don't have the required permissions in ${category}!\n**Required:** View Channel, Manage Channels`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                if (!serverConfig.categories) {
                    serverConfig.categories = {};
                }
                
                serverConfig.categories[type] = category.id;
                client.database.updateServerConfig(interaction.guild.id, {
                    categories: serverConfig.categories
                });
                await interaction.reply({
                    content: `✅ ${allCategories[type].emoji} **${allCategories[type].label}** tickets will now be created in ${category}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'list-categories': {
                const enabledCategories = serverConfig.enabledCategories || [];
                
                if (enabledCategories.length === 0) {
                    return interaction.reply({
                        content: '❌ No ticket categories enabled.\n💡 Use `/ticket-category` to enable categories.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const customCategories = serverConfig.customCategories || {};
                const allCategories = { ...config.ticketCategories, ...customCategories };
                
                const categoriesList = enabledCategories
                    .map(type => {
                        const cat = allCategories[type];
                        const channelId = serverConfig.categories?.[type];
                        const status = channelId ? `✅ <#${channelId}>` : '⚠️ Not set';
                        return `${cat?.emoji || '📋'} **${cat?.label || type}**\n└ ${status}`;
                    })
                    .join('\n\n');

                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('📋 Ticket Categories Configuration')
                    .setDescription(categoriesList)
                    .setFooter({ text: 'Use /ticket-admin set-category to configure each type' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'toggle-cooldown': {
                const newState = !serverConfig.cooldownEnabled;
                client.database.updateServerConfig(interaction.guild.id, {
                    cooldownEnabled: newState
                });
                const cooldownMinutes = Math.round((serverConfig.ticketCooldownMs || config.ticketCooldown) / 60000);
                await interaction.reply({
                    content: `✅ Ticket cooldown ${newState ? 'enabled' : 'disabled'}${newState ? `\n⏰ Users must wait **${cooldownMinutes} minute(s)** between tickets.` : ''}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'set-cooldown': {
                const minutes = interaction.options.getInteger('minutes');
                const milliseconds = minutes * 60000;
                client.database.updateServerConfig(interaction.guild.id, {
                    ticketCooldownMs: milliseconds
                });
                await interaction.reply({
                    content: `✅ Ticket cooldown time set to **${minutes} minute(s)**\n⏰ Users must now wait ${minutes} minute(s) before creating another ticket.${serverConfig.cooldownEnabled ? '' : '\n\n⚠️ Note: Cooldown is currently **disabled**. Use `/ticket-admin toggle-cooldown` to enable it.'}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'toggle-sla': {
                const newState = !serverConfig.slaEnabled;
                client.database.updateServerConfig(interaction.guild.id, {
                    slaEnabled: newState
                });
                const slaTime = serverConfig.slaTimeMinutes || config.slaTimeMinutes;
                await interaction.reply({
                    content: `✅ SLA tracking ${newState ? 'enabled' : 'disabled'}${newState ? `\n⏰ Staff will be alerted if tickets remain unclaimed for **${slaTime} minutes**` : ''}\n${!newState ? '' : `💡 Tip: Adjust the time with \`/ticket-admin set-sla-time\``}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'set-sla-time': {
                const minutes = interaction.options.getInteger('minutes');
                client.database.updateServerConfig(interaction.guild.id, {
                    slaTimeMinutes: minutes
                });
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;
                await interaction.reply({
                    content: `✅ SLA response time set to **${timeDisplay}**\n⚠️ Staff will be alerted if tickets remain unclaimed for this duration.${serverConfig.slaEnabled ? '' : '\n\n💡 Note: SLA tracking is currently **disabled**. Use `/ticket-admin toggle-sla` to enable it.'}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'set-max-tickets': {
                const max = interaction.options.getInteger('max');
                client.database.updateServerConfig(interaction.guild.id, {
                    maxTicketsPerUser: max
                });
                await interaction.reply({
                    content: `✅ Maximum tickets per user set to **${max}**\n📋 Users can now have up to ${max} open ticket${max > 1 ? 's' : ''} at the same time.`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'toggle-voice': {
                const newState = !serverConfig.voiceTicketsEnabled;
                client.database.updateServerConfig(interaction.guild.id, {
                    voiceTicketsEnabled: newState
                });
                await interaction.reply({
                    content: `✅ Voice channel creation ${newState ? 'enabled' : 'disabled'}\n${newState ? '🎙️ Staff can now create voice channels for tickets using the ticket panel button.' : '⚠️ The voice channel button will no longer appear in ticket panels.'}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'toggle-staff-alerts': {
                const newState = !serverConfig.staffAlertsEnabled;
                client.database.updateServerConfig(interaction.guild.id, {
                    staffAlertsEnabled: newState
                });
                await interaction.reply({
                    content: `✅ Staff DM alerts ${newState ? 'enabled' : 'disabled'}\n${newState ? '📬 Staff members will receive direct messages when new high-priority tickets are created.' : '🔕 Staff will no longer receive DM notifications for new tickets.'}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'toggle-queue': {
                const newState = !serverConfig.queueEnabled;
                client.database.updateServerConfig(interaction.guild.id, {
                    queueEnabled: newState
                });
                await interaction.reply({
                    content: `✅ Queue system ${newState ? 'enabled' : 'disabled'}\n${newState ? '📊 Tickets will now show queue position and estimated wait times.' : '⚠️ Queue positions and wait time estimates will no longer be displayed.'}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'set-panel-image': {
                const url = interaction.options.getString('url');
                if (url.toLowerCase() === 'remove') {
                    client.database.updateServerConfig(interaction.guild.id, {
                        panelImage: null
                    });
                    await interaction.reply({
                        content: '✅ Panel image removed\n🖼️ The ticket panel will now use the default appearance.',
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        return interaction.reply({
                            content: '❌ Invalid URL format\n💡 Please provide a valid image URL starting with `http://` or `https://`',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    client.database.updateServerConfig(interaction.guild.id, {
                        panelImage: url
                    });
                    await interaction.reply({
                        content: '✅ Panel image updated\n🖼️ The new banner will appear in the ticket panel.\n💡 Tip: Use `/ticket-panel` to refresh the panel and see the changes.',
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            }

            case 'set-language': {
                const language = interaction.options.getString('language');
                const languageNames = {
                    'en': 'English 🇬🇧',
                    'es': 'Español 🇪🇸',
                    'fr': 'Français 🇫🇷',
                    'de': 'Deutsch 🇩🇪',
                    'pt': 'Português 🇵🇹'
                };
                client.database.updateServerConfig(interaction.guild.id, {
                    language
                });
                await interaction.reply({
                    content: `✅ Panel language set to **${languageNames[language] || config.languages[language]}**\n🌐 The ticket panel will now display in this language.\n💡 Tip: Use \`/ticket-panel\` to refresh and see the changes.`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'toggle-status': {
                const newState = !serverConfig.statusOnline;
                client.database.updateServerConfig(interaction.guild.id, {
                    statusOnline: newState
                });
                await interaction.reply({
                    content: `✅ Support status set to ${newState ? '🟢 **Online**' : '🔴 **Offline**'}\n${newState ? '✅ Users can now create tickets normally.' : '⚠️ This status is displayed to users but does not prevent ticket creation.'}`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'reset-counter': {
                const currentCounter = serverConfig.ticketCounter;
                client.database.updateServerConfig(interaction.guild.id, {
                    ticketCounter: 0
                });
                await interaction.reply({
                    content: `✅ Ticket counter reset to **0**\n🔢 Previous count was **${currentCounter}**. New tickets will start from #1.\n⚠️ Warning: This does not affect existing ticket channels, only the numbering of new tickets.`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'view-config': {
                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('⚙️ Ticket System Configuration')
                    .addFields(
                        { name: 'Log Channel', value: serverConfig.logChannel ? `<#${serverConfig.logChannel}>` : 'Not set', inline: true },
                        { name: 'Ticket Counter', value: serverConfig.ticketCounter.toString(), inline: true },
                        { name: 'Support Status', value: serverConfig.statusOnline ? '🟢 Online' : '🔴 Offline', inline: true },
                        { name: 'Cooldown', value: serverConfig.cooldownEnabled ? `✅ ${Math.round((serverConfig.ticketCooldownMs || config.ticketCooldown) / 60000)} min` : '❌ Disabled', inline: true },
                        { name: 'SLA Tracking', value: serverConfig.slaEnabled ? `✅ ${serverConfig.slaTimeMinutes} min` : '❌ Disabled', inline: true },
                        { name: 'Max Tickets/User', value: serverConfig.maxTicketsPerUser.toString(), inline: true },
                        { name: 'Voice Tickets', value: serverConfig.voiceTicketsEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Staff Alerts', value: serverConfig.staffAlertsEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Queue System', value: serverConfig.queueEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Language', value: config.languages[serverConfig.language] || 'English', inline: true },
                        { name: 'Panel Image', value: serverConfig.panelImage ? '[Set]' : 'Not set', inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: 'Staff Roles', value: serverConfig.staffRoles.length > 0 ? serverConfig.staffRoles.map(r => `<@&${r}>`).join(', ') : 'None', inline: false }
                    );

                const enabledCategories = serverConfig.enabledCategories || [];
                const customCategories = serverConfig.customCategories || {};
                const allCategories = { ...config.ticketCategories, ...customCategories };
                
                const categories = enabledCategories
                    .map(type => {
                        const cat = allCategories[type];
                        const channelId = serverConfig.categories[type];
                        return `${cat?.emoji || '📋'} **${cat?.label || type}**: ${channelId ? `<#${channelId}>` : 'Not set'}`;
                    })
                    .join('\n');

                embed.addFields({ name: 'Ticket Categories', value: categories || 'None enabled', inline: false });
                embed.setTimestamp();
                
                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                break;
            }
        }
    }
};
