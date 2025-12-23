/**
 * Complete list of utility commands available in the main DeadLoom bot
 */

const MAIN_BOT_UTILITY_COMMANDS = {
    'Server Info': [
        {
            name: 'serverinfo',
            aliases: ['guildinfo', 'si'],
            description: 'Display detailed server information',
            features: ['Member count', 'Roles count', 'Boost level', 'Channel breakdown', 'Owner info', 'Creation date']
        },
        {
            name: 'roleinfo',
            aliases: ['ri', 'role'],
            description: 'Get detailed role information',
            features: ['Role members count', 'Permissions list', 'Color & position', 'Mentionable status']
        },
        {
            name: 'membercount',
            aliases: ['members', 'mc'],
            description: 'Display member count and breakdown',
            features: ['Total members', 'Human vs Bot ratio', 'Online count', 'Percentage breakdown']
        }
    ],
    
    'User Utilities': [
        {
            name: 'userinfo',
            aliases: ['whois', 'ui', 'user'],
            description: 'Get comprehensive user information',
            features: ['Account creation date', 'Join date', 'Roles list', 'Badges', 'Status', 'Nitro info']
        },
        {
            name: 'avatar',
            aliases: ['av', 'pfp'],
            description: 'View user avatar in high quality',
            features: ['High-res avatar display', 'Download buttons', 'Multiple sizes (512x, 1024x)']
        },
        {
            name: 'permissions',
            aliases: ['perms', 'userperms'],
            description: 'Check user permissions in the server',
            features: ['Full permission list', 'Administrator status', 'Permission breakdown']
        }
    ],
    
    'Invite Utilities': [
        {
            name: 'serverid',
            aliases: ['guildid', 'inviteinfo'],
            description: 'Extract server ID from Discord invite link',
            features: ['Auto-detect invite codes', 'Fetch server details', 'Member count', 'Inviter info', 'Multiple invites support']
        }
    ],
    
    'Emoji Utilities': [
        {
            name: 'emojiinfo',
            aliases: ['emoji', 'ei'],
            description: 'Get emoji information and details',
            features: ['Emoji name & ID', 'Animated status', 'Creation date', 'Emoji code display']
        }
    ],
    
    'Diagnostic': [
        {
            name: 'ping',
            aliases: ['latency', 'ms'],
            description: 'Check bot latency and status',
            features: ['API latency', 'Bot latency', 'Uptime display', 'Status indicator']
        },
        {
            name: 'botinfo',
            aliases: ['bot', 'info'],
            description: 'Get comprehensive bot information',
            features: ['Bot uptime', 'Server count', 'User count', 'Discord.js version', 'Node.js version']
        }
    ]
};

/**
 * Get all available utility commands count
 */
function getTotalUtilityCommandCount() {
    let total = 0;
    Object.values(MAIN_BOT_UTILITY_COMMANDS).forEach(category => {
        total += category.length;
    });
    return total;
}

/**
 * Get commands by category
 */
function getUtilityCommandsByCategory(category) {
    return MAIN_BOT_UTILITY_COMMANDS[category] || [];
}

/**
 * Get all utility command categories
 */
function getAllUtilityCategories() {
    return Object.keys(MAIN_BOT_UTILITY_COMMANDS);
}

/**
 * Format commands for display
 */
function formatUtilityCommands() {
    let formatted = '```\n';
    
    Object.entries(MAIN_BOT_UTILITY_COMMANDS).forEach(([category, commands]) => {
        formatted += `\n📂 ${category.toUpperCase()}\n`;
        formatted += '─'.repeat(40) + '\n';
        
        commands.forEach(cmd => {
            formatted += `  • ${cmd.name} (${cmd.aliases.join(', ')})\n`;
            formatted += `    → ${cmd.description}\n`;
        });
    });
    
    formatted += '\n```';
    return formatted;
}

module.exports = {
    MAIN_BOT_UTILITY_COMMANDS,
    getTotalUtilityCommandCount,
    getUtilityCommandsByCategory,
    getAllUtilityCategories,
    formatUtilityCommands
};
