if (process.version.slice(1).split(".")[0] < 16) {
    throw new Error("This codes require Node v16.9.0 or higher to run!");
}

const Discord = require("discord.js");
const mainconfig = require("./mainconfig");
const { startHourlyRotation, rotateAvatar } = require("./modules/others/avatarRotation");

process.on('unhandledRejection', (reason, promise) => {
    if (reason?.code === 10062) return;
    if (reason?.code === 50035 && reason?.rawError?.errors?.message_reference) return;
    console.error('[UnhandledRejection] Caught unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[UncaughtException] Caught uncaught exception:', error);
});

const client = new Discord.Client({
    allowedMentions: {
        parse: ["roles", "users"],
        repliedUser: false,
    },
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildVoiceStates,
        Discord.GatewayIntentBits.GuildPresences,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.MessageContent,
    ],
});

client.on(Discord.Events.ClientReady, async () => {
    try {
        startHourlyRotation(client);
    } catch (e) {}
    
    const ownerId = await client.users.fetch(mainconfig.BotOwnerID).catch(() => null);
    const guild = await client.guilds.fetch(mainconfig.ServerID).catch(() => null);
    
    if (!ownerId || !guild) {
        console.warn("[Config] Update mainconfig.js with your Discord server/role/channel IDs");
    }
});

client.on('error', (error) => {
    console.error('[Discord Client Error]', error);
});

client.on('shardError', (error, shardId) => {
    console.error(`[Shard ${shardId} Error]`, error);
});

require("./Bot")(client);