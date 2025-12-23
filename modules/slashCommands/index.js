const Discord = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const SlashCommandBuilder = Discord.SlashCommandBuilder || require('@discordjs/builders').SlashCommandBuilder;
const PermissionFlagsBits = Discord.PermissionFlagsBits || Discord.Permissions?.FLAGS;
const fs = require('fs');
const path = require('path');

const slashCommands = [];

// Welcome System Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Advanced welcome system configuration')
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Setup the welcome system')
            .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').setRequired(true))
            .addRoleOption(opt => opt.setName('autorole').setDescription('Auto-assign role on join').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('message')
            .setDescription('Set custom welcome message')
            .addStringOption(opt => opt.setName('text').setDescription('Welcome message ({user}, {server}, {count})').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('embed')
            .setDescription('Configure welcome embed')
            .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(true))
            .addStringOption(opt => opt.setName('description').setDescription('Embed description').setRequired(true))
            .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g., #5865F2)').setRequired(false))
            .addStringOption(opt => opt.setName('thumbnail').setDescription('Thumbnail URL or {avatar}').setRequired(false))
            .addStringOption(opt => opt.setName('image').setDescription('Image URL').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('dm')
            .setDescription('Enable/disable DM welcome')
            .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable DM welcome').setRequired(true))
            .addStringOption(opt => opt.setName('message').setDescription('DM message').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('test')
            .setDescription('Test the welcome message'))
        .addSubcommand(sub => sub
            .setName('disable')
            .setDescription('Disable the welcome system'))
        .addSubcommand(sub => sub
            .setName('reset')
            .setDescription('Reset welcome message to default'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

// Goodbye System Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('goodbye')
        .setDescription('Configure goodbye messages')
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Setup goodbye channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Goodbye channel').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('message')
            .setDescription('Set goodbye message')
            .addStringOption(opt => opt.setName('text').setDescription('Goodbye message ({user}, {server})').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('disable')
            .setDescription('Disable goodbye messages'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

// Leveling System Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('level')
        .setDescription('View your level and XP')
        .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View server leaderboards')
        .addStringOption(opt => opt
            .setName('type')
            .setDescription('Leaderboard type')
            .setRequired(false)
            .addChoices(
                { name: 'XP Levels', value: 'xp' },
                { name: 'Staff Points', value: 'staff' },
                { name: 'Messages', value: 'messages' }
            ))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Manage user XP')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add XP to a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('XP amount').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove XP from a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('XP amount').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('set')
            .setDescription('Set user XP')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('XP amount').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('reset')
            .setDescription('Reset user XP')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('levelroles')
        .setDescription('Configure level role rewards')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add a level role reward')
            .addIntegerOption(opt => opt.setName('level').setDescription('Level requirement').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a level role reward')
            .addIntegerOption(opt => opt.setName('level').setDescription('Level to remove').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List all level role rewards'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

// Staff Competition Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Staff management and competition')
        .addSubcommand(sub => sub
            .setName('points')
            .setDescription('Add points to a staff member')
            .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('Points to add').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for points').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('stats')
            .setDescription('View staff statistics')
            .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('leaderboard')
            .setDescription('Staff competition leaderboard')
            .addStringOption(opt => opt
                .setName('period')
                .setDescription('Time period')
                .addChoices(
                    { name: 'Daily', value: 'daily' },
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Monthly', value: 'monthly' },
                    { name: 'All Time', value: 'alltime' }
                )))
        .addSubcommand(sub => sub
            .setName('badges')
            .setDescription('View staff badges')
            .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('competition')
        .setDescription('Manage staff competitions')
        .addSubcommand(sub => sub
            .setName('create')
            .setDescription('Create a new competition')
            .addStringOption(opt => opt.setName('name').setDescription('Competition name').setRequired(true))
            .addStringOption(opt => opt
                .setName('type')
                .setDescription('Competition type')
                .setRequired(true)
                .addChoices(
                    { name: 'Most Tickets Closed', value: 'tickets' },
                    { name: 'Most Warnings Issued', value: 'warnings' },
                    { name: 'Most Messages', value: 'messages' },
                    { name: 'Most Points', value: 'points' },
                    { name: 'Most Bots Created', value: 'bots' }
                ))
            .addStringOption(opt => opt.setName('duration').setDescription('Duration (1d, 1w, 1m)').setRequired(true))
            .addStringOption(opt => opt.setName('prize').setDescription('Prize description').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('end')
            .setDescription('End a competition')
            .addStringOption(opt => opt.setName('name').setDescription('Competition name').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List active competitions'))
        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('View competition status')
            .addStringOption(opt => opt.setName('name').setDescription('Competition name').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

// AI Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Advanced AI assistant commands')
        .addSubcommand(sub => sub
            .setName('chat')
            .setDescription('Chat with the AI assistant')
            .addStringOption(opt => opt.setName('message').setDescription('Your message').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('code')
            .setDescription('Get AI code review or help')
            .addStringOption(opt => opt.setName('code').setDescription('Code to review').setRequired(true))
            .addStringOption(opt => opt.setName('language').setDescription('Programming language').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('translate')
            .setDescription('Translate text')
            .addStringOption(opt => opt.setName('text').setDescription('Text to translate').setRequired(true))
            .addStringOption(opt => opt
                .setName('language')
                .setDescription('Target language')
                .setRequired(true)
                .addChoices(
                    { name: 'English', value: 'en' },
                    { name: 'Spanish', value: 'es' },
                    { name: 'French', value: 'fr' },
                    { name: 'German', value: 'de' },
                    { name: 'Chinese', value: 'zh' },
                    { name: 'Japanese', value: 'ja' },
                    { name: 'Korean', value: 'ko' },
                    { name: 'Arabic', value: 'ar' },
                    { name: 'Hindi', value: 'hi' },
                    { name: 'Portuguese', value: 'pt' }
                )))
        .addSubcommand(sub => sub
            .setName('summarize')
            .setDescription('Summarize text or channel')
            .addStringOption(opt => opt.setName('text').setDescription('Text to summarize').setRequired(false))
            .addIntegerOption(opt => opt.setName('messages').setDescription('Number of messages to summarize from channel').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('advisor')
            .setDescription('Get moderation advice')
            .addStringOption(opt => opt.setName('situation').setDescription('Describe the situation').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('image')
            .setDescription('Analyze an image')
            .addStringOption(opt => opt.setName('url').setDescription('Image URL').setRequired(true))
            .addStringOption(opt => opt.setName('question').setDescription('Question about the image').setRequired(false)))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('aiquiz')
        .setDescription('Start an AI-generated quiz')
        .addStringOption(opt => opt
            .setName('topic')
            .setDescription('Quiz topic')
            .setRequired(false))
        .addStringOption(opt => opt
            .setName('difficulty')
            .setDescription('Quiz difficulty')
            .setRequired(false)
            .addChoices(
                { name: 'Easy', value: 'easy' },
                { name: 'Medium', value: 'medium' },
                { name: 'Hard', value: 'hard' }
            ))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('personality')
        .setDescription('Configure AI personality')
        .addStringOption(opt => opt
            .setName('style')
            .setDescription('AI personality style')
            .setRequired(true)
            .addChoices(
                { name: 'Professional', value: 'professional' },
                { name: 'Friendly', value: 'friendly' },
                { name: 'Funny', value: 'funny' },
                { name: 'Serious', value: 'serious' },
                { name: 'Helpful', value: 'helpful' }
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

// Moderation Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Warning reason').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Kick reason').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Ban reason').setRequired(false))
        .addStringOption(opt => opt.setName('duration').setDescription('Ban duration (1d, 1w, permanent)').setRequired(false))
        .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of messages to delete (0-7)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user')
        .addStringOption(opt => opt.setName('user_id').setDescription('User ID to unban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Unban reason').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to timeout').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Timeout duration (1m, 1h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Timeout reason').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set channel slowmode')
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Slowmode in seconds (0 to disable)').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages')
        .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true))
        .addUserOption(opt => opt.setName('user').setDescription('Only delete messages from this user').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock a channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to lock').setRequired(false))
        .addStringOption(opt => opt.setName('reason').setDescription('Lock reason').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to unlock').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('history')
        .setDescription('View moderation history of a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON()
);

// CreateBot Commands - Advanced Bot Creation & Management System
slashCommands.push(
    new SlashCommandBuilder()
        .setName('createbot')
        .setDescription('Complete bot creation and management system')
        // Bot Creation & Setup
        .addSubcommand(sub => sub
            .setName('new')
            .setDescription('Create a new bot with interactive wizard'))
        .addSubcommand(sub => sub
            .setName('quick')
            .setDescription('Quick setup - create bot with default settings'))
        .addSubcommand(sub => sub
            .setName('templates')
            .setDescription('View all available bot templates with details'))
        // Bot Management
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List all your created bots with status'))
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('View detailed bot information')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('edit')
            .setDescription('Edit bot configuration (name, prefix, color, settings)')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('settings')
            .setDescription('Configure bot-specific settings')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('features')
            .setDescription('Enable/disable bot features')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('advanced')
            .setDescription('Advanced options (permissions, roles, channels)')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(true)))
        // Bot Control
        .addSubcommand(sub => sub
            .setName('control')
            .setDescription('Control bot (start/stop/restart/logs)')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('View bot status and system health')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID (optional)').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('logs')
            .setDescription('View bot logs and error history')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(true)))
        // Configuration Management
        .addSubcommand(sub => sub
            .setName('export')
            .setDescription('Export bot configuration to file')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('import')
            .setDescription('Import bot configuration from file')
            .addAttachmentOption(opt => opt.setName('config_file').setDescription('Configuration file').setRequired(true)))
        // Bot Deletion
        .addSubcommand(sub => sub
            .setName('delete')
            .setDescription('Permanently delete a bot')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID').setRequired(true)))
        // Analytics & Info
        .addSubcommand(sub => sub
            .setName('analytics')
            .setDescription('View bot usage analytics and statistics')
            .addStringOption(opt => opt.setName('bot_id').setDescription('Bot ID (optional)').setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

// Advanced Help Command
slashCommands.push(
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all commands and bot information')
        .addStringOption(opt => opt
            .setName('category')
            .setDescription('Command category to view')
            .setRequired(false)
            .addChoices(
                { name: '🛡️ Moderation', value: 'moderation' },
                { name: '📈 Leveling', value: 'leveling' },
                { name: '🤖 AI', value: 'ai' },
                { name: '👋 Welcome', value: 'welcome' },
                { name: '🏆 Staff', value: 'staff' },
                { name: '⚙️ Config', value: 'config' },
                { name: '🤖 CreateBot', value: 'createbot' },
                { name: '📋 All Commands', value: 'all' }
            ))
        .addStringOption(opt => opt
            .setName('command')
            .setDescription('Get detailed help for a specific command')
            .setRequired(false))
        .toJSON()
);

// YouTube Verification Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Submit a YouTube subscription verification screenshot')
        .addAttachmentOption(opt => opt
            .setName('screenshot')
            .setDescription('Screenshot showing you are subscribed to the YouTube channel')
            .setRequired(false))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('appeal')
        .setDescription('Appeal your failed verification attempts')
        .addStringOption(opt => opt
            .setName('reason')
            .setDescription('Reason for your appeal')
            .setRequired(true))
        .addAttachmentOption(opt => opt
            .setName('screenshot')
            .setDescription('New screenshot showing your subscription')
            .setRequired(true))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('verifyhistory')
        .setDescription('View verification history (Staff only)')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('View specific user history')
            .setRequired(false))
        .addStringOption(opt => opt
            .setName('type')
            .setDescription('Filter history type')
            .setRequired(false)
            .addChoices(
                { name: 'All Verifications', value: 'all' },
                { name: 'Pending Only', value: 'pending' },
                { name: 'Pending Appeals', value: 'appeals' }
            ))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('verifymanage')
        .setDescription('Manage verifications (Staff only)')
        .addSubcommand(sub => sub
            .setName('approve')
            .setDescription('Manually approve a user')
            .addUserOption(opt => opt.setName('user').setDescription('User to verify').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('revoke')
            .setDescription('Revoke a users verification')
            .addUserOption(opt => opt.setName('user').setDescription('User to revoke').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('stats')
            .setDescription('View verification system statistics'))
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('verifysetup')
        .setDescription('Setup the verification system (Admin only)')
        .addChannelOption(opt => opt
            .setName('channel')
            .setDescription('Channel where users submit screenshots')
            .setRequired(true))
        .addRoleOption(opt => opt
            .setName('role')
            .setDescription('Role to give verified users (Code Access)')
            .setRequired(true))
        .addChannelOption(opt => opt
            .setName('log_channel')
            .setDescription('Channel for staff to review verifications')
            .setRequired(true))
        .addStringOption(opt => opt
            .setName('youtube_channel')
            .setDescription('YouTube channel name to verify (default: deadloom)')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('verifyembed')
        .setDescription('Send the verification instructions embed (Admin only)')
        .addStringOption(opt => opt
            .setName('youtube_link')
            .setDescription('YouTube channel link to include in the embed')
            .setRequired(true))
        .addChannelOption(opt => opt
            .setName('code_channel')
            .setDescription('The channel users will get access to after verification')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

// Server Config Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('config')
        .setDescription('Server configuration')
        .addSubcommand(sub => sub
            .setName('modlog')
            .setDescription('Set moderation log channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('levelup')
            .setDescription('Configure level up notifications')
            .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable level up messages').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Level up channel (leave empty for current)').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('xpmultiplier')
            .setDescription('Set XP multiplier for the server')
            .addNumberOption(opt => opt.setName('multiplier').setDescription('XP multiplier (0.5-3.0)').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('View current server configuration'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

// Hosting Service Commands
slashCommands.push(
    new SlashCommandBuilder()
        .setName('hosting-status')
        .setDescription('Check the status of the hosting service')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('hosting-restart')
        .setDescription('Restart the hosting service')
        .addBooleanOption(opt => opt
            .setName('graceful')
            .setDescription('Gracefully stop bots before restart?')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('hosting-health')
        .setDescription('Quick health check of hosting service')
        .toJSON()
);

// Setup Commands - DeadLoom
slashCommands.push(
    new SlashCommandBuilder()
        .setName('setup-prices')
        .setDescription('Setup the pricing panel for bot services')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('setup-rolepick')
        .setDescription('Setup self-assignable role picking panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('setup-rules')
        .setDescription('Setup server rules panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('setup-suggestion')
        .setDescription('Setup server suggestion system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('setup-codesembed')
        .setDescription('Setup code sharing system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

// Info Commands - DeadLoom
slashCommands.push(
    new SlashCommandBuilder()
        .setName('rules')
        .setDescription('View server rules and guidelines')
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('prices')
        .setDescription('View DeadLoom pricing plans')
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('features')
        .setDescription('View DeadLoom features')
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Frequently asked questions')
        .toJSON()
);

slashCommands.push(
    new SlashCommandBuilder()
        .setName('about')
        .setDescription('Learn about DeadLoom')
        .toJSON()
);

async function registerCommands(client) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || client.config?.token);
    const mainconfig = require('../../mainconfig.js');
    const guildId = mainconfig.ServerID;
    
    try {
        console.log('[SlashCommands] Registering slash commands...');
        
        if (guildId) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: slashCommands }
            );
            console.log(`[SlashCommands] Successfully registered ${slashCommands.length} slash commands to guild ${guildId}!`);
        } else {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: slashCommands }
            );
            console.log(`[SlashCommands] Successfully registered ${slashCommands.length} slash commands globally!`);
        }
    } catch (error) {
        console.error('[SlashCommands] Error registering commands:', error);
    }
}

module.exports = { registerCommands, slashCommands };
