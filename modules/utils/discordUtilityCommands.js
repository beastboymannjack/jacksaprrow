/**
 * Comprehensive list of Discord utility commands that can be added to bots
 * These are ready-to-implement utility features across various categories
 */

const DISCORD_UTILITY_COMMANDS = {
    // ========== SERVER INFO & ANALYTICS ==========
    serverinfo: {
        name: 'serverinfo',
        category: 'Server Info',
        description: 'Display detailed server information',
        features: [
            'Member count & roles',
            'Server creation date',
            'Boost level & count',
            'Owner information',
            'Server icon & banner',
            'Channels count (text/voice/categories)',
            'Emojis & sticker count',
            'Server age & uptime'
        ]
    },
    
    memberinfo: {
        name: 'memberinfo',
        category: 'Server Info',
        description: 'Get detailed member profile information',
        features: [
            'Join date',
            'Account creation date',
            'Roles list',
            'Last activity',
            'Permissions list',
            'Avatar history',
            'Username history',
            'Status (online/idle/dnd/offline)'
        ]
    },

    roleinfo: {
        name: 'roleinfo',
        category: 'Server Info',
        description: 'Display detailed role information',
        features: [
            'Role members count',
            'Color & permissions',
            'Role creation date',
            'Position hierarchy',
            'Mentionable status',
            'Hoisted status',
            'Role icon',
            'Integration info'
        ]
    },

    channelinfo: {
        name: 'channelinfo',
        category: 'Server Info',
        description: 'Get channel details and statistics',
        features: [
            'Channel type (text/voice/forum)',
            'Topic & description',
            'Creation date',
            'Message count',
            'Permissions overview',
            'Slowmode settings',
            'NSFW status',
            'Category parent'
        ]
    },

    // ========== USER UTILITIES ==========
    userinfo: {
        name: 'userinfo',
        category: 'User Utilities',
        description: 'Display comprehensive user information',
        features: [
            'Discord ID & tag',
            'Account age',
            'Creation date',
            'Avatar with history',
            'Badges & nitro status',
            'Bot status',
            'Public profile info',
            'Mutual servers count'
        ]
    },

    whois: {
        name: 'whois',
        category: 'User Utilities',
        description: 'Quick user lookup command',
        features: [
            'User identification',
            'Username & discriminator',
            'Status & game',
            'Profile picture',
            'Account age indicator'
        ]
    },

    avatar: {
        name: 'avatar',
        category: 'User Utilities',
        description: 'View user avatar in high quality',
        features: [
            'Avatar display options (256px, 512px, 1024px)',
            'Server-specific avatar',
            'Avatar history',
            'Avatar download link',
            'Animation detection'
        ]
    },

    banner: {
        name: 'banner',
        category: 'User Utilities',
        description: 'View user profile banner',
        features: [
            'High-quality banner display',
            'Download link',
            'Banner history',
            'Color palette extraction'
        ]
    },

    // ========== INVITE & LINK UTILITIES ==========
    inviteinfo: {
        name: 'inviteinfo',
        category: 'Invite Utilities',
        description: 'Get detailed invite link information',
        features: [
            'Server ID & name',
            'Inviter information',
            'Uses count',
            'Max uses & age',
            'Temporary status',
            'Channel information',
            'Invite creation date',
            'Auto-fetch from messages'
        ]
    },

    serverid: {
        name: 'serverid',
        category: 'Invite Utilities',
        description: 'Extract server ID from invite link (Deadloom feature)',
        features: [
            'Auto-detect Discord invites',
            'Fetch guild ID from code',
            'Server name display',
            'Icon & member count',
            'Inviter details',
            'Batch process multiple invites',
            'Link validation'
        ]
    },

    invites: {
        name: 'invites',
        category: 'Invite Utilities',
        description: 'List all server invites',
        features: [
            'Show all active invites',
            'Created by filter',
            'Expiration display',
            'Usage statistics',
            'Invite code formatting'
        ]
    },

    createinvite: {
        name: 'createinvite',
        category: 'Invite Utilities',
        description: 'Generate custom invite links',
        features: [
            'Max uses setting',
            'Expiration time options',
            'Temporary member join option',
            'Specific channel invite',
            'QR code generation'
        ]
    },

    // ========== TIME & TIMEZONE ==========
    time: {
        name: 'time',
        category: 'Time Utilities',
        description: 'Display user time with timezone',
        features: [
            'Multiple timezone support',
            'Discord timestamp conversion',
            'Time format options (12h/24h)',
            'UTC offset display',
            'Timezone database integration'
        ]
    },

    remind: {
        name: 'remind',
        category: 'Time Utilities',
        description: 'Set reminders & notifications',
        features: [
            'Custom reminder messages',
            'Time duration parsing',
            'Recurring reminders',
            'Channel/DM delivery',
            'Reminder management',
            'Timezone-aware scheduling'
        ]
    },

    // ========== EMOJI & REACTION ==========
    emojiinfo: {
        name: 'emojiinfo',
        category: 'Emoji Utilities',
        description: 'Get emoji information & details',
        features: [
            'Emoji ID & name',
            'Creator information',
            'Animated status',
            'Usage count',
            'Emoji history',
            'Nitro requirement info',
            'Large emoji display'
        ]
    },

    addemoji: {
        name: 'addemoji',
        category: 'Emoji Utilities',
        description: 'Add emoji from external sources',
        features: [
            'Upload custom emojis',
            'URL-based emoji import',
            'Bulk emoji upload',
            'Name validation',
            'Server emoji limit check'
        ]
    },

    // ========== PERMISSIONS & ROLES ==========
    permissions: {
        name: 'permissions',
        category: 'Permission Utilities',
        description: 'Check user permissions',
        features: [
            'List all permissions',
            'Permission overlap detection',
            'Role-based permissions',
            'Channel-specific permissions',
            'Permission explanation'
        ]
    },

    checkpermission: {
        name: 'checkpermission',
        category: 'Permission Utilities',
        description: 'Verify specific permissions',
        features: [
            'User-to-user permission check',
            'Role permission verification',
            'Channel permission override',
            'Action permission validation'
        ]
    },

    rolepermissions: {
        name: 'rolepermissions',
        category: 'Permission Utilities',
        description: 'List all role permissions',
        features: [
            'Detailed permission breakdown',
            'Enabled/disabled status',
            'Role hierarchy impact',
            'Comparison mode'
        ]
    },

    // ========== LINK & CONTENT ANALYSIS ==========
    linkinfo: {
        name: 'linkinfo',
        category: 'Link Analysis',
        description: 'Analyze Discord links',
        features: [
            'Link type detection',
            'Invite extraction',
            'Message link resolution',
            'Guild/channel/user detection',
            'Metadata extraction'
        ]
    },

    qrcode: {
        name: 'qrcode',
        category: 'Link Analysis',
        description: 'Generate QR codes from text/links',
        features: [
            'Text-to-QR conversion',
            'Size customization',
            'Color options',
            'Error correction levels'
        ]
    },

    // ========== SERVER ANALYSIS & STATS ==========
    stats: {
        name: 'stats',
        category: 'Server Analytics',
        description: 'Display server statistics & graphs',
        features: [
            'Member growth chart',
            'Message activity heatmap',
            'Active users ranking',
            'Channel usage statistics',
            'Role distribution',
            'Join rate analytics'
        ]
    },

    activity: {
        name: 'activity',
        category: 'Server Analytics',
        description: 'Show server activity metrics',
        features: [
            'Active users today/week/month',
            'Message statistics',
            'Voice channel usage',
            'New members tracking',
            'Activity trend graphs'
        ]
    },

    membercount: {
        name: 'membercount',
        category: 'Server Analytics',
        description: 'Display member count & breakdown',
        features: [
            'Total member count',
            'Online/offline breakdown',
            'Bot vs human ratio',
            'Member growth rate',
            'Bots count'
        ]
    },

    // ========== CONFIGURATION & SETTINGS ==========
    prefix: {
        name: 'prefix',
        category: 'Bot Configuration',
        description: 'Set custom command prefix',
        features: [
            'Prefix customization',
            'Multi-prefix support',
            'Role-specific prefixes',
            'Channel-specific prefixes'
        ]
    },

    language: {
        name: 'language',
        category: 'Bot Configuration',
        description: 'Set bot language preference',
        features: [
            'Multi-language support',
            'Auto-detect language',
            'User preference storage',
            'Language switching'
        ]
    },

    // ========== DEBUG & DIAGNOSTIC ==========
    ping: {
        name: 'ping',
        category: 'Diagnostic',
        description: 'Check bot latency & status',
        features: [
            'API latency display',
            'Websocket latency',
            'Bot uptime',
            'Response time metrics'
        ]
    },

    status: {
        name: 'status',
        category: 'Diagnostic',
        description: 'Display bot status & health',
        features: [
            'Bot uptime display',
            'System resource usage',
            'Database connection status',
            'External API status',
            'Error logs summary'
        ]
    },

    botinfo: {
        name: 'botinfo',
        category: 'Diagnostic',
        description: 'Get bot information & stats',
        features: [
            'Bot version & build',
            'Prefix display',
            'Server count',
            'User count',
            'Uptime statistics',
            'Developer info'
        ]
    },

    // ========== GUILD DISCOVERY ==========
    suggest: {
        name: 'suggest',
        category: 'Guild Discovery',
        description: 'Suggest similar Discord servers',
        features: [
            'Server similarity algorithm',
            'Category-based recommendations',
            'Member count matching',
            'Topic-based suggestions'
        ]
    },

    guildlist: {
        name: 'guildlist',
        category: 'Guild Discovery',
        description: 'List bots active guilds',
        features: [
            'Paginated guild display',
            'Guild statistics',
            'Sorting options',
            'Search functionality'
        ]
    }
};

/**
 * Command categories
 */
const COMMAND_CATEGORIES = {
    'Server Info': 'Retrieve comprehensive server information & statistics',
    'User Utilities': 'User profile lookup & analysis tools',
    'Invite Utilities': 'Handle Discord invite links & server discovery',
    'Time Utilities': 'Time, timezone, & reminder functionality',
    'Emoji Utilities': 'Emoji management & information',
    'Permission Utilities': 'Permission checking & role analysis',
    'Link Analysis': 'Analyze & extract information from links',
    'Server Analytics': 'Advanced server statistics & analytics',
    'Bot Configuration': 'Configure bot behavior & preferences',
    'Diagnostic': 'Bot health & system diagnostics',
    'Guild Discovery': 'Discover & explore Discord servers'
};

/**
 * Get all utility commands
 */
function getAllUtilityCommands() {
    return DISCORD_UTILITY_COMMANDS;
}

/**
 * Get commands by category
 */
function getCommandsByCategory(category) {
    return Object.values(DISCORD_UTILITY_COMMANDS).filter(
        cmd => cmd.category === category
    );
}

/**
 * Get all categories
 */
function getAllCategories() {
    return Object.keys(COMMAND_CATEGORIES);
}

module.exports = {
    DISCORD_UTILITY_COMMANDS,
    COMMAND_CATEGORIES,
    getAllUtilityCommands,
    getCommandsByCategory,
    getAllCategories
};
