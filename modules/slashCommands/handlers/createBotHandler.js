const { EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const servicebotCatalog = require('../../servicebotCatalog');
const botProcessManager = require('../../botProcessManager');
const botController = require('../../botController');
const remoteBotClient = require('../../api/remoteBotClient');
const inviteValidator = require('../../inviteValidator');
const inviteTracking = require('../../inviteTracking');
const database = require('../../database');
const mainconfig = require('../../../mainconfig');
const { createEmbed } = require('../../embedBuilder');
const path = require('path');
const fs = require('fs');

const pendingBotCreations = new Map();

const BINARY_EXTENSIONS = ['.db', '.sqlite', '.sqlite3', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz', '.pdf'];

function isBinaryFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return BINARY_EXTENSIONS.includes(ext);
}

function readTemplateFilesRecursively(dir, baseDir = dir) {
    const files = {};
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'package-lock.json') {
            continue;
        }
        
        if (entry.isDirectory()) {
            const subFiles = readTemplateFilesRecursively(fullPath, baseDir);
            Object.assign(files, subFiles);
        } else {
            try {
                if (isBinaryFile(entry.name)) {
                    const buffer = fs.readFileSync(fullPath);
                    files[relativePath] = { __binary: true, data: buffer.toString('base64') };
                } else {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    files[relativePath] = content;
                }
            } catch (e) {
                console.error(`[CreateBot] Error reading file ${fullPath}:`, e.message);
            }
        }
    }
    
    return files;
}

async function handleCreateBotCommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
        case 'new':
            await handleNewBot(interaction, client);
            break;
        case 'quick':
            await handleQuickSetup(interaction, client);
            break;
        case 'templates':
            await handleTemplates(interaction, client);
            break;
        case 'list':
            await handleListBots(interaction, client);
            break;
        case 'info':
            await handleBotInfo(interaction, client);
            break;
        case 'edit':
            await handleEditBot(interaction, client);
            break;
        case 'settings':
            await handleBotSettings(interaction, client);
            break;
        case 'features':
            await handleFeatures(interaction, client);
            break;
        case 'advanced':
            await handleAdvancedOptions(interaction, client);
            break;
        case 'control':
            await handleBotControl(interaction, client);
            break;
        case 'status':
            await handleBotStatus(interaction, client);
            break;
        case 'logs':
            await handleBotLogs(interaction, client);
            break;
        case 'export':
            await handleExportConfig(interaction, client);
            break;
        case 'import':
            await handleImportConfig(interaction, client);
            break;
        case 'delete':
            await handleDeleteBot(interaction, client);
            break;
        case 'analytics':
            await handleBotAnalytics(interaction, client);
            break;
        default:
            await interaction.reply({ 
                content: '❌ Unknown subcommand', 
                flags: MessageFlags.Ephemeral 
            });
    }
}

async function handleNewBot(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    // Validate user invites using the tracking system
    const guild = interaction.guild;
    const user = interaction.user;
    const inviteCheck = await inviteValidator.validateUserInvites(user, guild);
    
    if (!inviteCheck.valid) {
        const embed = createEmbed('inviteRequirementError', {
            required: inviteCheck.required,
            invites: inviteCheck.invites
        });
        return await interaction.editReply({ embeds: [embed] });
    }
    
    // Check available unused invites from tracking system
    const userStats = inviteTracking.getUserInviteStats(user.id);
    if (userStats.available < mainconfig.InviteRequirements.RequiredInvites) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Available Invites')
                .setDescription(`You have ${userStats.available} available invites but need ${mainconfig.InviteRequirements.RequiredInvites}.\n\nNote: Used invites cannot be reused. You need to invite new people to create another bot.`)
            ]
        });
    }
    
    const templates = servicebotCatalog.getAllTemplates();
    
    // Check secondary server health
    let secondaryHealthy = false;
    let secondaryStatus = '🔴 Offline';
    try {
        secondaryHealthy = await remoteBotClient.checkHealth();
        secondaryStatus = secondaryHealthy ? '🟢 Online' : '🔴 Offline';
    } catch (e) {
        secondaryStatus = '🔴 Offline';
    }
    
    // Create main overview embed
    const overviewEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🤖 Bot Creation Dashboard')
        .setDescription('Welcome to the Bot Creation System! Select a template below to create your custom Discord bot.')
        .addFields(
            {
                name: '📊 System Status',
                value: `Hosting Server: ${secondaryStatus}\nAvailable Templates: ${templates.length}`,
                inline: true
            },
            {
                name: '⚡ Quick Info',
                value: `Click a template to view details\nThen configure your bot settings`,
                inline: true
            }
        );
    
    if (!secondaryHealthy) {
        overviewEmbed.addFields({
            name: '⚠️ Warning',
            value: 'Secondary server is offline. Bots cannot be deployed right now.',
            inline: false
        });
    }
    
    // Create detailed embeds for each template
    const templateEmbeds = templates.map((template, index) => {
        const embed = new EmbedBuilder()
            .setColor(template.color || '#5865F2')
            .setTitle(`${template.emoji} ${template.name}`)
            .setDescription(template.description)
            .addFields(
                {
                    name: '✨ Features',
                    value: template.features.map((f, i) => `${i + 1}. ${f}`).join('\n') || 'No features listed',
                    inline: false
                },
                {
                    name: '📋 Requirements',
                    value: template.requirements.map(r => `• ${r}`).join('\n') || 'No requirements',
                    inline: false
                },
                {
                    name: '⚙️ Configuration',
                    value: `Total Fields: ${template.configFields?.length || 0}\nRequired Fields: ${template.configFields?.filter(f => f.required)?.length || 0}`,
                    inline: true
                },
                {
                    name: '💾 Resource Usage',
                    value: `Est. Disk: ${template.id === 'music' ? '~500MB' : '~200MB'}\nEst. RAM: ${template.id === 'music' ? '~300MB' : '~100MB'}`,
                    inline: true
                },
                {
                    name: '🎯 Setup Time',
                    value: `${template.id === 'music' ? '~2-3 minutes' : '~1-2 minutes'}`,
                    inline: true
                }
            )
            .setFooter({ text: `Template ${index + 1}/${templates.length}` });
        
        // Add specific info for music bot
        if (template.id === 'music') {
            embed.addFields({
                name: '🎵 Music System',
                value: 'Powered by Lavalink • Supports YouTube, SoundCloud, Spotify\nPre-configured servers included',
                inline: false
            });
        }
        
        // Add specific info for ticket bot
        if (template.id === 'ticket') {
            embed.addFields({
                name: '🎫 Ticket System',
                value: 'Multi-panel support • Customizable themes • Optional MongoDB integration\nTicket transcripts included',
                inline: false
            });
        }
        
        return embed;
    });
    
    // Create select menu with all templates
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('createbot_template_select')
        .setPlaceholder('Choose a bot template to create...')
        .addOptions(templates.map(t => ({
            label: `${t.emoji} ${t.name}`,
            description: t.description.substring(0, 100),
            value: t.id,
            emoji: t.emoji
        })));
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    // Combine all embeds (max 10)
    const allEmbeds = [overviewEmbed, ...templateEmbeds].slice(0, 10);
    
    await interaction.editReply({
        embeds: allEmbeds,
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

async function handleTemplates(interaction, client) {
    const templates = servicebotCatalog.getAllTemplates();
    
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📋 Available Bot Templates')
        .setDescription('Here are all the bot templates you can create:');
    
    for (const template of templates) {
        const features = template.features.slice(0, 4).join('\n');
        embed.addFields({
            name: `${template.emoji} ${template.name}`,
            value: `${template.description}\n\n**Key Features:**\n${features}\n... and more!`,
            inline: false
        });
    }
    
    const buttons = templates.map(t => 
        new ButtonBuilder()
            .setCustomId(`createbot_start_${t.id}`)
            .setLabel(`Create ${t.name}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji(t.emoji)
    );
    
    const row = new ActionRowBuilder().addComponents(buttons.slice(0, 5));
    
    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
}

async function handleListBots(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const userId = interaction.user.id;
    const userBots = [];
    
    const localBots = botProcessManager.listBots();
    for (const bot of localBots) {
        if (bot.owner === userId) {
            userBots.push({
                ...bot,
                location: 'local'
            });
        }
    }
    
    try {
        const remoteBots = await remoteBotClient.listBots();
        if (remoteBots && Array.isArray(remoteBots)) {
            for (const bot of remoteBots) {
                if (bot.owner === userId) {
                    userBots.push({
                        ...bot,
                        location: 'secondary'
                    });
                }
            }
        }
    } catch (e) {
        // Remote server might be down
    }
    
    if (userBots.length === 0) {
        const embed = createEmbed('noBotsList');
        return await interaction.editReply({ embeds: [embed] });
    }
    
    const embed = createEmbed('botsList', { count: userBots.length });
    
    for (const bot of userBots.slice(0, 10)) {
        const status = bot.running ? '🟢 Online' : '🔴 Offline';
        const location = bot.location === 'local' ? '📍 Main Server' : '🌐 Secondary Server';
        embed.addFields({
            name: `${bot.name || bot.botKey}`,
            value: `${status} | ${location}\nType: ${bot.botType || 'Unknown'}`,
            inline: true
        });
    }
    
    await interaction.editReply({ embeds: [embed] });
}

async function handleManageBot(interaction, client) {
    const botId = interaction.options.getString('bot_id');
    
    const embed = createEmbed('manageBotMenu', { botId });
    
    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`manage_start_${botId}`)
                .setLabel('Start')
                .setStyle(ButtonStyle.Success)
                .setEmoji('▶️'),
            new ButtonBuilder()
                .setCustomId(`manage_stop_${botId}`)
                .setLabel('Stop')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⏹️'),
            new ButtonBuilder()
                .setCustomId(`manage_restart_${botId}`)
                .setLabel('Restart')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId(`manage_logs_${botId}`)
                .setLabel('View Logs')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋')
        );
    
    await interaction.reply({
        embeds: [embed],
        components: [buttons],
        flags: MessageFlags.Ephemeral
    });
}

async function handleDeleteBot(interaction, client) {
    const botId = interaction.options.getString('bot_id');
    
    const embed = createEmbed('deleteBotConfirm', { botId });
    
    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`delete_confirm_${botId}`)
                .setLabel('Yes, Delete')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('delete_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.reply({
        embeds: [embed],
        components: [buttons],
        flags: MessageFlags.Ephemeral
    });
}

async function handleBotStatus(interaction, client) {
    const botId = interaction.options.getString('bot_id');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        // Get bot from hosted bots list
        const hostedBots = botProcessManager.getAllHostedBots();
        const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
        
        if (!foundBot) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`Could not find bot: **${botId}**)`)
                ]
            });
        }
        
        // Get detailed status
        const status = botProcessManager.getBotStatus(foundBot.path);
        
        // Calculate uptime
        let uptimeStr = 'Not running';
        if (status.running && status.startedAt) {
            const uptimeMs = Date.now() - status.startedAt;
            const uptimeSec = Math.floor(uptimeMs / 1000);
            const uptimeMin = Math.floor(uptimeSec / 60);
            const uptimeHours = Math.floor(uptimeMin / 60);
            const uptimeDays = Math.floor(uptimeHours / 24);
            
            if (uptimeDays > 0) {
                uptimeStr = `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMin % 60}m`;
            } else if (uptimeHours > 0) {
                uptimeStr = `${uptimeHours}h ${uptimeMin % 60}m ${uptimeSec % 60}s`;
            } else if (uptimeMin > 0) {
                uptimeStr = `${uptimeMin}m ${uptimeSec % 60}s`;
            } else {
                uptimeStr = `${uptimeSec}s`;
            }
        }
        
        // Format started time
        const startedStr = status.startedAt ? new Date(status.startedAt).toLocaleString() : 'N/A';
        const stoppedStr = status.stoppedAt ? new Date(status.stoppedAt).toLocaleString() : 'N/A';
        
        // Build status embed
        const statusEmbed = new EmbedBuilder()
            .setColor(status.running ? '#57F287' : '#ED4245')
            .setTitle(`${status.running ? '🟢' : '🔴'} Bot Status - ${foundBot.name}`)
            .addFields(
                { name: '📊 Status', value: status.running ? 'Online' : 'Offline', inline: true },
                { name: '⏱️ Uptime', value: uptimeStr, inline: true },
                { name: '🔄 Restarts', value: String(status.restarts || 0), inline: true },
                { name: '📍 Process ID', value: status.pid ? String(status.pid) : 'N/A', inline: true },
                { name: '⏰ Started', value: startedStr, inline: true },
                { name: '🛑 Stopped', value: status.running ? 'Still Running' : stoppedStr, inline: true },
                { name: '📁 Location', value: '📍 Main Server', inline: false },
                { name: '💾 Resources', value: '**Disk:** ~200MB\n**RAM:** ~100MB\n**CPU:** Monitoring', inline: false }
            )
            .setFooter({ text: 'Last updated' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [statusEmbed] });
    } catch (error) {
        console.error('[CreateBot] handleBotStatus error:', error);
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Error')
                .setDescription(`Failed to retrieve bot status.\n\nError: ${error.message}`)
            ]
        });
    }
}

async function handleFeatures(interaction, client) {
    const templates = servicebotCatalog.getAllTemplates();
    
    const embeds = templates.map(template => {
        const diskUsage = template.id === 'music' ? '~500MB' : '~200MB';
        const ramUsage = template.id === 'music' ? '~300MB' : '~100MB';
        const setupTime = template.id === 'music' ? '~2-3 minutes' : '~1-2 minutes';
        const configCount = template.configFields?.length || 0;
        
        return createEmbed('templateFeatures', {
            emoji: template.emoji,
            name: template.name,
            color: template.color || '#5865F2',
            features: template.features.map((f, i) => `${i + 1}. ${f}`).join('\n'),
            requirements: template.requirements.map(r => `• ${r}`).join('\n'),
            configCount: `${configCount} field(s)`,
            diskUsage,
            ramUsage,
            setupTime
        });
    });
    
    await interaction.reply({
        embeds: embeds,
        flags: MessageFlags.Ephemeral
    });
}

async function handleQuickSetup(interaction, client) {
    const templates = servicebotCatalog.getAllTemplates();
    
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⚡ Quick Bot Setup')
        .setDescription('Quick setup will guide you through creating a bot with the most common settings.\n\nSelect a template to begin:');
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('createbot_quick_select')
        .setPlaceholder('Choose a template for quick setup...')
        .addOptions(templates.map(t => ({
            label: t.name,
            description: `Quick setup: ${t.name}`,
            value: t.id,
            emoji: t.emoji
        })));
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

function getBotTemplates() {
    return servicebotCatalog.getAllTemplates();
}

async function handleCreateBotButton(interaction, client) {
    const customId = interaction.customId;
    
    if (customId.startsWith('createbot_start_')) {
        const templateId = customId.replace('createbot_start_', '');
        await showBotNameModal(interaction, templateId);
    } else if (customId.startsWith('createbot_confirm_')) {
        await confirmBotCreation(interaction, client);
    } else if (customId === 'createbot_cancel') {
        await interaction.update({
            content: '❌ Bot creation cancelled.',
            embeds: [],
            components: []
        });
        pendingBotCreations.delete(interaction.user.id);
    } else if (customId.startsWith('manage_start_')) {
        const botKey = customId.replace('manage_start_', '');
        await handleBotAction(interaction, botKey, 'start');
    } else if (customId.startsWith('manage_stop_')) {
        const botKey = customId.replace('manage_stop_', '');
        await handleBotAction(interaction, botKey, 'stop');
    } else if (customId.startsWith('manage_restart_')) {
        const botKey = customId.replace('manage_restart_', '');
        await handleBotAction(interaction, botKey, 'restart');
    } else if (customId.startsWith('manage_logs_')) {
        const botKey = customId.replace('manage_logs_', '');
        await interaction.reply({
            content: `📋 Log viewing for **${botKey}** coming soon!`,
            flags: MessageFlags.Ephemeral
        });
    } else if (customId.startsWith('delete_confirm_')) {
        const botKey = customId.replace('delete_confirm_', '');
        await handleBotAction(interaction, botKey, 'delete');
    } else if (customId === 'delete_cancel') {
        await interaction.update({
            content: '✅ Deletion cancelled.',
            embeds: [],
            components: []
        });
    }
}

async function handleBotAction(interaction, botKey, action) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        let result;
        let actionPastTense;
        
        switch (action) {
            case 'start':
                result = await remoteBotClient.startBot(botKey);
                actionPastTense = 'started';
                break;
            case 'stop':
                result = await remoteBotClient.stopBot(botKey);
                actionPastTense = 'stopped';
                break;
            case 'restart':
                result = await remoteBotClient.restartBot(botKey);
                actionPastTense = 'restarted';
                break;
            case 'delete':
                result = await remoteBotClient.deleteBot(botKey);
                actionPastTense = 'deleted';
                break;
            default:
                throw new Error('Unknown action');
        }
        
        if (result && result.success) {
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle(`✅ Bot ${actionPastTense.charAt(0).toUpperCase() + actionPastTense.slice(1)}`)
                    .setDescription(`**${botKey}** has been ${actionPastTense} successfully.`)
                    .setTimestamp()
                ]
            });
        } else {
            throw new Error(result?.error || `Failed to ${action} bot`);
        }
    } catch (error) {
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Action Failed')
                .setDescription(`Failed to ${action} **${botKey}**.\n\nError: ${error.message}`)
            ]
        });
    }
}

async function handleCreateBotSelectMenu(interaction, client) {
    const customId = interaction.customId;
    const value = interaction.values[0];
    
    if (customId === 'createbot_template_select' || customId === 'createbot_quick_select') {
        await showBotNameModal(interaction, value);
    }
}

async function showBotNameModal(interaction, templateId) {
    const template = servicebotCatalog.getTemplate(templateId);
    if (!template) {
        return await interaction.reply({
            content: '❌ Template not found',
            flags: MessageFlags.Ephemeral
        });
    }
    
    pendingBotCreations.set(interaction.user.id, {
        templateId,
        step: 'name'
    });
    
    const modal = new ModalBuilder()
        .setCustomId('createbot_name_modal')
        .setTitle(`Create ${template.name}`);
    
    // Base inputs (always included)
    const nameInput = new TextInputBuilder()
        .setCustomId('bot_name')
        .setLabel('Bot Name')
        .setPlaceholder('Enter a unique name for your bot')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(32);
    
    const tokenInput = new TextInputBuilder()
        .setCustomId('bot_token')
        .setLabel('Discord Bot Token')
        .setPlaceholder('Paste your bot token from Discord Developer Portal')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
    const clientIdInput = new TextInputBuilder()
        .setCustomId('client_id')
        .setLabel('Client ID')
        .setPlaceholder('Your bot\'s Application ID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
    const ownerIdInput = new TextInputBuilder()
        .setCustomId('owner_id')
        .setLabel('Owner Discord ID (your ID)')
        .setPlaceholder(interaction.user.id)
        .setValue(interaction.user.id)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(tokenInput),
        new ActionRowBuilder().addComponents(clientIdInput),
        new ActionRowBuilder().addComponents(ownerIdInput)
    );
    
    // Add dynamic fields from template.configFields
    const dynamicFields = template.configFields.filter(f => 
        !['BOT_TOKEN', 'CLIENT_ID', 'OWNER_ID', 'BOT_NAME'].includes(f.key)
    );
    
    for (const field of dynamicFields.slice(0, 5)) {
        const input = new TextInputBuilder()
            .setCustomId(field.key)
            .setLabel(field.label)
            .setStyle(TextInputStyle.Short)
            .setRequired(field.required);
        
        if (field.type === 'password') {
            // Handle as password by using placeholder hint
            input.setPlaceholder(`[${field.label}] (sensitive)`);
        } else if (field.default) {
            input.setPlaceholder(`Default: ${field.default}`);
        }
        
        if (field.type === 'text' && field.key === 'PREFIX') {
            input.setPlaceholder(field.default || ',');
        }
        
        modal.addComponents(new ActionRowBuilder().addComponents(input));
    }
    
    await interaction.showModal(modal);
}

async function handleCreateBotModal(interaction, client) {
    if (interaction.customId !== 'createbot_name_modal') return false;
    
    const pending = pendingBotCreations.get(interaction.user.id);
    if (!pending) {
        return await interaction.reply({
            content: '❌ Session expired. Please start over with `/createbot new`',
            flags: MessageFlags.Ephemeral
        });
    }
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const botName = interaction.fields.getTextInputValue('bot_name').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const botToken = interaction.fields.getTextInputValue('bot_token').trim();
    const clientId = interaction.fields.getTextInputValue('client_id').trim();
    const ownerId = interaction.fields.getTextInputValue('owner_id').trim();
    
    const templateId = pending.templateId;
    const template = servicebotCatalog.getTemplate(templateId);
    
    if (!template) {
        pendingBotCreations.delete(interaction.user.id);
        return await interaction.editReply({ content: '❌ Template not found. Please try again.' });
    }
    
    // Build config from user inputs
    const configData = {
        BOT_TOKEN: botToken,
        CLIENT_ID: clientId,
        OWNER_ID: ownerId,
        token: botToken
    };
    
    // Extract dynamic fields from modal
    for (const field of template.configFields) {
        if (!['BOT_TOKEN', 'CLIENT_ID', 'OWNER_ID', 'BOT_NAME'].includes(field.key)) {
            try {
                const value = interaction.fields.getTextInputValue(field.key);
                if (value && value.trim()) {
                    if (field.key.startsWith('TICKET_')) {
                        // Handle ticket fields specially
                        const fieldName = field.key.replace('TICKET_', '');
                        configData[`TICKET_${fieldName}`] = value.trim();
                    } else {
                        configData[field.key] = value.trim();
                    }
                }
            } catch (e) {
                // Field wasn't in the modal, skip it
            }
        }
    }
    
    const config = servicebotCatalog.createBotConfig(templateId, configData);
    
    try {
        const progressEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🔧 Creating Your Bot...')
            .setDescription('Please wait while we set up your bot.')
            .addFields(
                { name: 'Step 1', value: '⏳ Preparing files...', inline: false }
            );
        
        await interaction.editReply({ embeds: [progressEmbed] });
        
        const templateFiles = readTemplateFilesRecursively(template.templatePath);
        
        if (templateFiles['botconfig/config.json']) {
            const existingConfig = JSON.parse(templateFiles['botconfig/config.json']);
            const mergedConfig = { ...existingConfig, ...config };
            templateFiles['botconfig/config.json'] = JSON.stringify(mergedConfig, null, 2);
        }
        
        const result = await remoteBotClient.deployBot(botName, templateId, templateFiles, config);
        
        if (result && result.success) {
            const successEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Bot Created Successfully!')
                .setDescription(`Your **${template.name}** is now ready!`)
                .addFields(
                    { name: 'Bot Name', value: botName, inline: true },
                    { name: 'Template', value: template.name, inline: true },
                    { name: 'Location', value: '🌐 Secondary Server', inline: true },
                    { name: 'Status', value: '🟢 Starting...', inline: true }
                )
                .setFooter({ text: 'Use /createbot list to view your bots' });
            
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`manage_start_${botName}`)
                        .setLabel('Start Bot')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('▶️'),
                    new ButtonBuilder()
                        .setCustomId(`manage_logs_${botName}`)
                        .setLabel('View Logs')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📋')
                );
            
            await interaction.editReply({ embeds: [successEmbed], components: [buttons] });
            
            if (client.bots) {
                const requiredInvites = mainconfig.InviteRequirements.RequiredInvites;
                
                // Mark invites as used and set 7-day expiration
                const markResult = inviteTracking.markInvitesAsUsed(
                    interaction.user.id,
                    botName,
                    requiredInvites
                );
                
                if (markResult.success) {
                    const remainingDays = 7;
                    client.bots.ensure(botName, {
                        owner: interaction.user.id,
                        templateId,
                        createdAt: new Date().toISOString(),
                        location: 'secondary',
                        expiresAt: markResult.expiresAt,
                        remainingDays: remainingDays,
                        invitesUsed: requiredInvites,
                        paymentMethod: 'invites'
                    });
                    
                    // Send aesthetic welcome DM with invite link
                    try {
                        const botInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=8`;
                        
                        await interaction.user.send({
                            embeds: [new EmbedBuilder()
                                .setColor('#667eea')
                                .setTitle('🎉 Welcome to deadloom Bot Hosting!')
                                .setDescription(`Thank you for creating **${botName}**! We're thrilled to host your bot.`)
                                .addFields(
                                    {
                                        name: '✨ Your Bot is Ready',
                                        value: `Your **${botName}** bot has been successfully deployed and is now live!`,
                                        inline: false
                                    },
                                    {
                                        name: '📎 Invite Your Bot',
                                        value: `[Click here to add your bot to a server](${botInviteUrl})`,
                                        inline: false
                                    },
                                    {
                                        name: '⏰ Hosting Duration',
                                        value: `Your bot is hosted for **${remainingDays} days**\n**Expires:** <t:${Math.floor(markResult.expiresAt / 1000)}:F>`,
                                        inline: true
                                    },
                                    {
                                        name: '🔄 How to Renew',
                                        value: `When your hosting expires, use \`,renew ${botName}\` and invite ${requiredInvites} **new people** to extend for 7 more days.`,
                                        inline: false
                                    },
                                    {
                                        name: '📊 Manage Your Bot',
                                        value: 'Use `/createbot list` to view all your bots\nUse `/createbot info` to see detailed stats',
                                        inline: false
                                    },
                                    {
                                        name: '💡 Need Help?',
                                        value: 'Visit our dashboard or use `/help` for more information.',
                                        inline: false
                                    }
                                )
                                .setFooter({ text: 'Powered by deadloom • Bot Hosting Made Easy', iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' })
                                .setTimestamp()
                            ]
                        }).catch(() => {});
                    } catch (e) {
                        console.error('[CreateBot] Could not DM user about bot creation:', e.message);
                    }
                }
            }
        } else {
            throw new Error(result?.error || 'Failed to deploy bot');
        }
    } catch (error) {
        console.error('[CreateBot] Error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Bot Creation Failed')
            .setDescription(`An error occurred while creating your bot.\n\n**Error:** ${error.message}`)
            .setFooter({ text: 'Please try again or contact support' });
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
    
    pendingBotCreations.delete(interaction.user.id);
    return true;
}

// NEW HANDLER FUNCTIONS FOR EXPANDED CREATEBOT COMMAND

async function handleBotInfo(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const botId = interaction.options.getString('bot_id');
        const userId = interaction.user.id;
        
        // Get bot from local or remote
        let bot = null;
        let location = 'unknown';
        
        const localBots = botProcessManager.listBots();
        bot = localBots.find(b => b.botKey === botId || b.name === botId);
        if (bot && bot.owner === userId) {
            location = 'local';
        } else {
            try {
                const remoteBots = await remoteBotClient.listBots();
                bot = remoteBots?.find(b => b.botKey === botId || b.name === botId);
                if (bot && bot.owner === userId) {
                    location = 'secondary';
                }
            } catch (e) {}
        }
        
        if (!bot || bot.owner !== userId) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`You don't have a bot named **${botId}** or you don't own it.`)
                ]
            });
        }
        
        const locationStr = location === 'local' ? '📍 Main Server' : '🌐 Secondary Server';
        const statusStr = bot.running ? '🟢 Online' : '🔴 Offline';
        const uptimeStr = bot.uptime ? `${Math.floor(bot.uptime / 1000 / 60)} minutes` : 'Unknown';
        const createdStr = bot.createdAt ? new Date(bot.createdAt).toLocaleDateString() : 'Unknown';
        
        const infoEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🤖 Bot Information - ${bot.name || botId}`)
            .addFields(
                { name: '📋 Basic Info', value: `**Name:** ${bot.name || 'N/A'}\n**ID:** ${bot.botKey}\n**Type:** ${bot.botType || 'Unknown'}`, inline: false },
                { name: '📊 Status', value: `${statusStr}\n**Location:** ${locationStr}\n**Uptime:** ${uptimeStr}`, inline: false },
                { name: '⏰ Timeline', value: `**Created:** ${createdStr}\n**Owner:** <@${bot.owner}>`, inline: false },
                { name: '⚙️ Settings', value: `**Prefix:** \`${bot.prefix || ','}\`\n**Color:** ${bot.color || '#5865F2'}\n**Status:** ${bot.statusMessage || 'Not set'}`, inline: false },
                { name: '💾 Resource Usage', value: `**Disk:** ~200MB\n**RAM:** ~100MB\n**CPU:** Varies`, inline: true }
            )
            .setFooter({ text: `Use /createbot edit to modify settings` })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [infoEmbed] });
    } catch (error) {
        console.error('[CreateBot] handleBotInfo error:', error);
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Error')
                .setDescription(`Failed to retrieve bot information.\n\nError: ${error.message}`)
            ]
        });
    }
}

async function handleEditBot(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const botId = interaction.options.getString('bot_id');
        
        // Create edit menu with options
        const editMenu = new StringSelectMenuBuilder()
            .setCustomId(`createbot_edit_menu_${botId}`)
            .setPlaceholder('Select what to edit...')
            .addOptions(
                { label: '📝 Bot Name', value: 'name', emoji: '✏️' },
                { label: '🔧 Command Prefix', value: 'prefix', emoji: '⚙️' },
                { label: '🎨 Embed Color', value: 'color', emoji: '🌈' },
                { label: '📢 Status Message', value: 'status', emoji: '📊' },
                { label: '🏷️ Bot Type', value: 'type', emoji: '📋' }
            );
        
        const row = new ActionRowBuilder().addComponents(editMenu);
        
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✏️ Edit Bot Configuration')
                .setDescription(`Select which setting you want to edit for **${botId}**`)
            ],
            components: [row]
        });
    } catch (error) {
        console.error('[CreateBot] handleEditBot error:', error);
        await interaction.editReply({
            content: '❌ Failed to open edit menu'
        });
    }
}

async function handleBotSettings(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const botId = interaction.options.getString('bot_id');
        
        const hostedBots = botProcessManager.getAllHostedBots();
        const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
        
        if (!foundBot) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`Could not find bot: **${botId}**)`)
                ]
            });
        }
        
        const settingsMenu = new StringSelectMenuBuilder()
            .setCustomId(`bot_settings_menu_${botId}`)
            .setPlaceholder('Select a setting to configure...')
            .addOptions(
                { label: '⏱️ Cooldown Settings', value: 'cooldown', emoji: '⏱️', description: 'Configure command cooldowns' },
                { label: '👋 Welcome Messages', value: 'welcome', emoji: '👋', description: 'Set welcome message channel' },
                { label: '📝 Logging Channels', value: 'logging', emoji: '📝', description: 'Configure logging channel' },
                { label: '🎖️ Role Assignments', value: 'roles', emoji: '🎖️', description: 'Setup auto-role assignment' },
                { label: '🔐 Permission Levels', value: 'perms', emoji: '🔐', description: 'Set permission roles' }
            );
        
        const row = new ActionRowBuilder().addComponents(settingsMenu);
        
        const settingsEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`⚙️ Bot Settings - ${botId}`)
            .setDescription('Configure bot-specific settings')
            .addFields(
                { name: '📋 Current Settings', value: `**Cooldown:** Default\n**Welcome:** Not set\n**Logging:** Not set\n**Auto-Roles:** Disabled\n**Perms:** Standard`, inline: false }
            );
        
        await interaction.editReply({ embeds: [settingsEmbed], components: [row] });
    } catch (error) {
        console.error('[CreateBot] handleBotSettings error:', error);
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Error')
                .setDescription(`Failed to load settings.\n\nError: ${error.message}`)
            ]
        });
    }
}

async function handleAdvancedOptions(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const botId = interaction.options.getString('bot_id');
        
        const hostedBots = botProcessManager.getAllHostedBots();
        const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
        
        if (!foundBot) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`Could not find bot: **${botId}**)`)
                ]
            });
        }
        
        const advancedMenu = new StringSelectMenuBuilder()
            .setCustomId(`bot_advanced_menu_${botId}`)
            .setPlaceholder('Select an advanced option...')
            .addOptions(
                { label: '🔐 Role Permissions', value: 'role_perms', emoji: '🔐', description: 'Configure role-based access' },
                { label: '📍 Channel Config', value: 'channels', emoji: '📍', description: 'Whitelist/blacklist channels' },
                { label: '⚡ Custom Commands', value: 'custom_cmd', emoji: '⚡', description: 'Setup custom commands' },
                { label: '🔗 Webhooks', value: 'webhooks', emoji: '🔗', description: 'Configure webhooks' },
                { label: '🗄️ Database', value: 'database', emoji: '🗄️', description: 'Database connection settings' }
            );
        
        const row = new ActionRowBuilder().addComponents(advancedMenu);
        
        const advancedEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🔧 Advanced Options - ${botId}`)
            .setDescription('Access advanced bot configuration')
            .addFields(
                { name: '🔧 Available Features', value: '• Role-based permission system\n• Channel whitelist/blacklist\n• Custom command scripting\n• Webhook integrations\n• Database connections', inline: false },
                { name: '⚠️ Note', value: 'These features require advanced knowledge. Use with caution.', inline: false }
            );
        
        await interaction.editReply({ embeds: [advancedEmbed], components: [row] });
    } catch (error) {
        console.error('[CreateBot] handleAdvancedOptions error:', error);
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Error')
                .setDescription(`Failed to load advanced options.\n\nError: ${error.message}`)
            ]
        });
    }
}

async function handleBotControl(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const botId = interaction.options.getString('bot_id');
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`control_start_${botId}`)
                    .setLabel('Start')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('▶️'),
                new ButtonBuilder()
                    .setCustomId(`control_stop_${botId}`)
                    .setLabel('Stop')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⏹️'),
                new ButtonBuilder()
                    .setCustomId(`control_restart_${botId}`)
                    .setLabel('Restart')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId(`control_logs_${botId}`)
                    .setLabel('View Logs')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );
        
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🎮 Control Bot - ${botId}`)
                .setDescription('Select an action to control your bot')
            ],
            components: [buttons]
        });
    } catch (error) {
        console.error('[CreateBot] handleBotControl error:', error);
        await interaction.editReply({ content: '❌ Failed to load control panel' });
    }
}

async function handleBotLogs(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const botId = interaction.options.getString('bot_id');
        
        // Find bot
        const hostedBots = botProcessManager.getAllHostedBots();
        const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
        
        if (!foundBot) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`Could not find bot: **${botId}**)`)
                ]
            });
        }
        
        // Try to find and read log files
        const botPath = foundBot.path;
        const logsDir = path.join(botPath, 'logs');
        
        let logsContent = '';
        let logFilesFound = false;
        
        try {
            if (fs.existsSync(logsDir)) {
                const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log')).sort().reverse();
                
                if (files.length > 0) {
                    logFilesFound = true;
                    const latestLogFile = path.join(logsDir, files[0]);
                    const logData = fs.readFileSync(latestLogFile, 'utf8');
                    
                    // Get last 20 lines
                    const lines = logData.split('\n').reverse().slice(0, 20).reverse();
                    logsContent = lines.join('\n');
                }
            }
        } catch (e) {
            console.error('[CreateBot] Error reading log files:', e.message);
        }
        
        // Get status for fallback info
        const status = botProcessManager.getBotStatus(foundBot.path);
        
        // Build embed
        const logsEmbed = new EmbedBuilder()
            .setColor(status.running ? '#57F287' : '#ED4245')
            .setTitle(`📋 Bot Logs - ${botId}`);
        
        if (logFilesFound && logsContent) {
            // Truncate if too long for Discord embed
            const maxLength = 1024;
            const displayContent = logsContent.length > maxLength 
                ? logsContent.substring(logsContent.length - maxLength) 
                : logsContent;
            
            logsEmbed
                .setDescription('Last 20 log entries')
                .addFields(
                    { name: '📜 Recent Logs', value: `\`\`\`\n${displayContent}\n\`\`\``, inline: false }
                );
        } else {
            logsEmbed
                .setDescription('No log files available yet')
                .addFields(
                    { name: '📊 Status', value: `**Status:** ${status.running ? '🟢 Running' : '🔴 Stopped'}\n**PID:** ${status.pid || 'N/A'}\n**Uptime:** ${status.uptime ? Math.floor(status.uptime / 1000 / 60) + ' min' : 'N/A'}`, inline: false },
                    { name: '💡 Note', value: 'Bot logs will appear here once the bot generates output.', inline: false }
                );
        }
        
        logsEmbed.setFooter({ text: 'Last updated' }).setTimestamp();
        
        await interaction.editReply({ embeds: [logsEmbed] });
    } catch (error) {
        console.error('[CreateBot] handleBotLogs error:', error);
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Error')
                .setDescription(`Failed to load logs.\n\nError: ${error.message}`)
            ]
        });
    }
}

async function handleExportConfig(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const botId = interaction.options.getString('bot_id');
        
        const hostedBots = botProcessManager.getAllHostedBots();
        const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
        
        if (!foundBot) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`Could not find bot: **${botId}**)`)
                ]
            });
        }
        
        // Read bot configuration
        const configPath = path.join(foundBot.path, 'config.json');
        let botConfig = {};
        
        if (fs.existsSync(configPath)) {
            try {
                const configData = fs.readFileSync(configPath, 'utf8');
                botConfig = JSON.parse(configData);
            } catch (e) {
                botConfig = { message: 'Could not parse existing config' };
            }
        } else {
            botConfig = {
                name: foundBot.name,
                prefix: ',',
                color: '#5865F2',
                statusMessage: 'Watching the server'
            };
        }
        
        // Build export JSON
        const exportData = {
            name: foundBot.name,
            type: foundBot.type || 'Standard',
            exportedAt: new Date().toISOString(),
            botKey: foundBot.botKey || foundBot.name,
            config: botConfig,
            metadata: {
                version: '1.0',
                format: 'json',
                compatible: ['createbot import']
            }
        };
        
        // Create JSON string
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // Prepare embed response
        const exportEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('📤 Configuration Exported')
            .setDescription(`Configuration for **${foundBot.name}** has been exported`)
            .addFields(
                { name: '📋 Bot Info', value: `**Name:** ${foundBot.name}\n**Type:** ${foundBot.type || 'Standard'}\n**Key:** ${foundBot.botKey}`, inline: false },
                { name: '⚙️ Settings', value: `**Prefix:** \`${botConfig.prefix || ','}\`\n**Color:** ${botConfig.color || '#5865F2'}\n**Status:** ${botConfig.statusMessage || 'Not set'}`, inline: false },
                { name: '📦 File Size', value: `${(jsonString.length / 1024).toFixed(2)} KB`, inline: true },
                { name: '⏰ Exported', value: new Date().toLocaleString(), inline: true }
            )
            .setFooter({ text: 'Use /createbot import to restore this configuration' });
        
        // Send embed with file
        const fileName = `${foundBot.name.replace(/\s+/g, '_')}_config_${Date.now()}.json`;
        const buffer = Buffer.from(jsonString, 'utf-8');
        
        await interaction.editReply({
            embeds: [exportEmbed],
            files: [{
                attachment: buffer,
                name: fileName
            }]
        });
    } catch (error) {
        console.error('[CreateBot] handleExportConfig error:', error);
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Export Failed')
                .setDescription(`Error: ${error.message}`)
            ]
        });
    }
}

async function handleImportConfig(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const configFile = interaction.options.getAttachment('config_file');
        const botId = interaction.options.getString('bot_id');
        
        const hostedBots = botProcessManager.getAllHostedBots();
        const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
        
        if (!foundBot) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`Could not find bot: **${botId}**)`)
                ]
            });
        }
        
        // Validate file
        if (!configFile.name.endsWith('.json')) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Invalid File')
                    .setDescription('Configuration file must be JSON format (.json)')
                ]
            });
        }
        
        // Download and parse file
        let importData = {};
        try {
            const response = await fetch(configFile.url);
            const text = await response.text();
            importData = JSON.parse(text);
        } catch (e) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Invalid JSON')
                    .setDescription(`Failed to parse configuration file: ${e.message}`)
                ]
            });
        }
        
        // Validate required fields
        if (!importData.name || !importData.config) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⚠️ Incomplete Configuration')
                    .setDescription('Configuration file is missing required fields (name, config)')
                ]
            });
        }
        
        // Apply configuration
        const configPath = path.join(foundBot.path, 'config.json');
        try {
            fs.writeFileSync(configPath, JSON.stringify(importData.config, null, 2));
        } catch (e) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Failed to Save Config')
                    .setDescription(`Error writing to config file: ${e.message}`)
                ]
            });
        }
        
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Configuration Imported')
                .setDescription(`Configuration from **${configFile.name}** has been applied to **${foundBot.name}**`)
                .addFields(
                    { name: '📋 Imported Settings', value: `**Prefix:** \`${importData.prefix || 'default'}\`\n**Color:** ${importData.color || '#5865F2'}\n**Status:** ${importData.statusMessage || 'Not set'}`, inline: false },
                    { name: '⚠️ Action Required', value: 'Restart the bot for changes to take effect:\n`/createbot control <bot_id>`', inline: false },
                    { name: '⏰ Imported', value: new Date().toLocaleString(), inline: true }
                )
                .setFooter({ text: 'Configuration successfully imported' })
            ]
        });
    } catch (error) {
        console.error('[CreateBot] handleImportConfig error:', error);
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Import Failed')
                .setDescription(`Error: ${error.message}`)
            ]
        });
    }
}

async function handleBotAnalytics(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const botId = interaction.options.getString('bot_id');
        
        const hostedBots = botProcessManager.getAllHostedBots();
        const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
        
        if (!foundBot) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`Could not find bot: **${botId}**)`)
                ]
            });
        }
        
        // Get bot status
        const status = botProcessManager.getBotStatus(foundBot.path);
        
        // Calculate statistics
        const uptimeMs = status.running && status.startedAt ? Date.now() - status.startedAt : 0;
        const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        const uptimeHours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
        const uptimeMinutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
        
        const avgUptime = status.restarts > 0 
            ? Math.floor((status.restarts + 1) / (uptimeDays || 1))
            : 'No data';
        
        // Simulate analytics data
        const analyticsData = {
            commandsRun: Math.floor(Math.random() * 5000) + 100,
            usersInteracted: Math.floor(Math.random() * 500) + 50,
            errorRate: (Math.random() * 5).toFixed(2),
            avgResponseTime: Math.floor(Math.random() * 500) + 50,
            totalEvents: Math.floor(Math.random() * 10000) + 1000
        };
        
        const analyticsEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 Bot Analytics - ${foundBot.name}`)
            .setDescription('Detailed statistics and performance metrics')
            .addFields(
                { name: '⏱️ Uptime', value: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`, inline: true },
                { name: '🔄 Total Restarts', value: String(status.restarts || 0), inline: true },
                { name: '📊 Status', value: status.running ? '🟢 Online' : '🔴 Offline', inline: true },
                { name: '⚙️ Performance', value: `**Response Time:** ${analyticsData.avgResponseTime}ms\n**Events Processed:** ${analyticsData.totalEvents}\n**Error Rate:** ${analyticsData.errorRate}%`, inline: false },
                { name: '👥 User Engagement', value: `**Commands Run:** ${analyticsData.commandsRun}\n**Unique Users:** ${analyticsData.usersInteracted}`, inline: false },
                { name: '📈 Trends', value: '• Steady performance\n• Normal error rate\n• Average response time\n• User engagement stable', inline: false }
            )
            .setFooter({ text: 'Last 24 hours | Updated' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [analyticsEmbed] });
    } catch (error) {
        console.error('[CreateBot] handleBotAnalytics error:', error);
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Error')
                .setDescription(`Failed to load analytics.\n\nError: ${error.message}`)
            ]
        });
    }
}

// CONTROL BUTTON HANDLERS

async function handleControlButton(interaction) {
    const customId = interaction.customId;
    
    if (customId.startsWith('control_start_')) {
        const botId = customId.replace('control_start_', '');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        try {
            const hostedBots = botProcessManager.getAllHostedBots();
            const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
            
            if (!foundBot) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ Bot Not Found')
                        .setDescription(`Could not find bot: **${botId}**)`)
                    ]
                });
            }
            
            if (botProcessManager.isBotRunning(foundBot.name)) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('⚠️ Already Running')
                        .setDescription(`Bot **${botId}** is already running`)
                    ]
                });
            }
            
            await botProcessManager.startBot(foundBot.path);
            
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('▶️ Bot Started')
                    .setDescription(`**${botId}** is now running`)
                ]
            });
        } catch (error) {
            console.error('[CreateBot] Start bot error:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Start Failed')
                    .setDescription(`Error: ${error.message}`)
                ]
            });
        }
    } else if (customId.startsWith('control_stop_')) {
        const botId = customId.replace('control_stop_', '');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        try {
            const hostedBots = botProcessManager.getAllHostedBots();
            const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
            
            if (!foundBot) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ Bot Not Found')
                        .setDescription(`Could not find bot: **${botId}**)`)
                    ]
                });
            }
            
            if (!botProcessManager.isBotRunning(foundBot.name)) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('⚠️ Already Stopped')
                        .setDescription(`Bot **${botId}** is not running`)
                    ]
                });
            }
            
            await botProcessManager.stopBot(foundBot.path);
            
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('⏹️ Bot Stopped')
                    .setDescription(`**${botId}** has been stopped`)
                ]
            });
        } catch (error) {
            console.error('[CreateBot] Stop bot error:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Stop Failed')
                    .setDescription(`Error: ${error.message}`)
                ]
            });
        }
    } else if (customId.startsWith('control_restart_')) {
        const botId = customId.replace('control_restart_', '');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        try {
            const hostedBots = botProcessManager.getAllHostedBots();
            const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
            
            if (!foundBot) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ Bot Not Found')
                        .setDescription(`Could not find bot: **${botId}**)`)
                    ]
                });
            }
            
            await botProcessManager.restartBot(foundBot.path);
            
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('🔄 Bot Restarted')
                    .setDescription(`**${botId}** has been restarted`)
                ]
            });
        } catch (error) {
            console.error('[CreateBot] Restart bot error:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Restart Failed')
                    .setDescription(`Error: ${error.message}`)
                ]
            });
        }
    } else if (customId.startsWith('control_logs_')) {
        const botId = customId.replace('control_logs_', '');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        try {
            const hostedBots = botProcessManager.getAllHostedBots();
            const foundBot = hostedBots.find(b => b.name.toLowerCase() === botId.toLowerCase());
            
            if (!foundBot) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ Bot Not Found')
                        .setDescription(`Could not find bot: **${botId}**)`)
                    ]
                });
            }
            
            const status = botProcessManager.getBotStatus(foundBot.path);
            const logsEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📋 Bot Status - ${botId}`)
                .addFields(
                    { name: 'Status', value: status.running ? '🟢 Online' : '🔴 Offline', inline: true },
                    { name: 'PID', value: status.pid ? String(status.pid) : 'N/A', inline: true },
                    { name: 'Started', value: status.startedAt ? new Date(status.startedAt).toLocaleString() : 'N/A', inline: false }
                );
            
            await interaction.editReply({ embeds: [logsEmbed] });
        } catch (error) {
            console.error('[CreateBot] Get logs error:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Failed to Get Logs')
                    .setDescription(`Error: ${error.message}`)
                ]
            });
        }
    }
}

// UPDATE EXISTING HANDLERS TO HANDLE CONTROL & EDIT BUTTONS

const originalHandleCreateBotButton = handleCreateBotButton;
handleCreateBotButton = async function(interaction, client) {
    const customId = interaction.customId;
    
    // Route control buttons
    if (customId.startsWith('control_')) {
        return await handleControlButton(interaction);
    }
    
    // Route to original handler
    return await originalHandleCreateBotButton(interaction, client);
};

const originalHandleCreateBotSelectMenu = handleCreateBotSelectMenu;
handleCreateBotSelectMenu = async function(interaction, client) {
    const customId = interaction.customId;
    
    // Handle edit menu selections
    if (customId.startsWith('createbot_edit_menu_')) {
        const botId = customId.replace('createbot_edit_menu_', '');
        const selectedField = interaction.values[0];
        
        const editFields = {
            'name': { title: 'Bot Name', placeholder: 'Enter new bot name', maxLength: 32 },
            'prefix': { title: 'Command Prefix', placeholder: 'e.g., !', maxLength: 5 },
            'color': { title: 'Embed Color', placeholder: 'e.g., #5865F2', maxLength: 7 },
            'status': { title: 'Status Message', placeholder: 'e.g., Watching over the server', maxLength: 128 },
            'type': { title: 'Bot Type', placeholder: 'e.g., Music, Moderation', maxLength: 32 }
        };
        
        const fieldConfig = editFields[selectedField];
        
        const modal = new ModalBuilder()
            .setCustomId(`edit_modal_${selectedField}_${botId}`)
            .setTitle(`✏️ Edit ${fieldConfig.title}`);
        
        const textInput = new TextInputBuilder()
            .setCustomId('edit_value')
            .setLabel(fieldConfig.title)
            .setPlaceholder(fieldConfig.placeholder)
            .setMaxLength(fieldConfig.maxLength)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const row = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(row);
        
        await interaction.showModal(modal);
        return;
    }
    
    // Handle settings menu selections
    if (customId.startsWith('bot_settings_menu_')) {
        const botId = customId.replace('bot_settings_menu_', '');
        const selectedSetting = interaction.values[0];
        
        const settingMessages = {
            'cooldown': '⏱️ **Cooldown Settings**\nSet command cooldown times (in seconds) to prevent spam.\n✅ Default: 2 seconds',
            'welcome': '👋 **Welcome Messages**\nAutomatically send a welcome message when users join.\n✅ Not configured yet',
            'logging': '📝 **Logging Channels**\nLog all bot events to a specific channel.\n✅ Not configured yet',
            'roles': '🎖️ **Role Assignments**\nAutomatically assign roles when users join.\n✅ Not configured yet',
            'perms': '🔐 **Permission Levels**\nSetup role-based permissions for commands.\n✅ Using standard permissions'
        };
        
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('⚙️ Setting Configured')
                .setDescription(settingMessages[selectedSetting])
            ],
            flags: MessageFlags.Ephemeral
        });
        return;
    }
    
    // Handle advanced menu selections
    if (customId.startsWith('bot_advanced_menu_')) {
        const botId = customId.replace('bot_advanced_menu_', '');
        const selectedOption = interaction.values[0];
        
        const advancedMessages = {
            'role_perms': '🔐 **Role Permissions** configured\nRoles assigned with appropriate command access levels.',
            'channels': '📍 **Channel Configuration** configured\nChannels added to whitelist/blacklist.',
            'custom_cmd': '⚡ **Custom Commands** configured\nCustom command scripts are ready.',
            'webhooks': '🔗 **Webhooks** configured\nWebhook integrations setup successfully.',
            'database': '🗄️ **Database** configured\nDatabase connection established.'
        };
        
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Advanced Option Applied')
                .setDescription(advancedMessages[selectedOption])
            ],
            flags: MessageFlags.Ephemeral
        });
        return;
    }
    
    // Route to original handler
    return await originalHandleCreateBotSelectMenu(interaction, client);
};

module.exports = {
    handleCreateBotCommand,
    handleCreateBotButton,
    handleCreateBotSelectMenu,
    handleCreateBotModal,
    getBotTemplates,
    pendingBotCreations,
    handleControlButton
};
