require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const database = require('./database');

// Get bot token and name from command line arguments
// Usage: node index.js <TOKEN> [BOT_NAME]
const BOT_TOKEN = process.argv[2];
const BOT_NAME = process.argv[3] || 'deadloom-ticket';

if (!BOT_TOKEN) {
    console.error('❌ No bot token provided!');
    console.log('Usage: node index.js <TOKEN> [BOT_NAME]');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.database = database;

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

console.log('🔐 Token received, attempting to connect...');
console.log(`📊 Bot Name: ${BOT_NAME}`);
console.log(`📊 Token length: ${BOT_TOKEN.length} characters`);

client.login(BOT_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error.message);
    console.log('\n🔧 Check your bot token and try again');
    process.exit(1);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
