const { handleWelcomeCommand, handleGoodbyeCommand } = require('./handlers/welcomeHandler');
const levelingHandler = require('./handlers/levelingHandler');
const { handleLevelCommand, handleLeaderboardCommand, handleXPCommand, handleLevelRolesCommand, addXP, checkLevelRoles, calculateLevel } = levelingHandler;
const staffHandler = require('./handlers/staffCompetitionHandler');
const { handleStaffCommand, handleCompetitionCommand, trackStaffAction } = staffHandler;
const { handleAICommand, handleQuizCommand, handlePersonalityCommand, callGemini } = require('./handlers/aiHandler');
const { handleWarnCommand, handleKickCommand, handleBanCommand, handleUnbanCommand, handleTimeoutCommand, handleSlowmodeCommand, handlePurgeCommand, handleLockCommand, handleUnlockCommand, handleHistoryCommand, handleConfigCommand } = require('./handlers/moderationHandler');
const { handleCreateBotCommand, handleCreateBotButton, handleCreateBotSelectMenu, handleCreateBotModal, getBotTemplates } = require('./handlers/createBotHandler');
const { handleVerify, handleAppeal, handleVerifyHistory, handleVerifyManage, handleVerifySetup, handleVerifyEmbed } = require('./handlers/verificationHandler');
const { handleHostingStatus, handleHostingRestart, handleHostingHealth } = require('./handlers/hostingHandler');
const { EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const moment = require('moment');
const mainconfig = require('../../mainconfig.js');

async function handleInteraction(interaction, client) {
    if (interaction.isButton()) {
        await handleButtonInteraction(interaction, client);
        return;
    }
    
    if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction, client);
        return;
    }
    
    if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction, client);
        return;
    }
    
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    console.log(`[InteractionHandler] Received command: ${commandName}`);

    try {
        switch (commandName) {
            case 'welcome':
                await handleWelcomeCommand(interaction, client);
                break;
            case 'goodbye':
                await handleGoodbyeCommand(interaction, client);
                break;
            case 'level':
                await handleLevelCommand(interaction, client);
                break;
            case 'leaderboard':
                await handleLeaderboardCommand(interaction, client);
                break;
            case 'xp':
                await handleXPCommand(interaction, client);
                break;
            case 'levelroles':
                await handleLevelRolesCommand(interaction, client);
                break;
            case 'staff':
                await handleStaffCommand(interaction, client);
                break;
            case 'competition':
                await handleCompetitionCommand(interaction, client);
                break;
            case 'ai':
                await handleAICommand(interaction, client);
                break;
            case 'aiquiz':
                await handleQuizCommand(interaction, client);
                break;
            case 'personality':
                await handlePersonalityCommand(interaction, client);
                break;
            case 'warn':
                await handleWarnCommand(interaction, client);
                break;
            case 'kick':
                await handleKickCommand(interaction, client);
                break;
            case 'ban':
                await handleBanCommand(interaction, client);
                break;
            case 'unban':
                await handleUnbanCommand(interaction, client);
                break;
            case 'timeout':
                await handleTimeoutCommand(interaction, client);
                break;
            case 'slowmode':
                await handleSlowmodeCommand(interaction, client);
                break;
            case 'purge':
                await handlePurgeCommand(interaction, client);
                break;
            case 'lock':
                await handleLockCommand(interaction, client);
                break;
            case 'unlock':
                await handleUnlockCommand(interaction, client);
                break;
            case 'history':
                await handleHistoryCommand(interaction, client);
                break;
            case 'config':
                await handleConfigCommand(interaction, client);
                break;
            case 'createbot':
                await handleCreateBotCommand(interaction, client);
                break;
            case 'verify':
                await handleVerify(client, interaction);
                break;
            case 'appeal':
                await handleAppeal(client, interaction);
                break;
            case 'verifyhistory':
                await handleVerifyHistory(client, interaction);
                break;
            case 'verifymanage':
                await handleVerifyManage(client, interaction);
                break;
            case 'verifysetup':
                await handleVerifySetup(client, interaction);
                break;
            case 'verifyembed':
                await handleVerifyEmbed(client, interaction);
                break;
            case 'hosting-status':
                await handleHostingStatus(interaction);
                break;
            case 'hosting-restart':
                await handleHostingRestart(interaction);
                break;
            case 'hosting-health':
                await handleHostingHealth(interaction);
                break;
            case 'help':
                await handleHelpCommand(interaction, client);
                break;
            case 'setup-prices':
                await handleSetupPrices(interaction);
                break;
            case 'setup-rolepick':
                await handleSetupRolePick(interaction);
                break;
            case 'setup-rules':
                await handleSetupRules(interaction);
                break;
            case 'setup-suggestion':
                await handleSetupSuggestion(interaction);
                break;
            case 'setup-codesembed':
                await handleSetupCodeEmbed(interaction);
                break;
            case 'rules':
                await handleInfoRules(interaction);
                break;
            case 'prices':
                await handleInfoPrices(interaction);
                break;
            case 'features':
                await handleInfoFeatures(interaction);
                break;
            case 'faq':
                await handleInfoFAQ(interaction);
                break;
            case 'about':
                await handleInfoAbout(interaction);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error(`[SlashCommand] Error in ${commandName}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('Command Error')
            .setDescription('An error occurred while executing this command.')
            .setFooter({ text: 'Please try again later' });

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
}

const helpCategories = {
    moderation: {
        name: '🛡️ Moderation',
        emoji: '🛡️',
        color: '#ED4245',
        commands: [
            { name: '/warn', description: 'Warn a user', usage: '/warn @user [reason]' },
            { name: '/kick', description: 'Kick a user from server', usage: '/kick @user [reason]' },
            { name: '/ban', description: 'Ban a user', usage: '/ban @user [reason] [days]' },
            { name: '/unban', description: 'Unban a user', usage: '/unban <user_id>' },
            { name: '/timeout', description: 'Timeout a user', usage: '/timeout @user <duration>' },
            { name: '/purge', description: 'Delete messages', usage: '/purge <amount> [@user]' },
            { name: '/lock', description: 'Lock a channel', usage: '/lock [reason]' },
            { name: '/unlock', description: 'Unlock a channel', usage: '/unlock' },
            { name: '/slowmode', description: 'Set channel slowmode', usage: '/slowmode <seconds>' },
            { name: '/history', description: 'View user mod history', usage: '/history @user' }
        ]
    },
    leveling: {
        name: '📈 Leveling',
        emoji: '📈',
        color: '#57F287',
        commands: [
            { name: '/level', description: 'View your level and XP', usage: '/level [@user]' },
            { name: '/leaderboard', description: 'View server leaderboards', usage: '/leaderboard [page]' },
            { name: '/xp add', description: 'Add XP to user', usage: '/xp add @user <amount>' },
            { name: '/xp remove', description: 'Remove XP from user', usage: '/xp remove @user <amount>' },
            { name: '/xp set', description: 'Set user XP', usage: '/xp set @user <amount>' },
            { name: '/levelroles', description: 'Configure level role rewards', usage: '/levelroles add/remove/list' }
        ]
    },
    ai: {
        name: '🤖 AI Assistant',
        emoji: '🤖',
        color: '#5865F2',
        commands: [
            { name: '/ai chat', description: 'Chat with AI assistant', usage: '/ai chat <message>' },
            { name: '/ai code', description: 'Get code help', usage: '/ai code <language> <question>' },
            { name: '/ai translate', description: 'Translate text', usage: '/ai translate <text> <language>' },
            { name: '/ai summarize', description: 'Summarize text/channel', usage: '/ai summarize <text|channel>' },
            { name: '/ai advisor', description: 'Get moderation advice', usage: '/ai advisor <situation>' },
            { name: '/ai image', description: 'Analyze an image', usage: '/ai image <url> [question]' },
            { name: '/aiquiz', description: 'Start an AI quiz', usage: '/aiquiz [topic] [difficulty]' }
        ]
    },
    welcome: {
        name: '👋 Welcome System',
        emoji: '👋',
        color: '#FEE75C',
        commands: [
            { name: '/welcome setup', description: 'Setup welcome channel', usage: '/welcome setup #channel' },
            { name: '/welcome message', description: 'Set welcome message', usage: '/welcome message <text>' },
            { name: '/welcome embed', description: 'Configure welcome embed', usage: '/welcome embed <options>' },
            { name: '/welcome dm', description: 'Enable DM welcome', usage: '/welcome dm <enable|disable>' },
            { name: '/goodbye', description: 'Configure goodbye messages', usage: '/goodbye setup #channel' }
        ]
    },
    staff: {
        name: '🏆 Staff Competition',
        emoji: '🏆',
        color: '#EB459E',
        commands: [
            { name: '/staff points', description: 'Add staff points', usage: '/staff points @user <amount>' },
            { name: '/staff stats', description: 'View staff statistics', usage: '/staff stats [@user]' },
            { name: '/staff leaderboard', description: 'Staff leaderboard', usage: '/staff leaderboard' },
            { name: '/competition create', description: 'Create competition', usage: '/competition create <name>' }
        ]
    },
    config: {
        name: '⚙️ Configuration',
        emoji: '⚙️',
        color: '#99AAB5',
        commands: [
            { name: '/config modlog', description: 'Set mod log channel', usage: '/config modlog #channel' },
            { name: '/config levelup', description: 'Configure level up notifications', usage: '/config levelup <options>' },
            { name: '/config view', description: 'View current configuration', usage: '/config view' }
        ]
    },
    createbot: {
        name: '⭐ CreateBot',
        emoji: '⭐',
        color: '#F1C40F',
        commands: [
            { name: '/createbot new', description: 'Create a new bot with wizard', usage: '/createbot new' },
            { name: '/createbot templates', description: 'View bot templates', usage: '/createbot templates' },
            { name: '/createbot list', description: 'List your created bots', usage: '/createbot list' },
            { name: '/createbot manage', description: 'Manage an existing bot', usage: '/createbot manage <bot>' },
            { name: '/createbot quick', description: 'Quick all-in-one setup', usage: '/createbot quick' },
            { name: '/createbot features', description: 'View all features', usage: '/createbot features' }
        ]
    },
    hosting: {
        name: '🖥️ Hosting Service',
        emoji: '🖥️',
        color: '#FFD700',
        commands: [
            { name: '/hosting-status', description: 'Check hosting service status', usage: '/hosting-status' },
            { name: '/hosting-restart', description: 'Restart the hosting service', usage: '/hosting-restart [graceful]' },
            { name: '/hosting-health', description: 'Quick health check', usage: '/hosting-health' }
        ]
    }
};

const categoryKeys = Object.keys(helpCategories);

async function handleHelpCommand(interaction, client) {
    const category = interaction.options.getString('category');

    if (category && category !== 'all' && helpCategories[category]) {
        const cat = helpCategories[category];
        const embed = new EmbedBuilder()
            .setColor(cat.color)
            .setTitle(cat.name)
            .setDescription(cat.commands.map(c => `**${c.name}** - ${c.description}`).join('\n'))
            .setFooter({ text: 'Click a category button for more details!' });
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const currentPage = 0;
    const { embed, navRow, categoryRow, categoryRow2 } = buildHelpPage(currentPage, client);

    await interaction.reply({ embeds: [embed], components: [navRow, categoryRow, categoryRow2] });
}

function buildHelpPage(pageIndex, client) {
    const totalPages = categoryKeys.length;
    const currentCat = helpCategories[categoryKeys[pageIndex]];
    
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📚 Bot Commands')
        .setDescription(`Welcome! Click the category buttons below to see commands.\n\n**Current:** ${currentCat.name}`)
        .addFields(
            Object.values(helpCategories).map(cat => ({
                name: cat.name,
                value: cat.commands.slice(0, 2).map(c => `\`${c.name}\``).join(', ') + '...',
                inline: true
            }))
        )
        .setFooter({ text: `Page ${pageIndex + 1}/${totalPages} • Click category buttons for details` })
        .setTimestamp();

    const navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`help_nav_prev_${pageIndex}`)
                .setLabel('◀')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pageIndex === 0),
            new ButtonBuilder()
                .setCustomId(`help_nav_home_${pageIndex}`)
                .setLabel('🏠 Home')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`help_nav_next_${pageIndex}`)
                .setLabel('▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pageIndex >= totalPages - 1)
        );

    const categoryRow1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('help_cat_moderation').setLabel('Moderation').setStyle(ButtonStyle.Danger).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('help_cat_leveling').setLabel('Leveling').setStyle(ButtonStyle.Success).setEmoji('📈'),
            new ButtonBuilder().setCustomId('help_cat_ai').setLabel('AI').setStyle(ButtonStyle.Primary).setEmoji('🤖'),
            new ButtonBuilder().setCustomId('help_cat_createbot').setLabel('CreateBot').setStyle(ButtonStyle.Secondary).setEmoji('⭐')
        );

    const categoryRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('help_cat_welcome').setLabel('Welcome').setStyle(ButtonStyle.Secondary).setEmoji('👋'),
            new ButtonBuilder().setCustomId('help_cat_staff').setLabel('Staff').setStyle(ButtonStyle.Primary).setEmoji('🏆'),
            new ButtonBuilder().setCustomId('help_cat_config').setLabel('Config').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
            new ButtonBuilder().setCustomId('help_cat_hosting').setLabel('Hosting').setStyle(ButtonStyle.Secondary).setEmoji('🖥️')
        );

    return { embed, navRow, categoryRow: categoryRow1, categoryRow2 };
}

function buildCategoryEmbed(categoryKey) {
    const cat = helpCategories[categoryKey];
    if (!cat) return null;
    
    const embed = new EmbedBuilder()
        .setColor(cat.color)
        .setTitle(`${cat.emoji} ${cat.name}`)
        .setDescription('Here are all commands in this category:')
        .addFields(
            cat.commands.map(cmd => ({
                name: cmd.name,
                value: `${cmd.description}\n\`Usage: ${cmd.usage}\``,
                inline: false
            }))
        )
        .setFooter({ text: 'This message is only visible to you' })
        .setTimestamp();

    return embed;
}

async function handleButtonInteraction(interaction, client) {
    const customId = interaction.customId;
    
    try {
        if (customId.startsWith('help_cat_')) {
            const categoryKey = customId.replace('help_cat_', '');
            const categoryEmbed = buildCategoryEmbed(categoryKey);
            
            if (categoryEmbed) {
                await interaction.reply({
                    embeds: [categoryEmbed],
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: 'Category not found!',
                    flags: MessageFlags.Ephemeral
                });
            }
            return;
        }

        if (customId.startsWith('help_nav_')) {
            const originalMessage = interaction.message;
            const originalUserId = originalMessage?.interaction?.user?.id;
            
            if (originalUserId && originalUserId !== interaction.user.id) {
                await interaction.reply({
                    content: 'You cannot use these buttons. Run `/help` to get your own help menu!',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const parts = customId.split('_');
            const action = parts[2];
            const currentPage = parseInt(parts[3]) || 0;
            
            let newPage = currentPage;
            if (action === 'prev' && currentPage > 0) {
                newPage = currentPage - 1;
            } else if (action === 'next' && currentPage < categoryKeys.length - 1) {
                newPage = currentPage + 1;
            } else if (action === 'home') {
                newPage = 0;
            }
            
            const { embed, navRow, categoryRow, categoryRow2 } = buildHelpPage(newPage, client);
            await interaction.update({ embeds: [embed], components: [navRow, categoryRow, categoryRow2] });
            return;
        }

        if (customId === 'ai_continue') {
            const modal = new ModalBuilder()
                .setCustomId('ai_continue_modal')
                .setTitle('Continue AI Conversation');
            
            const messageInput = new TextInputBuilder()
                .setCustomId('ai_message')
                .setLabel('Your Message')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Type your follow-up message here...')
                .setRequired(true)
                .setMaxLength(2000);
            
            const actionRow = new ActionRowBuilder().addComponents(messageInput);
            modal.addComponents(actionRow);
            
            await interaction.showModal(modal);
            return;
        }
        
        if (customId === 'ai_clear') {
            const conversationKey = `${interaction.guild.id}-${interaction.user.id}`;
            client.aiconversations.set(conversationKey, { messages: [], lastUsed: 0 });
            
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('Conversation Cleared')
                    .setDescription('Your AI conversation history has been cleared. Start a new conversation with `/ai chat`!')
                    .setFooter({ text: `Cleared by ${interaction.user.username}` })
                    .setTimestamp()
                ],
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Handle regular user verify button from verify panel
        if (customId === 'verify_button') {
            await handleUserVerifyButton(interaction, client);
            return;
        }

        // Handle verify_member button (mainconfig-based)
        if (customId === 'verify_member') {
            await handleMemberVerifyButton(interaction, client);
            return;
        }

        // Handle staff verification actions (approve/deny/stats/appeal)
        if (customId.startsWith('verify_approve_') || 
            customId.startsWith('verify_deny_') || 
            customId.startsWith('verify_stats_') ||
            customId.startsWith('verify_appeal_')) {
            await handleVerificationButton(interaction, client);
            return;
        }
        
        // Handle CreateBot buttons and control buttons
        if (customId.startsWith('createbot_') || customId.startsWith('manage_') || customId.startsWith('delete_') || customId.startsWith('control_')) {
            await handleCreateBotButton(interaction, client);
            return;
        }

        // Handle LOA approve/reject buttons
        if (customId.startsWith('loa_approve_') || customId.startsWith('loa_reject_')) {
            await handleLOAButton(interaction, client);
            return;
        }
        
    } catch (error) {
        console.error('[Button] Error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'An error occurred while processing your request.', 
                flags: MessageFlags.Ephemeral 
            }).catch(() => {});
        }
    }
}

async function handleSelectMenuInteraction(interaction, client) {
    const customId = interaction.customId;
    
    try {
        // Handle CreateBot select menus (templates, lists, edit menus)
        if (customId.startsWith('createbot_')) {
            await handleCreateBotSelectMenu(interaction, client);
            return;
        }
        
    } catch (error) {
        console.error('[SelectMenu] Error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'An error occurred while processing your selection.', 
                flags: MessageFlags.Ephemeral 
            }).catch(() => {});
        }
    }
}

async function handleVerificationButton(interaction, client) {
    const VerificationService = require('../verification/verificationService.js');
    const mainconfig = require('../../mainconfig.js');
    const verificationService = new VerificationService(client);

    if (!verificationService.hasStaffRole(interaction.member)) {
        return interaction.reply({
            content: '❌ You do not have permission to review verifications.',
            ephemeral: true
        });
    }

    const customId = interaction.customId;
    const parts = customId.split('_');
    const action = parts[1];
    const config = mainconfig.YouTubeVerification;

    if (action === 'approve') {
        const verificationId = parts[2];
        const userId = parts[3];

        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return interaction.reply({ content: '❌ User not found in server.', ephemeral: true });
        }

        let role = interaction.guild.roles.cache.get(config.CodeAccessRoleID);
        if (!role) {
            role = await interaction.guild.roles.fetch(config.CodeAccessRoleID).catch(() => null);
        }
        if (!role) {
            return interaction.reply({ content: '❌ Code Access role not found. Please configure it.', ephemeral: true });
        }

        try {
            await member.roles.add(role);
        } catch (e) {
            return interaction.reply({ content: '❌ Failed to add role. Check bot permissions.', ephemeral: true });
        }

        await verificationService.updateVerification(verificationId, 'approved', interaction.user.id, 'Approved by staff');

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Verification Approved')
            .setDescription(`**User:** <@${userId}>\n**Approved by:** <@${interaction.user.id}>`)
            .addFields({ name: '🎉 Role Added', value: role.name })
            .setTimestamp();

        await interaction.update({ embeds: [successEmbed], components: [] });

        try {
            await member.send({
                embeds: [new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 Verification Approved!')
                    .setDescription(`Congratulations! Your YouTube subscription verification has been approved.\n\nYou now have access to the **${role.name}** role!`)
                    .setFooter({ text: 'Thank you for subscribing!' })
                    .setTimestamp()
                ]
            });
        } catch (e) {}

    } else if (action === 'deny') {
        const verificationId = parts[2];
        const userId = parts[3];

        await verificationService.updateVerification(verificationId, 'denied', interaction.user.id, 'Denied by staff');

        const failedCount = verificationService.getFailedCount(userId);
        const canAppealNow = failedCount >= (config.MaxFailuresBeforeAppeal || 3);

        const denyEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Verification Denied')
            .setDescription(`**User:** <@${userId}>\n**Denied by:** <@${interaction.user.id}>`)
            .addFields(
                { name: '📊 Failed Attempts', value: failedCount.toString(), inline: true },
                { name: '📝 Can Appeal', value: canAppealNow ? 'Yes' : 'No', inline: true }
            )
            .setTimestamp();

        await interaction.update({ embeds: [denyEmbed], components: [] });

        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
            try {
                const appealInfo = canAppealNow ? '\n\nYou have reached the maximum failed attempts and can now use `/appeal` to submit an appeal.' : '';
                await member.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Verification Denied')
                        .setDescription(`Your YouTube subscription verification was denied.\n\nMake sure your screenshot clearly shows:\n• The channel name "**${config.ChannelName || 'deadloom'}**"\n• The "Subscribed" button${appealInfo}`)
                        .addFields({ name: '📊 Failed Attempts', value: `${failedCount}/${config.MaxFailuresBeforeAppeal || 3}` })
                        .setFooter({ text: 'You can try again after the cooldown period' })
                        .setTimestamp()
                    ]
                });
            } catch (e) {}
        }

    } else if (action === 'stats') {
        const userId = parts[2];
        const user = await client.users.fetch(userId).catch(() => null);
        const statsEmbed = verificationService.generateStatsEmbed(userId, user);
        await interaction.reply({ embeds: [statsEmbed], ephemeral: true });

    } else if (action === 'appeal') {
        const subAction = parts[2];
        const appealId = parts[3];
        const userId = parts[4];

        if (subAction === 'approve') {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) {
                return interaction.reply({ content: '❌ User not found in server.', ephemeral: true });
            }

            let role = interaction.guild.roles.cache.get(config.CodeAccessRoleID);
            if (!role) {
                role = await interaction.guild.roles.fetch(config.CodeAccessRoleID).catch(() => null);
            }
            if (!role) {
                return interaction.reply({ content: '❌ Code Access role not found.', ephemeral: true });
            }

            try {
                await member.roles.add(role);
            } catch (e) {
                return interaction.reply({ content: '❌ Failed to add role.', ephemeral: true });
            }

            await verificationService.updateAppeal(appealId, 'approved', interaction.user.id, 'Appeal approved by staff');

            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Appeal Approved')
                .setDescription(`**User:** <@${userId}>\n**Approved by:** <@${interaction.user.id}>`)
                .addFields({ name: '🎉 Role Added', value: role.name })
                .setTimestamp();

            await interaction.update({ embeds: [successEmbed], components: [] });

            try {
                await member.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🎉 Appeal Approved!')
                        .setDescription(`Your appeal has been approved! You now have access to the **${role.name}** role!`)
                        .setTimestamp()
                    ]
                });
            } catch (e) {}

        } else if (subAction === 'deny') {
            await verificationService.updateAppeal(appealId, 'denied', interaction.user.id, 'Appeal denied by staff');

            const denyEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Appeal Denied')
                .setDescription(`**User:** <@${userId}>\n**Denied by:** <@${interaction.user.id}>`)
                .setTimestamp();

            await interaction.update({ embeds: [denyEmbed], components: [] });

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member) {
                try {
                    await member.send({
                        embeds: [new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Appeal Denied')
                            .setDescription('Your appeal has been denied. Please ensure you are subscribed to the YouTube channel and try again later.')
                            .setTimestamp()
                        ]
                    });
                } catch (e) {}
            }
        }
    }
}

// Handle regular user clicking verify button on the verify panel
async function handleUserVerifyButton(interaction, client) {
    const settingsKey = `${interaction.guild.id}-verify`;
    const settings = client.serversettings?.get(settingsKey);
    
    if (!settings?.role) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Not Configured')
                .setDescription('Verification is not properly configured. Please contact an administrator.')
            ],
            ephemeral: true
        }).catch(() => {});
    }

    // Check if role exists
    const role = await interaction.guild.roles.fetch(settings.role).catch(() => null);
    if (!role) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Configuration Error')
                .setDescription('The verification role no longer exists. Please contact an administrator to reconfigure.')
            ],
            ephemeral: true
        }).catch(() => {});
    }

    if (interaction.member.roles.cache.has(settings.role)) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Already Verified')
                .setDescription('You are already verified!')
            ],
            ephemeral: true
        }).catch(() => {});
    }

    try {
        await interaction.member.roles.add(settings.role);
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Verified!')
                .setDescription('You have been verified! Welcome to the server.')
            ],
            ephemeral: true
        }).catch(() => {});
    } catch (e) {
        console.error('[Verify] Error adding role:', e);
        let errorMsg = 'Could not verify you. Please contact a staff member.';
        
        if (e.code === 50013) {
            errorMsg = 'Bot permission error: The bot\'s role must be positioned higher than the verification role. Please contact an administrator.';
        } else if (e.code === 404) {
            errorMsg = 'The verification role no longer exists.';
        }
        
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Error')
                .setDescription(errorMsg)
            ],
            ephemeral: true
        }).catch(() => {});
    }
}

// Handle verify_member button (mainconfig-based verification)
async function handleMemberVerifyButton(interaction, client) {
    const mainconfig = require('../../mainconfig.js');
    const roleId = mainconfig.MemberRoleID || mainconfig.ServerRoles?.MemberRoleId;
    
    if (!roleId) {
        return interaction.reply({
            content: '❌ Verification role not configured. Please contact an admin.',
            ephemeral: true
        }).catch(() => {});
    }
    
    // Check if role exists
    const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
        return interaction.reply({
            content: '❌ The verification role no longer exists. Please contact an admin.',
            ephemeral: true
        }).catch(() => {});
    }
    
    if (interaction.member.roles.cache.has(roleId)) {
        return interaction.reply({
            content: '✅ You are already verified!',
            ephemeral: true
        }).catch(() => {});
    }
    
    try {
        await interaction.member.roles.add(roleId);
        return interaction.reply({
            content: '✅ You have been verified! Welcome to the server.',
            ephemeral: true
        }).catch(() => {});
    } catch (e) {
        console.error('[Verify] Error adding role:', e);
        let errorMsg = '❌ Could not verify you. Please contact an admin.';
        
        if (e.code === 50013) {
            errorMsg = '❌ Bot permission error: The bot\'s role must be positioned higher than the verification role.';
        }
        
        return interaction.reply({
            content: errorMsg,
            ephemeral: true
        }).catch(() => {});
    }
}

async function handleModalSubmit(interaction, client) {
    const customId = interaction.customId;
    
    try {
        // Handle CreateBot modals (slash command)
        if (customId === 'createbot_name_modal') {
            await handleCreateBotModal(interaction, client);
            return;
        }
        
        // Handle CreateBot modals (prefix command)
        if (customId.startsWith('createbot_modal_')) {
            await handlePrefixCreateBotModal(interaction, client);
            return;
        }
        
        if (customId === 'ai_continue_modal') {
            await interaction.deferReply();
            
            const message = interaction.fields.getTextInputValue('ai_message');
            
            const conversationKey = `${interaction.guild.id}-${interaction.user.id}`;
            client.aiconversations.ensure(conversationKey, { messages: [], lastUsed: 0 });
            
            const conversation = client.aiconversations.get(conversationKey);
            
            if (Date.now() - conversation.lastUsed > 30 * 60 * 1000) {
                conversation.messages = [];
            }
            
            conversation.messages.push({ role: 'user', content: message });
            if (conversation.messages.length > 20) {
                conversation.messages = conversation.messages.slice(-20);
            }
            
            const systemPrompt = `You are an advanced AI assistant for a Discord server called "${interaction.guild.name}". 
You are helpful, friendly, and knowledgeable. You can help with:
- Server moderation advice
- Bot management questions
- General programming help
- Creative tasks and brainstorming
- Answering questions

Keep responses concise but helpful. Use Discord markdown formatting.
Current user: ${interaction.user.username}
Server member count: ${interaction.guild.memberCount}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversation.messages
            ];

            const result = await callGemini(messages, 1500);

            if (result.error) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('AI Error')
                        .setDescription(result.error)
                        .setFooter({ text: 'Contact the bot owner if this issue persists' })
                    ]
                });
            }

            conversation.messages.push({ role: 'assistant', content: result.content });
            conversation.lastUsed = Date.now();
            client.aiconversations.set(conversationKey, conversation);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: 'AI Assistant', iconURL: client.user.displayAvatarURL() })
                .setDescription(result.content.substring(0, 4000))
                .setFooter({ text: `Asked by ${interaction.user.username} • Conversation active for 30 mins` })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ai_continue')
                        .setLabel('Continue')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💬'),
                    new ButtonBuilder()
                        .setCustomId('ai_clear')
                        .setLabel('Clear History')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🗑️')
                );

            await interaction.editReply({ embeds: [embed], components: [row] });
            return;
        }
        
    } catch (error) {
        console.error('[Modal] Error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'An error occurred while processing your request.', 
                flags: MessageFlags.Ephemeral 
            }).catch(() => {});
        } else {
            await interaction.editReply({ 
                content: 'An error occurred while processing your request.'
            }).catch(() => {});
        }
    }
}

async function handlePrefixCreateBotModal(interaction, client) {
    const customId = interaction.customId;
    const templateId = customId.replace('createbot_modal_', '');
    
    const servicebotCatalog = require('./handlers/createBotHandler').getBotTemplates ? 
        require('../servicebotCatalog') : require('../servicebotCatalog');
    const remoteBotClient = require('../api/remoteBotClient');
    const fs = require('fs');
    const path = require('path');
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const botName = interaction.fields.getTextInputValue('bot_name').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const botToken = interaction.fields.getTextInputValue('bot_token').trim();
    const clientId = interaction.fields.getTextInputValue('client_id').trim();
    const prefix = interaction.fields.getTextInputValue('prefix')?.trim() || ',';
    const color = interaction.fields.getTextInputValue('color')?.trim() || '#5865F2';
    
    if (!botName || !botToken || !clientId) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription('Missing required fields. Bot Name, Token, and Client ID are required.')
            ]
        });
    }
    
    const template = servicebotCatalog.getTemplate(templateId);
    if (!template) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription('Template not found. Please try again.')
            ]
        });
    }
    
    if (!remoteBotClient.isConfigured()) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription('Secondary Replit not configured. Please set REMOTE_LOG_URL and REMOTE_LOG_API_KEY.')
            ]
        });
    }
    
    try {
        const isHealthy = await remoteBotClient.checkHealth();
        if (!isHealthy) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('Secondary hosting server is offline. Please try again later.')
                ]
            });
        }
    } catch (e) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`Failed to connect to secondary server: ${e.message}`)
            ]
        });
    }
    
    const progressEmbed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('🔧 Creating Your Bot...')
        .setDescription(`Deploying **${template.name}** as **${botName}**...`)
        .addFields({ name: 'Status', value: '⏳ Preparing files...', inline: false });
    
    await interaction.editReply({ embeds: [progressEmbed] });
    
    try {
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
                            files[relativePath] = fs.readFileSync(fullPath, 'utf8');
                        }
                    } catch (e) {
                        console.error(`Error reading file ${fullPath}:`, e.message);
                    }
                }
            }
            return files;
        }
        
        const templatePath = template.templatePath;
        if (!fs.existsSync(templatePath)) {
            throw new Error('Template files not found on server.');
        }
        
        const botFiles = readTemplateFilesRecursively(templatePath);
        
        const botConfig = {
            BOT_TOKEN: botToken,
            CLIENT_ID: clientId,
            OWNER_ID: interaction.user.id,
            PREFIX: prefix,
            GUILD_ID: interaction.guild?.id || '',
            STATUS: { text: `${prefix}help`, type: 'PLAYING' },
            EMBED: { color: color, footerText: 'Powered by Bot Hosting', footerIcon: '' }
        };
        
        botFiles['botconfig/config.json'] = JSON.stringify(botConfig, null, 2);
        
        const deployResult = await remoteBotClient.deployBot(botName, templateId, botFiles, botConfig);
        
        if (!deployResult || !deployResult.success) {
            throw new Error(deployResult?.error || 'Deploy failed');
        }
        
        const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Bot Created Successfully!')
            .setDescription(`Your **${template.name}** is now ready!`)
            .addFields(
                { name: 'Bot Name', value: botName, inline: true },
                { name: 'Template', value: template.name, inline: true },
                { name: 'Location', value: '🌐 Secondary Server', inline: true },
                { name: 'Prefix', value: prefix, inline: true },
                { name: 'Invite', value: `[Click Here](https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=8)`, inline: true }
            )
            .setFooter({ text: 'Use /createbot list to view your bots' });
        
        if (client.bots) {
            client.bots.ensure(interaction.user.id, { bots: [] });
            client.bots.push(interaction.user.id, clientId, 'bots');
            client.bots.set(clientId, templateId, 'type');
            client.bots.set(clientId, botName, 'name');
            client.bots.set(clientId, 'secondary', 'location');
            client.bots.set(clientId, new Date().toISOString(), 'createdAt');
        }
        
        await interaction.editReply({ embeds: [successEmbed] });
        
    } catch (error) {
        console.error('[PrefixCreateBot] Error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Bot Creation Failed')
            .setDescription(`An error occurred while creating your bot.\n\n**Error:** ${error.message}`)
            .setFooter({ text: 'Please try again or contact support' });
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleLOAButton(interaction, client) {
    const customId = interaction.customId;
    const requestId = customId.replace(/^loa_(approve|reject)_/, '');
    const isApprove = customId.startsWith('loa_approve_');
    
    try {
        // Check if user has permission to approve/deny LOA
        const hasPermission = interaction.member.permissions.has('ADMINISTRATOR') ||
            [mainconfig.ServerRoles?.FounderId, mainconfig.ServerRoles?.OwnerRoleId, 
             mainconfig.ServerRoles?.CoOwnerRoleId, mainconfig.ServerRoles?.AdminRoleId,
             mainconfig.ServerRoles?.ChiefHumanResources].some(roleId => 
                roleId && interaction.member.roles.cache.has(roleId)
            );
        
        if (!hasPermission) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ You do not have permission to approve or reject LOA requests.')
                ],
                ephemeral: true
            });
        }

        const LOAService = require('../staff/loaService.js');
        const loaService = new LOAService(client);
        const request = client.loa.get(requestId);

        if (!request) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Request not found or already processed.')
                ],
                ephemeral: true
            });
        }

        if (isApprove) {
            const result = await loaService.approveRequest(requestId, interaction.user.id, interaction.guild);
            
            if (!result.success) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ Approval Failed')
                        .setDescription(result.error)
                    ],
                    ephemeral: true
                });
            }

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('✅ LOA Approved!')
                    .setDescription(`<@${request.userId}>'s **${request.typeName}** LOA has been **approved**!\n\nThey will return on **${moment(request.endDate).format('MMMM Do, YYYY')}** (${moment(request.endDate).fromNow()})`)
                    .addFields({ name: '📋 Request ID', value: `\`${requestId}\`` })
                    .setFooter({ text: `Approved by ${interaction.user.username}` })
                    .setTimestamp()
                ],
                ephemeral: true
            });

            // Update the original notification message
            try {
                const approveBtn = new ButtonBuilder()
                    .setCustomId('loa_approve_done')
                    .setLabel('✅ Approved')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true);

                const rejectBtn = new ButtonBuilder()
                    .setCustomId('loa_reject_done')
                    .setLabel('❌ Reject')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true);

                await interaction.message.edit({ components: [new ActionRowBuilder().addComponents(approveBtn, rejectBtn)] });
            } catch (e) {}

        } else {
            // Reject
            const rejectReason = 'Rejected via channel button';
            const result = await loaService.denyRequest(requestId, interaction.user.id, rejectReason);

            if (!result.success) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ Rejection Failed')
                        .setDescription(result.error)
                    ],
                    ephemeral: true
                });
            }

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ LOA Rejected')
                    .setDescription(`<@${request.userId}>'s **${request.typeName}** LOA has been **rejected**.\n\nThey have been notified.`)
                    .addFields({ name: '📋 Request ID', value: `\`${requestId}\`` })
                    .setFooter({ text: `Rejected by ${interaction.user.username}` })
                    .setTimestamp()
                ],
                ephemeral: true
            });

            // Update the original notification message
            try {
                const approveBtn = new ButtonBuilder()
                    .setCustomId('loa_approve_done')
                    .setLabel('✅ Approve')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true);

                const rejectBtn = new ButtonBuilder()
                    .setCustomId('loa_reject_done')
                    .setLabel('❌ Rejected')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true);

                await interaction.message.edit({ components: [new ActionRowBuilder().addComponents(approveBtn, rejectBtn)] });
            } catch (e) {}
        }
    } catch (error) {
        console.error('[LOAButton] Error:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ An error occurred processing this request.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}

// Setup Command Handlers
async function handleSetupPrices(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription('❌ You need Administrator permissions')],
            ephemeral: true
        });
    }

    const { EmbedBuilder: EB, ActionRowBuilder: ARB, ButtonBuilder: BB, ButtonStyle: BS } = require('discord.js');
    const embed = new EB()
        .setColor('#5865F2')
        .setAuthor({ name: 'DeadLoom Bot Services', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('💰 Pricing Information')
        .setDescription('Choose a pricing plan that works for you!')
        .addFields(
            { name: '🚀 Starter', value: '```\n• Basic Bot Hosting\n• 1 Bot Instance\n• 24/7 Uptime\n• Email Support\n\n$4.99/month```', inline: true },
            { name: '⭐ Premium', value: '```\n• Advanced Features\n• 5 Bot Instances\n• Priority Support\n• Custom Branding\n\n$9.99/month```', inline: true },
            { name: '👑 Elite', value: '```\n• Unlimited Bots\n• Priority Support\n• Custom Features\n• Dedicated Server\n\n$24.99/month```', inline: true },
            { name: '📌 Special Offers', value: '• Annual Plan: 20% OFF\n• Lifetime: One-time $199\n• Refer Friends: Get Credits', inline: false }
        )
        .setFooter({ text: 'Click the buttons below to learn more or purchase', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    const row = new ARB().addComponents(
        new BB().setCustomId('pricing_contact').setLabel('Contact Sales').setStyle(BS.Primary).setEmoji('💬'),
        new BB().setCustomId('pricing_purchase').setLabel('Purchase Now').setStyle(BS.Success).setEmoji('✅')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleSetupRolePick(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ You need Administrator permissions')], ephemeral: true });
    }

    const { RoleSelectMenuBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'DeadLoom - Role Selection', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('👥 Choose Your Roles')
        .setDescription('Select roles to customize your experience!\n\n**Categories:** Gaming • Creative • Tech • Music • Interests\n\nClick the dropdown to select multiple roles!')
        .setFooter({ text: 'You can select up to 5 roles', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    const roleRow = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('role_pick_menu').setPlaceholder('Click to select roles').setMinValues(0).setMaxValues(5)
    );

    await interaction.reply({ embeds: [embed], components: [roleRow] });
}

async function handleSetupRules(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ You need Administrator permissions')], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'DeadLoom Server Rules', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('📋 Server Rules & Guidelines')
        .setDescription('Please read and follow these rules to maintain a positive community!')
        .addFields(
            { name: '1️⃣ Be Respectful', value: '• Treat all members with respect\n• No harassment, bullying, or hate speech\n• No discrimination of any kind', inline: false },
            { name: '2️⃣ Keep It Clean', value: '• No NSFW content in general channels\n• No excessive swearing\n• Keep discussions appropriate', inline: false },
            { name: '3️⃣ No Spam', value: '• No repeated messages\n• No unsolicited promotions\n• No excessive mentions', inline: false },
            { name: '4️⃣ Follow Discord ToS', value: '• Obey Discord Terms of Service\n• No illegal content\n• No account trading or selling', inline: false },
            { name: '5️⃣ Respect Staff', value: '• Listen to moderators\n• No arguing with staff decisions\n• Appeals can be made in DMs', inline: false }
        )
        .setFooter({ text: 'Last updated', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rules_accept').setLabel('I Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('rules_appeal').setLabel('Appeal Ban').setStyle(ButtonStyle.Secondary).setEmoji('📧')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleSetupSuggestion(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ You need Administrator permissions')], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setAuthor({ name: 'DeadLoom Suggestions', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('💡 Community Suggestions')
        .setDescription('Have an idea to improve our server?\n\n**Share Your Thoughts:**\n• Feature requests\n• Event ideas\n• Server improvements\n• General feedback\n\nClick the button below to submit a suggestion!')
        .addFields(
            { name: '📊 How It Works', value: '1. Click "Submit Suggestion"\n2. Fill in your idea\n3. Community votes with reactions\n4. Top suggestions get reviewed by staff', inline: false },
            { name: '✨ Best Suggestions', value: 'May be implemented in future updates!', inline: false }
        )
        .setFooter({ text: 'Your feedback matters!', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('suggest_submit').setLabel('Submit Suggestion').setStyle(ButtonStyle.Primary).setEmoji('💡')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleSetupCodeEmbed(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ You need Administrator permissions')], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setAuthor({ name: 'DeadLoom Code Sharing', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('💻 Share Your Code')
        .setDescription('Share code snippets, scripts, and projects with the community!\n\n**Supported Languages:**\n```\nJavaScript • Python • Java • C++ • C#\nRust • Go • PHP • HTML/CSS • SQL\n```\n\nAll shared code is stored securely and can be reviewed by the community.')
        .addFields(
            { name: '🎯 Features', value: '• Syntax Highlighting\n• Secure Storage\n• Easy Sharing\n• Community Reviews', inline: true },
            { name: '📋 Rules', value: '• No malicious code\n• No API keys/secrets\n• Credit original authors\n• Be helpful!', inline: true }
        )
        .setFooter({ text: 'Share knowledge, help others', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('code_upload').setLabel('Upload Code').setStyle(ButtonStyle.Primary).setEmoji('📤'),
        new ButtonBuilder().setCustomId('code_browse').setLabel('Browse Codes').setStyle(ButtonStyle.Secondary).setEmoji('📚')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// Info Command Handlers
async function handleInfoRules(interaction) {
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

async function handleInfoPrices(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({ name: 'DeadLoom Pricing', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('💰 Our Pricing Plans')
        .addFields(
            { name: '🚀 Starter - $4.99/month', value: '• Basic Bot Hosting\n• 1 Bot Instance\n• 24/7 Uptime\n• Email Support' },
            { name: '⭐ Premium - $9.99/month', value: '• Advanced Features\n• 5 Bot Instances\n• Priority Support\n• Custom Branding' },
            { name: '👑 Elite - $24.99/month', value: '• Unlimited Bots\n• Priority Support\n• Custom Features\n• Dedicated Server' },
            { name: '💎 Special Offers', value: '• Annual Plan: 20% OFF\n• Lifetime: $199 (One-time)\n• Referral Credits Available' }
        )
        .setFooter({ text: 'Contact sales for custom packages', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleInfoFeatures(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setAuthor({ name: 'DeadLoom Features', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('✨ Our Features')
        .addFields(
            { name: '🤖 Advanced Bot Hosting', value: '24/7 uptime with automatic backups and recovery' },
            { name: '🎯 Custom Features', value: 'Build and deploy custom features for your bots' },
            { name: '📊 Analytics Dashboard', value: 'Track bot performance and member interactions' },
            { name: '🔐 Security', value: 'Enterprise-grade security and data protection' },
            { name: '💬 Support', value: 'Priority 24/7 support from our expert team' },
            { name: '🚀 Scalability', value: 'Grow your bots without limits' }
        )
        .setFooter({ text: 'Join hundreds of servers using DeadLoom', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleInfoFAQ(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setAuthor({ name: 'DeadLoom FAQ', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('❓ Frequently Asked Questions')
        .addFields(
            { name: 'Q: How long does bot setup take?', value: 'A: Usually 15-30 minutes depending on customization' },
            { name: 'Q: What if I need to cancel?', value: 'A: Cancel anytime with full refund within 7 days' },
            { name: 'Q: Do you offer refunds?', value: 'A: Yes! 7-day money-back guarantee on all plans' },
            { name: 'Q: Can I upgrade my plan?', value: 'A: Yes, upgrade or downgrade anytime' },
            { name: 'Q: What hosting locations do you have?', value: 'A: US, EU, and ASIA servers available' },
            { name: 'Q: Do you provide support?', value: 'A: Yes! Email, Discord, and phone support available' }
        )
        .setFooter({ text: 'Have more questions? Contact support!', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleInfoAbout(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setAuthor({ name: 'About DeadLoom', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('👑 DeadLoom Bot Services')
        .setDescription('**Your Ultimate Discord Bot Hosting Solution**\n\nDeadLoom provides premium bot hosting, custom bot development, and professional Discord solutions for communities of all sizes.')
        .addFields(
            { name: '🎯 Our Mission', value: 'Empower Discord communities with cutting-edge bot hosting and custom development services' },
            { name: '📈 By The Numbers', value: '• 500+ Hosted Bots\n• 10,000+ Active Users\n• 99.9% Uptime\n• 24/7 Support' },
            { name: '🏆 Why Choose Us?', value: '• Custom Coded Bots\n• Blazing Fast Servers\n• Expert Support Team\n• Affordable Pricing' },
            { name: '📞 Contact', value: 'Discord: Open a ticket\nEmail: support@deadloom.dev\nWebsite: deadloom.dev' }
        )
        .setFooter({ text: 'Trusted by Discord communities worldwide', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handleInteraction, addXP, trackStaffAction, checkLevelRoles, calculateLevel };
