//IMPORTING NPM PACKAGES
const Discord = require('discord.js');
const { ActivityType } = require('discord.js');
const colors = require("colors");
const fs = require("fs");
const Enmap = require("enmap");
var CronJob = require('cron').CronJob;
const mainconfig = require("./mainconfig.js");
const botProcessManager = require("./modules/botProcessManager");
const remoteBotClient = require("./modules/api/remoteBotClient");
const inviteTracking = require("./modules/inviteTracking");
const { initializeWelcomer, handleGuildMemberAdd: handleWelcomerAdd, handleGuildMemberRemove: handleWelcomerRemove } = require("./modules/welcomer/handler");

// Slash Commands System
const { registerCommands } = require("./modules/slashCommands/index");
const { handleInteraction, addXP, trackStaffAction } = require("./modules/slashCommands/interactionHandler");
const { handleGuildMemberAdd, handleGuildMemberRemove } = require("./modules/slashCommands/events/guildMemberEvents");

module.exports = (client) => {
    client.on("warn", e => console.error("[Discord Warn]", e.stack ? String(e.stack) : String(e)))
    client.on("rateLimit", e => console.warn("[RateLimit]", JSON.stringify(e)))
    //DEFINE THE CONFIGURATION FILE

    const baseConfig = require("./config.json");
    client.config = {
        token: process.env.DISCORD_TOKEN || baseConfig.token,
        prefix: process.env.BOT_PREFIX || baseConfig.prefix || ",",
        color: process.env.EMBED_COLOR || baseConfig.color || "#6861fe",
        pastebinapi: process.env.PASTEBIN_API_KEY || baseConfig.pastebinapi,
        secret: process.env.DISCORD_CLIENT_SECRET || baseConfig.secret,
        callback: process.env.DISCORD_CALLBACK_URL || baseConfig.callback,
        servers: baseConfig.servers || {},
        passwords: baseConfig.passwords || {},
        usernames: baseConfig.usernames || {}
    };
    //Define some global collections
    client.createingbotmap = new Discord.Collection();
    client.cooldowns = new Discord.Collection();
    client.commands = new Discord.Collection();
    client.aliases = new Discord.Collection();

    client.currentServerIP = String(Object.values(require('os').networkInterfaces()).reduce((r, list) => r.concat(list.reduce((rr, i) => rr.concat(i.family === 'IPv4' && !i.internal && i.address || []), [])), [])).split(".")[3].split(",")[0];

    client.allServers = {
        current: client.config.servers[client.currentServerIP] ? client.config.servers[client.currentServerIP] : Object.keys(client.config.servers)[0],
        least: null,
        stats: [],
    }


    //CREATING THE DATABASES
    client.setups = new Enmap({ name: "setups", dataDir: "./dbs/others" });
    client.bots = new Enmap({ name: "bots", dataDir: "./dbs/bots" });
    client.payments = new Enmap({ name: "payments", dataDir: "./dbs/payments" });
    client.payments.ensure("payments", { users: [] });
    client.payments.ensure("invitepayments", { users: [] });
    client.staffrank = new Enmap({ name: "staffrank", dataDir: "./dbs/others" });
    client.ticketdata = new Enmap({ name: "ticketdata", dataDir: "./dbs/others" });

    // Staff Management System Databases
    client.loa = new Enmap({ name: "loa", dataDir: "./dbs/staff" });
    client.modcases = new Enmap({ name: "modcases", dataDir: "./dbs/moderation" });
    client.warnings = new Enmap({ name: "warnings", dataDir: "./dbs/moderation" });
    client.staffranks = new Enmap({ name: "staffranks", dataDir: "./dbs/staff" });
    client.appeals = new Enmap({ name: "appeals", dataDir: "./dbs/moderation" });
    client.handbook = new Enmap({ name: "handbook", dataDir: "./dbs/handbook" });
    client.aiconversations = new Enmap({ name: "aiconversations", dataDir: "./dbs/ai" });
    client.staffstats = new Enmap({ name: "staffstats", dataDir: "./dbs/staff" });
    client.serversettings = new Enmap({ name: "serversettings", dataDir: "./dbs/config" });
    
    // New Databases for Leveling & Competitions
    client.levels = new Enmap({ name: "levels", dataDir: "./dbs/levels" });
    client.competitions = new Enmap({ name: "competitions", dataDir: "./dbs/competitions" });

    // Slash Command Interaction Handler
    client.on("interactionCreate", async (interaction) => {
        try {
            // Handle button interactions
            
            await handleInteraction(interaction, client);
        } catch (error) {
            console.error("[SlashCommand] Error:", error);
        }
    });

    // Welcome/Goodbye Event Handlers
    client.on("guildMemberAdd", async (member) => {
        try {
            await handleGuildMemberAdd(member, client);
            // Also trigger welcomer system if configured
            await handleWelcomerAdd(member, client);
        } catch (error) {
            console.error("[Welcome] Error:", error);
        }
    });

    client.on("guildMemberRemove", async (member) => {
        try {
            await handleGuildMemberRemove(member, client);
            // Also trigger welcomer system if configured
            await handleWelcomerRemove(member, client);
        } catch (error) {
            console.error("[Goodbye] Error:", error);
        }
    });

    // XP on Message
    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild) return;
        
        try {
            const result = await addXP(client, message.guild.id, message.author.id);
            if (result?.leveledUp) {
                const settings = client.serversettings.get(message.guild.id);
                if (settings?.levelUpEnabled !== false) {
                    const channel = settings?.levelUpChannel 
                        ? message.guild.channels.cache.get(settings.levelUpChannel) 
                        : message.channel;
                    if (channel) {
                        const { EmbedBuilder } = require('discord.js');
                        const embed = new EmbedBuilder()
                            .setColor('#57F287')
                            .setTitle('🎉 Level Up!')
                            .setDescription(`Congratulations **${message.author.username}**! You've reached **Level ${result.newLevel}**!`)
                            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();
                        await channel.send({ content: `<@${message.author.id}>`, embeds: [embed] }).catch(() => {});
                        
                        const { checkLevelRoles } = require("./modules/slashCommands/interactionHandler");
                        await checkLevelRoles(message.guild, message.author.id, result.newLevel, client);
                    }
                }
            }
        } catch (e) {}
    });
    /**
     * @INFO LOADING SYSTEMS AND MODULES
     */
    require("./modules/commands")(client)
    require("./modules/dashboard/index")(client)
    require("./modules/tickets/OrderSystem")(client)
    require("./modules/tickets/TicketSystem")(client)
    require("./modules/codeshare/codeInteractions")(client)
    require("./modules/others/getleastServer")(client)
    require("./modules/events/subscriptionVerify")(client)
    require("./modules/events/verificationRoleWatcher")(client)
    require("./modules/events/stickyMessages")(client)
    // require('./index_other_tasks')
    
    /**
     * @INFO LOGGING INTO THE BOT CLIENT
     */
    const { theDB } = require("./modules/utilfunctions");
    
    client.login(process.env.DISCORD_TOKEN || client.config.token);
    client.on(Discord.Events.ClientReady, () => {
        client.guilds.cache.forEach(guild => {
            theDB(client, guild);
        });

        console.log(`[ONLINE] Bot logged in as: ${client.user.tag}`.green);
        
        // Initialize Welcomer System
        initializeWelcomer(client).then(success => {
            if (success) {
                console.log(`[Welcomer] System initialized successfully`.green);
            } else {
                console.log(`[Welcomer] System initialization skipped - not configured`.yellow);
            }
        }).catch(err => {
            console.error(`[Welcomer] Initialization error: ${err.message}`.red);
        });
        
        // Register Slash Commands
        registerCommands(client).catch(err => {
            console.error(`[SlashCommands] Failed to register: ${err.message}`.red);
        });
        
        if (remoteBotClient.isConfigured()) {
            remoteBotClient.checkHealth().then(isHealthy => {
                if (isHealthy) {
                    console.log(`[RemoteHost] Connected to secondary Replit`.green);
                } else {
                    console.log(`[RemoteHost] Secondary Replit offline`.red);
                }
            }).catch(err => {
                console.error(`[RemoteHost] Secondary Replit offline: ${err.message}`.red);
            });
        }
        
        setTimeout(() => {
            botProcessManager.autoStartBots();
        }, 10000);
        
        // Check for expired bots on startup
        setTimeout(() => {
            try {
                const expiredBots = inviteTracking.getExpiredBots();
                if (expiredBots.length > 0) {
                    console.log(`[InviteTracking] Found ${expiredBots.length} expired bot(s) on startup`.yellow);
                    expiredBots.forEach(botName => {
                        console.log(`  - ${botName} expired on <t:${Math.floor(inviteTracking.getBotExpiration(botName).expiresAt / 1000)}:F>`);
                    });
                }
            } catch (e) {
                console.error('[InviteTracking] Startup check error:', e.message);
            }
        }, 15000);
        
        // Schedule hourly expiration check
        new CronJob('0 * * * * *', function() {
            try {
                const expiredBots = inviteTracking.getExpiredBots();
                if (expiredBots.length > 0) {
                    console.log(`[InviteTracking] Hourly check: ${expiredBots.length} expired bot(s)`);
                }
            } catch (e) {
                console.error('[InviteTracking] Hourly check error:', e.message);
            }
        }, null, true, 'Europe/Berlin');
        
        let counter = 0;
        var job = new CronJob('0 * * * * *', function () {
            switch (counter) {
                case 0: {
                    try { client.user.setActivity(`${mainconfig.BotSettings.StatusOne}`, { type: ActivityType.Playing }) } catch (e) { console.error("[Status]", e) }
                    counter++;
                } break;
                case 1: {
                    try { client.user.setActivity(`${mainconfig.BotSettings.StatusTwo}`, { type: ActivityType.Playing }) } catch (e) { console.error("[Status]", e) }
                    counter++;
                } break;
                case 2: {
                    try { client.user.setActivity(`${mainconfig.BotSettings.StatusThree}`, { type: ActivityType.Playing }) } catch (e) { console.error("[Status]", e) }
                    counter++;
                } break;
                case 3: {
                    try { client.user.setActivity(`${mainconfig.BotSettings.StatusFour}`, { type: ActivityType.Playing }) } catch (e) { console.error("[Status]", e) }
                    counter++;
                } break;
                case 4: {
                    try { client.user.setActivity(`Over ${client.guilds.cache.reduce((a, b) => a + b?.memberCount, 0)} Members!`, { type: ActivityType.Playing }) } catch (e) { console.error("[Status]", e) }
                    counter++;
                } break;
                case 5: {
                    try { client.user.setActivity(`${mainconfig.BotSettings.StatusFive}`, { type: ActivityType.Playing }) } catch (e) { console.error("[Status]", e) }
                    counter++;
                } break;
                case 6: {
                    try { client.user.setActivity(`${mainconfig.BotSettings.StatusSix}`, { type: ActivityType.Playing }) } catch (e) { console.error("[Status]", e) }
                    counter = 0;
                } break;
                default: {
                    try { client.user.setActivity(`${mainconfig.BotSettings.StatusSeven}`, { type: ActivityType.Playing }) } catch (e) { console.error("[Status]", e) }
                    counter = 0;
                    counter++;
                } break;
            }
        }, null, true, 'Europe/Berlin');
        job.start();
    })
}