const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "distributed",
    aliases: ["dist", "dh", "secondary", "replits"],
    category: "Hosting",
    description: "Manage distributed bot hosting across multiple deadloom hosting instances",
    usage: ",distributed <stats|replits|bots|assign|remove|refresh>",
    permissions: ["ADMINISTRATOR"],
    run: async (client, message, args, cmduser, text, prefix) => {
        const mainconfig = require('../../../mainconfig');
        
        const hasPermission = message.member.permissions.has("ADMINISTRATOR") ||
            message.member.roles.cache.has(mainconfig.ServerRoles.FounderId) ||
            message.member.roles.cache.has(mainconfig.ServerRoles.BotCreatorRoleId) ||
            message.member.roles.cache.has(mainconfig.ServerRoles.ChiefBotCreatorRoleId) ||
            message.author.id === mainconfig.BotOwnerID;
        
        if (!hasPermission) {
            return message.reply({ embeds: [
                new Discord.EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ You do not have permission to use this command.')
            ]});
        }

        const DB_FILE = path.join(process.cwd(), 'dbs', 'shared_db.json');
        
        const loadDB = () => {
            try {
                if (fs.existsSync(DB_FILE)) {
                    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                }
            } catch (err) {
                console.error('[Distributed] Failed to load DB:', err.message);
            }
            return { bots: {}, replits: {}, stats: { totalRequests: 0, lastAccess: null } };
        };

        const saveDB = (data) => {
            try {
                fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
                return true;
            } catch (err) {
                console.error('[Distributed] Failed to save DB:', err.message);
                return false;
            }
        };

        const subCommand = args[0]?.toLowerCase();

        if (!subCommand || subCommand === 'help') {
            const embed = new Discord.EmbedBuilder()
                .setColor('#6861fe')
                .setTitle('🌐 Distributed Bot Hosting Commands')
                .setDescription('Manage bots across multiple deadloom hosting instances')
                .addFields({ name: '📊 Stats & Info', value: [
                    `\`${prefix}distributed stats\` - View system statistics`,
                    `\`${prefix}distributed replits\` - List connected Replits`,
                    `\`${prefix}distributed bots\` - List all distributed bots`,
                ].join('\n') })
                .addFields({ name: '🔧 Management', value: [
                    `\`${prefix}distributed assign <botId> <replitId|auto>\` - Assign bot to Replit`,
                    `\`${prefix}distributed remove <botId>\` - Remove bot from system`,
                    `\`${prefix}distributed kick <replitId>\` - Remove a Replit`,
                ].join('\n') })
                .addFields({ name: '🔄 Maintenance', value: [
                    `\`${prefix}distributed refresh\` - Refresh all connections`,
                    `\`${prefix}distributed cleanup\` - Remove offline Replits`,
                ].join('\n') })
                .setFooter({ text: 'Distributed Hosting System' })
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'stats') {
            const db = loadDB();
            const botsCount = Object.keys(db.bots).length;
            const replitsCount = Object.keys(db.replits).length;
            const onlineReplits = Object.values(db.replits).filter(r => r.status === 'online').length;
            const runningBots = Object.values(db.bots).filter(b => b.status === 'running').length;
            const pendingBots = Object.values(db.bots).filter(b => b.status === 'pending').length;

            const embed = new Discord.EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('📊 Distributed Hosting Statistics')
                .addFields({ name: '🤖 Bots', value: [
                    `Total: **${botsCount}**`,
                    `Running: **${runningBots}**`,
                    `Pending: **${pendingBots}**`,
                    `Stopped: **${botsCount - runningBots - pendingBots}**`
                ].join('\n'), inline: true })
                .addFields({ name: '🖥️ Replits', value: [
                    `Total: **${replitsCount}**`,
                    `Online: **${onlineReplits}**`,
                    `Offline: **${replitsCount - onlineReplits}**`
                ].join('\n'), inline: true })
                .addFields({ name: '📈 API Stats', value: [
                    `Requests: **${db.stats?.totalRequests || 0}**`,
                    `Last Access: ${db.stats?.lastAccess ? `<t:${Math.floor(new Date(db.stats.lastAccess).getTime()/1000)}:R>` : 'Never'}`
                ].join('\n'), inline: true })
                .setFooter({ text: 'Distributed Hosting System' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'replits' || subCommand === 'workers' || subCommand === 'nodes') {
            const db = loadDB();
            const replits = Object.entries(db.replits);

            if (replits.length === 0) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ffff00')
                        .setTitle('🖥️ Connected deadloom hosting')
                        .setDescription('No secondary deadloom hosting instances connected yet.\n\nShare your API connection details with friends to add workers!')
                ]});
            }

            const embed = new Discord.EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🖥️ Connected deadloom hosting')
                .setDescription(`**${replits.length}** deadloom hosting instance(s) connected`);

            for (const [id, replit] of replits) {
                const statusEmoji = replit.status === 'online' ? '🟢' : '🔴';
                const lastHeartbeat = replit.lastHeartbeat 
                    ? `<t:${Math.floor(new Date(replit.lastHeartbeat).getTime()/1000)}:R>`
                    : 'Never';
                
                embed.addFields({ name: `${statusEmoji} ${id}`, value: [
                        `Status: **${replit.status || 'unknown'}**`,
                        `Bots Running: **${replit.bots_running || 0}**`,
                        `Last Heartbeat: ${lastHeartbeat}`
                    ].join('\n'),
                    inline: true
                });
            }

            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'bots' || subCommand === 'list') {
            const db = loadDB();
            const bots = Object.entries(db.bots);

            if (bots.length === 0) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ffff00')
                        .setTitle('🤖 Distributed Bots')
                        .setDescription('No bots in the distributed system yet.\n\nUse `,distributed assign` to add bots!')
                ]});
            }

            const embed = new Discord.EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🤖 Distributed Bots')
                .setDescription(`**${bots.length}** bot(s) in system`);

            for (const [id, bot] of bots.slice(0, 25)) {
                const statusEmoji = bot.status === 'running' ? '🟢' : bot.status === 'pending' ? '🟡' : '🔴';
                embed.addFields({ name: `${statusEmoji} ${id}`, value: [
                        `Type: **${bot.botType || 'Unknown'}**`,
                        `Assigned To: **${bot.replit || 'None'}**`,
                        `Status: **${bot.status || 'unknown'}**`,
                        `Owner: <@${bot.ownerId || 'Unknown'}>`
                    ].join('\n'),
                    inline: true
                });
            }

            if (bots.length > 25) {
                embed.setFooter({ text: `Showing 25 of ${bots.length} bots` });
            }

            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'assign') {
            const botId = args[1];
            const replitId = args[2] || 'auto';

            if (!botId) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription(`❌ Usage: \`${prefix}distributed assign <botId> [replitId|auto]\``)
                ]});
            }

            const db = loadDB();
            
            let targetReplit = replitId;
            if (replitId === 'auto') {
                const onlineReplits = Object.entries(db.replits)
                    .filter(([id, r]) => r.status === 'online')
                    .sort((a, b) => (a[1].bots_running || 0) - (b[1].bots_running || 0));
                
                if (onlineReplits.length === 0) {
                    return message.reply({ embeds: [
                        new Discord.EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ No online Replits available for auto-assignment.')
                    ]});
                }
                targetReplit = onlineReplits[0][0];
            }

            db.bots[botId] = {
                ...db.bots[botId],
                replit: targetReplit,
                status: 'pending',
                assignedAt: new Date().toISOString(),
                assignedBy: message.author.id
            };

            if (saveDB(db)) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Bot Assigned')
                        .addFields({ name: 'Bot ID', value: botId, inline: true })
                        .addFields({ name: 'Assigned To', value: targetReplit, inline: true })
                        .addFields({ name: 'Status', value: 'Pending', inline: true })
                        .setFooter({ text: `Assigned by ${message.author.tag}` })
                        .setTimestamp()
                ]});
            } else {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ Failed to save assignment.')
                ]});
            }
        }

        if (subCommand === 'remove' || subCommand === 'delete') {
            const botId = args[1];

            if (!botId) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription(`❌ Usage: \`${prefix}distributed remove <botId>\``)
                ]});
            }

            const db = loadDB();
            
            if (!db.bots[botId]) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription(`❌ Bot \`${botId}\` not found in distributed system.`)
                ]});
            }

            const botInfo = db.bots[botId];
            delete db.bots[botId];

            if (saveDB(db)) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Bot Removed')
                        .setDescription(`Bot \`${botId}\` has been removed from the distributed system.`)
                        .addFields({ name: 'Was Assigned To', value: botInfo.replit || 'None', inline: true })
                        .setFooter({ text: `Removed by ${message.author.tag}` })
                        .setTimestamp()
                ]});
            } else {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ Failed to remove bot.')
                ]});
            }
        }

        if (subCommand === 'kick') {
            const replitId = args[1];

            if (!replitId) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription(`❌ Usage: \`${prefix}distributed kick <replitId>\``)
                ]});
            }

            const db = loadDB();
            
            if (!db.replits[replitId]) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription(`❌ Replit \`${replitId}\` not found.`)
                ]});
            }

            delete db.replits[replitId];

            if (saveDB(db)) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Replit Removed')
                        .setDescription(`Replit \`${replitId}\` has been kicked from the system.`)
                        .setFooter({ text: `Removed by ${message.author.tag}` })
                        .setTimestamp()
                ]});
            } else {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ Failed to remove Replit.')
                ]});
            }
        }

        if (subCommand === 'cleanup') {
            const db = loadDB();
            const now = Date.now();
            const timeout = 5 * 60 * 1000;
            let removed = 0;

            for (const [id, replit] of Object.entries(db.replits)) {
                if (replit.lastHeartbeat) {
                    const lastBeat = new Date(replit.lastHeartbeat).getTime();
                    if (now - lastBeat > timeout) {
                        delete db.replits[id];
                        removed++;
                    }
                }
            }

            if (saveDB(db)) {
                return message.reply({ embeds: [
                    new Discord.EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🧹 Cleanup Complete')
                        .setDescription(`Removed **${removed}** offline Replit(s) (no heartbeat for 5+ minutes).`)
                        .setTimestamp()
                ]});
            }
        }

        if (subCommand === 'refresh') {
            const db = loadDB();
            
            for (const [id, replit] of Object.entries(db.replits)) {
                if (replit.lastHeartbeat) {
                    const lastBeat = new Date(replit.lastHeartbeat).getTime();
                    const now = Date.now();
                    if (now - lastBeat > 60000) {
                        db.replits[id].status = 'offline';
                    }
                }
            }

            saveDB(db);

            return message.reply({ embeds: [
                new Discord.EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🔄 Status Refreshed')
                    .setDescription('Updated status for all Replits based on heartbeat timestamps.')
                    .setTimestamp()
            ]});
        }

        if (subCommand === 'api' || subCommand === 'connection') {
            const apiKey = process.env.SHARED_DB_API_KEY || 'your-secret-key-12345';
            const domain = process.env.REPLIT_DEV_DOMAIN 
                ? `https://${process.env.REPLIT_DEV_DOMAIN}`
                : 'Not available';

            const embed = new Discord.EmbedBuilder()
                .setColor('#6861fe')
                .setTitle('🔗 API Connection Info')
                .setDescription('Share these details with friends to connect their Replits:')
                .addFields({ name: 'Main Replit URL', value: `\`${domain}\`` })
                .addFields({ name: 'API Key', value: `\`${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length-5)}\`` })
                .addFields({ name: 'Endpoints', value: [
                    '`GET /api/health` - Health check',
                    '`GET /api/stats` - System stats',
                    '`GET /api/bots` - List bots',
                    '`GET /api/replits` - List Replits',
                    '`POST /api/replits/:id/status` - Send heartbeat'
                ].join('\n') })
                .setFooter({ text: 'Send full API key privately to trusted friends only!' });

            return message.reply({ embeds: [embed] });
        }

        return message.reply({ embeds: [
            new Discord.EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(`❌ Unknown subcommand. Use \`${prefix}distributed help\` for available commands.`)
        ]});
    }
};
