const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { Poru } = require('poru');
const fs = require('fs');
const path = require('path');
const { setupMusicEvents } = require('./music/events');
const config = require('./config');
const StatusManager = require('./helpers/statusHelper');


const colors = {
    CYAN: '\x1b[96m',
    PURPLE: '\x1b[95m',
    PINK: '\x1b[38;5;213m',
    BLUE: '\x1b[94m',
    GREEN: '\x1b[92m',
    YELLOW: '\x1b[93m',
    RED: '\x1b[91m',
    WHITE: '\x1b[97m',
    GRAY: '\x1b[90m',
    BOLD: '\x1b[1m',
    DIM: '\x1b[2m',
    RESET: '\x1b[0m'
};


function printHeader() {
    console.log(`\n${colors.CYAN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.RESET}`);
    console.log(`${colors.CYAN}┃${colors.RESET}                                                                ${colors.CYAN}┃${colors.RESET}`);
    console.log(`${colors.CYAN}┃${colors.RESET}   ${colors.BOLD}${colors.PURPLE}♪ DEADLOOM MUSIC BOT ♪${colors.RESET}                                      ${colors.CYAN}┃${colors.RESET}`);
    console.log(`${colors.CYAN}┃${colors.RESET}                                                                ${colors.CYAN}┃${colors.RESET}`);
    console.log(`${colors.CYAN}┃${colors.RESET}   ${colors.BOLD}${colors.YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.RESET}   ${colors.CYAN}┃${colors.RESET}`);
    console.log(`${colors.CYAN}┃${colors.RESET}                                                                ${colors.CYAN}┃${colors.RESET}`);
    console.log(`${colors.CYAN}┃${colors.RESET}   ${colors.DIM}${colors.WHITE}Transcend • Elevate • Resonate${colors.RESET}                       ${colors.CYAN}┃${colors.RESET}`);
    console.log(`${colors.CYAN}┃${colors.RESET}   ${colors.BOLD}${colors.PINK}Premium Audio • Seamless Experience${colors.RESET}              ${colors.CYAN}┃${colors.RESET}`);
    console.log(`${colors.CYAN}┃${colors.RESET}                                                                ${colors.CYAN}┃${colors.RESET}`);
    console.log(`${colors.CYAN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.RESET}\n`);
}

function printLoading(message) {
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const frame = Math.floor(Date.now() / 80) % spinner.length;
    console.log(`  ${colors.CYAN}${spinner[frame]}${colors.RESET}  ${colors.BOLD}${colors.WHITE}${message}${colors.RESET}${colors.DIM}...${colors.RESET}`);
}

function printSuccess(message) {
    console.log(`  ${colors.GREEN}◆${colors.RESET}  ${colors.GREEN}${colors.BOLD}${message}${colors.RESET}`);
}

function printError(message) {
    console.log(`  ${colors.RED}●${colors.RESET}  ${colors.RED}${colors.BOLD}${message}${colors.RESET}`);
}

function printInfo(message) {
    console.log(`  ${colors.YELLOW}◇${colors.RESET}  ${colors.YELLOW}${colors.DIM}${message}${colors.RESET}`);
}

function printDivider() {
    console.log(`\n  ${colors.CYAN}${colors.BOLD}╭─ ` + Array(48).fill('─').join('') + ` ─╮${colors.RESET}`);
}

function printCloseDivider() {
    console.log(`  ${colors.CYAN}${colors.BOLD}╰─ ` + Array(48).fill('─').join('') + ` ─╯${colors.RESET}\n`);
}

function printSystemReady() {
    printDivider();
    console.log(`  ${colors.BOLD}${colors.PURPLE}✧ DEADLOOM SYSTEM ONLINE ✧${colors.RESET}`);
    console.log(`\n  ${colors.GREEN}${colors.BOLD}✓${colors.RESET}  ${colors.GREEN}All components initialized successfully${colors.RESET}`);
    console.log(`  ${colors.GREEN}${colors.BOLD}✓${colors.RESET}  ${colors.GREEN}Ready to deliver premium music experience${colors.RESET}`);
    console.log(`\n  ${colors.DIM}${colors.WHITE}Embracing every note. Perfecting every beat.${colors.RESET}`);
    printCloseDivider();
}


printHeader();

// Get bot token and name from command line arguments
// Usage: node index.js <TOKEN> <BOT_NAME>
const BOT_TOKEN = process.argv[2];
const BOT_NAME = process.argv[3] || 'deadloom';

if (!BOT_TOKEN) {
    printError('No bot token provided!');
    printInfo('Usage: node index.js <TOKEN> [BOT_NAME]');
    process.exit(1);
}

global.deadloom = {
    bot: {
        color: '#5865F2'
    },
    addons: {
        music: {
            playlistLimit: config.MUSIC.PLAYLIST_LIMIT || 3,
            useAI: false
        },
        ai: {
            geminiApiKeys: null
        }
    },
    db: {
        timezone: '+00:00'
    }
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.commands = new Collection();
client.prefixCommands = new Collection();
client.statusManager = new StatusManager(client);


printLoading('Slash command modules');
const slashCommandsPath = path.join(__dirname, 'slashCommands');
const slashCommandFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));

let loadedSlashCommands = 0;
let skippedSlashCommands = 0;

for (const file of slashCommandFiles) {
    const filePath = path.join(slashCommandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        loadedSlashCommands++;
    } else {
        skippedSlashCommands++;
    }
}

printSuccess(`Slash command modules loaded (${loadedSlashCommands} commands)`);
if (skippedSlashCommands > 0) {
    printInfo(`Skipped ${skippedSlashCommands} invalid slash command files`);
}


printLoading('Prefix command modules');
const prefixCommandsPath = path.join(__dirname, 'commands');
const prefixCommandFiles = fs.readdirSync(prefixCommandsPath).filter(file => file.endsWith('.js'));

let loadedPrefixCommands = 0;
let skippedPrefixCommands = 0;

for (const file of prefixCommandFiles) {
    const filePath = path.join(prefixCommandsPath, file);
    const command = require(filePath);
    if ('name' in command && 'execute' in command) {
        client.prefixCommands.set(command.name, command);
        if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => {
                client.prefixCommands.set(alias, command);
            });
        }
        loadedPrefixCommands++;
    } else {
        skippedPrefixCommands++;
    }
}

printSuccess(`Prefix command modules loaded (${loadedPrefixCommands} commands)`);
if (skippedPrefixCommands > 0) {
    printInfo(`Skipped ${skippedPrefixCommands} invalid prefix command files`);
}
printInfo(`Directories renamed: commands → slashCommands, prefixCommands → commands`);


printLoading('Event handlers');
const eventsPath = path.join(__dirname, 'events');
let loadedEvents = 0;

if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if ('name' in event && 'execute' in event) {
            client.on(event.name, (...args) => event.execute(...args, client));
            loadedEvents++;
        }
    }
    printSuccess(`Event handlers loaded (${loadedEvents} events)`);
} else {
    printInfo('No events directory found, skipping event loading');
}


printLoading('Database connection');
require('../database/models');
printSuccess('Database initialized');


const nodes = [];

// Only load Lavalink nodes if configured
if (config.LAVALINK.HOSTS && config.LAVALINK.HOSTS.trim()) {
    const hosts = config.LAVALINK.HOSTS.split(',');
    const ports = config.LAVALINK.PORTS.split(',');
    const passwords = config.LAVALINK.PASSWORDS.split(',');
    const secures = config.LAVALINK.SECURES.split(',');

    for (let i = 0; i < hosts.length; i++) {
        const host = hosts[i].trim();
        if (host) {
            nodes.push({
                name: `Node-${i + 1}`,
                host: host,
                port: parseInt(ports[i]?.trim() || '2333'),
                password: passwords[i]?.trim() || '',
                secure: secures[i]?.trim() === 'true'
            });
        }
    }
}

printLoading('Music system (LavaLink)');


let lavaLinkConnected;
const lavaLinkPromise = new Promise((resolve) => {
    lavaLinkConnected = resolve;
});

client.poru = new Poru(client, nodes, {
    library: 'discord.js',
    defaultPlatform: config.MUSIC.DEFAULT_PLATFORM,
    resumeKey: 'deadloomMusicBot',
    resumeTimeout: 120,
    reconnectTimeout: 3000,
    reconnectTries: 15,
    plugins: [],
    trackSource: 'ytsearch',
    useNewRoutePerRequest: true,
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
});

client.poru.on('nodeConnect', (node) => {
    if (lavaLinkConnected) {
        lavaLinkConnected(node);
        lavaLinkConnected = null; 
    }
});

client.poru.on('nodeReconnect', (node) => {
    printInfo(`LavaLink node reconnecting: ${node.name}`);
});

client.poru.on('nodeDisconnect', (node) => {
    printError(`LavaLink node disconnected: ${node.name}`);
});

client.poru.on('nodeError', (node, error) => {
    printError(`LavaLink node error (${node.name}): ${error.message}`);
});


client.poru.on('playerCreate', (player) => {
    
});

client.poru.on('playerDestroy', (player) => {
    
});

client.once('clientReady', async () => {
    printSuccess(`Authentication successful → ${colors.PURPLE}${client.user.tag}${colors.RESET}`);
    
    try {
        await client.statusManager.setDefaultStatus();
    } catch (e) {}
    
    printLoading('Music player system');
    client.poru.init(client.user.id);
    setupMusicEvents(client);
    printSuccess('Music player system initialized');

    printLoading('LavaLink connection');
    try {
        
        const node = await Promise.race([
            lavaLinkPromise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 10000)
            )
        ]);
        printSuccess(`LavaLink node connected: ${node.name}`);
    } catch (error) {
        printError(`LavaLink connection failed: ${error.message}`);
    }

    printLoading('Synchronizing slash commands');
    try {
        await registerCommands();
        printSuccess(`Command synchronization complete (${client.commands.size} commands)`);
    } catch (error) {
        printError(`Failed to register commands: ${error.message}`);
    }

    printInfo(`Connected to ${client.guilds.cache.size} guilds`);
    printSystemReady();
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`Command not found: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);

            const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply(errorMessage);
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply(errorMessage);
                }
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    } else if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(`Autocomplete error for ${interaction.commandName}:`, error);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const NoPrefix = require('../database/models/NoPrefix');
    const hasNoPrefix = await NoPrefix.isNoPrefixUser(message.author.id);
    
    let messageContent;
    
    if (hasNoPrefix && !message.content.startsWith(config.PREFIX)) {
        messageContent = message.content.trim();
    } else if (message.content.startsWith(config.PREFIX)) {
        messageContent = message.content.slice(config.PREFIX.length).trim();
    } else {
        return;
    }

    let command = null;
    let commandName = null;
    let args = [];

    const allWords = messageContent.split(/ +/);
    
    for (let wordCount = Math.min(allWords.length, 3); wordCount > 0; wordCount--) {
        const potentialCommand = allWords.slice(0, wordCount).join(' ').toLowerCase();
        if (client.prefixCommands.has(potentialCommand)) {
            command = client.prefixCommands.get(potentialCommand);
            commandName = potentialCommand;
            args = allWords.slice(wordCount);
            break;
        }
    }

    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(`Error executing prefix command ${commandName}:`, error);
        try {
            await message.reply('There was an error executing this command!');
        } catch (replyError) {
            console.error('Error sending error response:', replyError);
        }
    }
});

async function registerCommands() {
    const commands = [];

    for (const command of client.commands.values()) {
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

    await rest.put(
        Routes.applicationCommands(config.CLIENT_ID),
        { body: commands }
    );
}

client.on('error', (error) => {
    printError(`Discord client error: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
    printError(`Unhandled rejection: ${error.message}`);
});

process.on('uncaughtException', (error) => {
    printError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log(`\n${colors.YELLOW}⚠${colors.RESET}  Received SIGINT, shutting down gracefully...`);
    client.destroy();
    process.exit(0);
});

printLoading('Discord authentication');
client.login(BOT_TOKEN).catch((error) => {
    printError(`Failed to login: ${error.message}`);
    process.exit(1);
});
