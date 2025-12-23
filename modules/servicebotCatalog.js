const path = require('path');
const fs = require('fs');
const { fetchServerFromInvite, extractInviteCodes } = require('./utils/inviteServerFetcher');
const { getAllUtilityCommands, getCommandsByCategory } = require('./utils/discordUtilityCommands');

const botTemplates = {
    music: {
        id: 'music',
        name: 'DeadLoom Music Bot',
        description: 'Premium music bot with Lavalink support - Play, Queue, Playlists, Filters, and more!',
        emoji: '🎵',
        color: '#5865F2',
        templatePath: path.join(process.cwd(), 'servicebots', 'music', 'template'),
        features: [
            '🎶 High-quality music streaming via Lavalink',
            '📝 Custom playlists with save/load',
            '⭐ Favorite songs system',
            '🎛️ Advanced audio filters',
            '🔄 Loop, shuffle, and autoplay',
            '📊 Now playing with progress bar',
            '🎤 Lyrics search integration',
            '🎨 Beautiful music card embeds'
        ],
        requirements: [
            'Discord Bot Token',
            'Discord Application Client ID'
        ],
        configFields: [
            { key: 'BOT_TOKEN', label: 'Bot Token', type: 'password', required: true },
            { key: 'CLIENT_ID', label: 'Client ID', type: 'text', required: true },
            { key: 'OWNER_ID', label: 'Owner Discord ID', type: 'text', required: true },
            { key: 'PREFIX', label: 'Command Prefix', type: 'text', required: true, default: ',' },
            { key: 'GENIUS_API_KEY', label: 'Genius API Key for Lyrics (Optional)', type: 'password', required: false }
        ],
        defaultConfig: {
            BOT_NAME: 'deadloom',
            BOT_TOKEN: null,
            CLIENT_ID: null,
            OWNER_ID: null,
            PREFIX: ',',
            LAVALINK: {
                HOSTS: '',
                PORTS: '',
                PASSWORDS: '',
                SECURES: 'false'
            },
            MUSIC: {
                DEFAULT_PLATFORM: 'ytsearch',
                AUTOCOMPLETE_LIMIT: 5,
                PLAYLIST_LIMIT: 3,
                ARTWORK_STYLE: 'MusicCard'
            },
            GENIUS: {
                API_KEY: ''
            }
        }
    },
    ticket: {
        id: 'ticket',
        name: 'DeadLoom Ticket Bot',
        description: 'Advanced ticket support system - Manage support tickets with ease!',
        emoji: '🎫',
        color: '#F26522',
        templatePath: path.join(process.cwd(), 'servicebots', 'ticket', 'template'),
        features: [
            '🎫 Automated ticket creation and management',
            '📝 Ticket transcripts and history',
            '👥 Support team role assignments',
            '⏱️ Ticket auto-close on inactivity',
            '📊 Ticket statistics and analytics',
            '🔔 Notifications and alerts',
            '⭐ Priority ticket system',
            '💬 Multi-channel support'
        ],
        requirements: [
            'Discord Bot Token',
            'Discord Application Client ID'
        ],
        configFields: [
            { key: 'BOT_TOKEN', label: 'Bot Token', type: 'password', required: true },
            { key: 'CLIENT_ID', label: 'Client ID', type: 'text', required: true },
            { key: 'OWNER_ID', label: 'Owner Discord ID', type: 'text', required: true },
            { key: 'PREFIX', label: 'Command Prefix', type: 'text', required: true, default: '!' },
            { key: 'TICKET_CATEGORY_ID', label: 'Ticket Category ID (Optional)', type: 'text', required: false },
            { key: 'TICKET_LOG_CHANNEL_ID', label: 'Ticket Log Channel ID (Optional)', type: 'text', required: false },
            { key: 'TICKET_SUPPORT_ROLE_ID', label: 'Support Role ID (Optional)', type: 'text', required: false }
        ],
        defaultConfig: {
            BOT_NAME: 'deadloom-ticket',
            BOT_TOKEN: null,
            CLIENT_ID: null,
            OWNER_ID: null,
            PREFIX: '!',
            TICKET: {
                CATEGORY_ID: null,
                LOG_CHANNEL_ID: null,
                SUPPORT_ROLE_ID: null
            }
        }
    }
};

function getTemplate(templateId) {
    return botTemplates[templateId] || null;
}

function getAllTemplates() {
    return Object.values(botTemplates);
}

function getTemplateIds() {
    return Object.keys(botTemplates);
}

function templateExists(templateId) {
    return !!botTemplates[templateId];
}

function getTemplateFeatures(templateId) {
    const template = getTemplate(templateId);
    return template ? template.features : [];
}

function getTemplateConfigFields(templateId) {
    const template = getTemplate(templateId);
    return template ? template.configFields : [];
}

function createBotConfig(templateId, userConfig) {
    const template = getTemplate(templateId);
    if (!template) return null;
    
    const config = { ...template.defaultConfig };
    
    for (const field of template.configFields) {
        if (userConfig[field.key] !== undefined) {
            config[field.key] = userConfig[field.key];
        } else if (field.default !== undefined) {
            config[field.key] = field.default;
        }
    }
    
    return config;
}

function copyTemplateFiles(templateId, destinationPath) {
    const template = getTemplate(templateId);
    if (!template) {
        throw new Error(`Template ${templateId} not found`);
    }
    
    const sourcePath = template.templatePath;
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Template source path does not exist: ${sourcePath}`);
    }
    
    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, { recursive: true });
    }
    
    copyDirSync(sourcePath, destinationPath);
    
    return true;
}

function copyDirSync(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
        }
        
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function writeBotConfig(botPath, templateId, config) {
    const template = getTemplate(templateId);
    if (!template) return false;
    
    const configPath = path.join(botPath, 'botconfig', 'config.json');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
}

/**
 * Utility function for templates to automatically fetch Discord server IDs from invites
 */
async function parseInvitesInTemplate(client, text) {
    return await fetchServerFromInvite(client, text);
}

/**
 * Get utility commands available for a template
 */
function getTemplateUtilityCommands(templateId, category = null) {
    const allCommands = getAllUtilityCommands();
    if (category) {
        return getCommandsByCategory(category);
    }
    return allCommands;
}

/**
 * Get available utility command categories for templates
 */
function getAvailableUtilityCategories() {
    return [
        'Server Info',
        'User Utilities',
        'Invite Utilities',
        'Time Utilities',
        'Emoji Utilities',
        'Permission Utilities',
        'Link Analysis',
        'Server Analytics',
        'Bot Configuration',
        'Diagnostic',
        'Guild Discovery'
    ];
}

module.exports = {
    botTemplates,
    getTemplate,
    getAllTemplates,
    getTemplateIds,
    templateExists,
    getTemplateFeatures,
    getTemplateConfigFields,
    createBotConfig,
    copyTemplateFiles,
    writeBotConfig,
    parseInvitesInTemplate,
    fetchServerFromInvite,
    extractInviteCodes,
    getTemplateUtilityCommands,
    getAvailableUtilityCategories,
    getAllUtilityCommands,
    getCommandsByCategory
};
