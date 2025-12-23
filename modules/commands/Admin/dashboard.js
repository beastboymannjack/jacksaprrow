const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const mainconfig = require("../../../mainconfig.js");

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.SupporterRoleId,
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("ADMINISTRATOR");
}

module.exports = {
    name: "dashboard",
    description: "View the staff management dashboard",
    usage: "dashboard",
    aliases: ["panel", "staffpanel"],

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to access the dashboard.")
                ]
            });
        }

        const allCases = client.modcases.fetchEverything();
        const guildCases = [];
        allCases.forEach((data, id) => {
            if (!id || id.startsWith('counter') || typeof data !== 'object' || !data.guildId) return;
            if (data.guildId === message.guild.id) {
                guildCases.push({ id, ...data });
            }
        });

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayCases = guildCases.filter(c => new Date(c.date) >= todayStart);
        const weekCases = guildCases.filter(c => new Date(c.date) >= weekStart);
        const monthCases = guildCases.filter(c => new Date(c.date) >= monthStart);

        const stats = {
            total: guildCases.length,
            today: todayCases.length,
            week: weekCases.length,
            month: monthCases.length,
            warns: guildCases.filter(c => c.type === 'warn').length,
            kicks: guildCases.filter(c => c.type === 'kick').length,
            bans: guildCases.filter(c => c.type === 'ban').length,
            timeouts: guildCases.filter(c => c.type === 'timeout').length
        };

        const allLoa = client.loa.fetchEverything();
        const activeLoas = [];
        allLoa.forEach((data, odataId) => {
            if (data.status === 'active' && data.guildId === message.guild.id) {
                activeLoas.push({ userId: odataId, ...data });
            }
        });

        const recentCases = guildCases
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        let recentCasesText = '';
        if (recentCases.length > 0) {
            for (const c of recentCases) {
                const emoji = { warn: '⚠️', kick: '👢', ban: '🔨', timeout: '⏰', strike: '⚡', unban: '🔓' }[c.type] || '📋';
                recentCasesText += `${emoji} \`${c.id}\` ${c.type} - <@${c.user}>\n`;
            }
        } else {
            recentCasesText = 'No recent cases';
        }

        let loaText = '';
        if (activeLoas.length > 0) {
            for (const loa of activeLoas.slice(0, 3)) {
                const member = await message.guild.members.fetch(loa.userId).catch(() => null);
                const name = member ? member.user.username : 'Unknown';
                loaText += `🌴 **${name}** - Returns ${moment(loa.endDate).fromNow()}\n`;
            }
            if (activeLoas.length > 3) {
                loaText += `*...and ${activeLoas.length - 3} more*`;
            }
        } else {
            loaText = '✅ No active LOAs';
        }

        const mainEmbed = new EmbedBuilder()
            .setColor(client.config.color)
            .setTitle("📊 Staff Management Dashboard")
            .setDescription(`Welcome to the staff management dashboard for **${message.guild.name}**`)
            .addFields({ name: "📈 Overview", value: `**Today:** ${stats.today} cases\n**This Week:** ${stats.week} cases\n**This Month:** ${stats.month} cases\n**All Time:** ${stats.total} cases`, inline: true })
            .addFields({ name: "📊 Breakdown", value: `⚠️ Warnings: ${stats.warns}\n👢 Kicks: ${stats.kicks}\n🔨 Bans: ${stats.bans}\n⏰ Timeouts: ${stats.timeouts}`, inline: true })
            .addFields({ name: "🌴 Active LOAs", value: loaText, inline: true })
            .addFields({ name: "📋 Recent Cases", value: recentCasesText })
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: "Staff Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dashboard_moderation')
                    .setLabel('Moderation')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_staff')
                    .setLabel('Staff')
                    .setEmoji('👥')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_loa')
                    .setLabel('LOA')
                    .setEmoji('🌴')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_settings')
                    .setLabel('Settings')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Secondary)
            );

        const botCreatorRoles = [
            mainconfig.ServerRoles?.BotCreatorRoleId,
            mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
            mainconfig.ServerRoles?.FounderId
        ].filter(Boolean);

        const isBotCreator = botCreatorRoles.some(roleId => message.member.roles.cache.has(roleId)) || 
                            message.member.permissions.has("ADMINISTRATOR");

        const rowWithBot = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dashboard_moderation')
                    .setLabel('Moderation')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_staff')
                    .setLabel('Staff')
                    .setEmoji('👥')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_loa')
                    .setLabel('LOA')
                    .setEmoji('🌴')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_bots')
                    .setLabel('Bots')
                    .setEmoji('🤖')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dashboard_settings')
                    .setLabel('Settings')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Secondary)
            );

        const finalRow = isBotCreator ? rowWithBot : row;

        const dashboardMsg = await message.reply({ embeds: [mainEmbed], components: [finalRow] });

        // Store for use in collector
        const displayRow = finalRow;

        const collector = dashboardMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 300000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'dashboard_moderation') {
                const modEmbed = new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("📊 Moderation Statistics")
                    .addFields({ name: "📅 Time Period Stats", value: `**Today:** ${stats.today} actions\n**This Week:** ${stats.week} actions\n**This Month:** ${stats.month} actions`, inline: true })
                    .addFields({ name: "📈 Action Types", value: `⚠️ **Warnings:** ${stats.warns}\n👢 **Kicks:** ${stats.kicks}\n🔨 **Bans:** ${stats.bans}\n⏰ **Timeouts:** ${stats.timeouts}`, inline: true })
                    .addFields({ name: "📋 Recent Activity", value: recentCasesText })
                    .setFooter({ text: "Click buttons to navigate" })
                    .setTimestamp();

                await interaction.update({ embeds: [modEmbed], components: [finalRow] });
            }
            
            else if (interaction.customId === 'dashboard_staff') {
                const staffRoles = [
                    mainconfig.ServerRoles?.SupporterRoleId,
                    mainconfig.ServerRoles?.BotCreatorRoleId,
                    mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
                    mainconfig.ServerRoles?.FounderId
                ].filter(Boolean);

                let onlineStaff = [];
                let totalStaff = 0;

                for (const roleId of staffRoles) {
                    const role = message.guild.roles.cache.get(roleId);
                    if (role) {
                        role.members.forEach(member => {
                            totalStaff++;
                            if (member.presence?.status && member.presence.status !== 'offline') {
                                if (!onlineStaff.find(s => s.id === member.id)) {
                                    onlineStaff.push({
                                        id: member.id,
                                        name: member.user.username,
                                        status: member.presence.status
                                    });
                                }
                            }
                        });
                    }
                }

                const onLoaIds = activeLoas.map(l => l.userId);
                const availableStaff = onlineStaff.filter(s => !onLoaIds.includes(s.id));

                const staffEmbed = new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("👥 Staff Overview")
                    .addFields({ name: "📊 Summary", value: `**Total Staff:** ${totalStaff}\n**Online:** ${onlineStaff.length}\n**On LOA:** ${activeLoas.length}\n**Available:** ${availableStaff.length}`, inline: true })
                    .addFields({ name: "🟢 Online Staff", value: availableStaff.length > 0 
                            ? availableStaff.slice(0, 10).map(s => `${s.status === 'online' ? '🟢' : s.status === 'idle' ? '🟡' : '🔴'} ${s.name}`).join('\n')
                            : 'No staff online', inline: true })
                    .setFooter({ text: "Click buttons to navigate" })
                    .setTimestamp();

                await interaction.update({ embeds: [staffEmbed], components: [finalRow] });
            }
            
            else if (interaction.customId === 'dashboard_loa') {
                let loaListText = '';
                if (activeLoas.length > 0) {
                    activeLoas.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
                    for (const loa of activeLoas.slice(0, 10)) {
                        const member = await message.guild.members.fetch(loa.userId).catch(() => null);
                        const name = member ? member.user.username : 'Unknown';
                        const reason = loa.reason.charAt(0).toUpperCase() + loa.reason.slice(1);
                        loaListText += `🌴 **${name}**\n`;
                        loaListText += `└ Returns: ${moment(loa.endDate).format('MMM Do')} (${moment(loa.endDate).fromNow()})\n`;
                        loaListText += `└ Reason: ${reason}\n\n`;
                    }
                } else {
                    loaListText = '✅ No staff members are currently on leave.\n\nAll hands on deck!';
                }

                const loaEmbed = new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("🌴 Leave of Absence Status")
                    .setDescription(loaListText)
                    .addFields({ name: "📊 LOA Stats", value: `**Active LOAs:** ${activeLoas.length}\n**Returning This Week:** ${activeLoas.filter(l => new Date(l.endDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}`, inline: false })
                    .setFooter({ text: "Click buttons to navigate" })
                    .setTimestamp();

                await interaction.update({ embeds: [loaEmbed], components: [finalRow] });
            }
            
            else if (interaction.customId === 'dashboard_bots' && isBotCreator) {
                // Get staff roles from mainconfig
                const staffRoles = {
                    "🛡️ Moderators": mainconfig.ServerRoles?.ModRoleId,
                    "🎧 Supporters": mainconfig.ServerRoles?.SupporterRoleId,
                    "🤖 Bot Creators": mainconfig.ServerRoles?.BotCreatorRoleId,
                    "👑 Founders": mainconfig.ServerRoles?.FounderId
                };

                let staffRolesList = '';
                Object.entries(staffRoles).forEach(([name, roleId]) => {
                    if (roleId) {
                        staffRolesList += `${name}: <@&${roleId}>\n`;
                    }
                });

                const botsEmbed = new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("🤖 Bot Management")
                    .setDescription("Manage ticket bots and staff roles from mainconfig.js")
                    .addFields(
                        { name: "📋 Commands", value: "• `/botmanagement` - Configure ticket bot IDs\n• `/staffroles` - View staff role configuration\n• `/setup` - Quick ticket bot setup (in bot DM)", inline: false },
                        { name: "👥 Current Staff Roles", value: staffRolesList || "No staff roles configured", inline: false }
                    )
                    .setFooter({ text: "Staff roles are managed in mainconfig.js" })
                    .setTimestamp();

                await interaction.update({ embeds: [botsEmbed], components: [finalRow] });
            }

            else if (interaction.customId === 'dashboard_settings') {
                const settings = client.serversettings.get(message.guild.id) || {};
                
                const settingsEmbed = new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("⚙️ Server Settings")
                    .setDescription("Configure your staff management system settings.")
                    .addFields({ name: "⚡ Strike System", value: `**Strike Threshold:** ${settings['strike-threshold'] || 3} strikes\n**Auto-Timeout Duration:** ${formatDuration(settings['timeout-duration'] || 604800000)}\n**Auto-Ban Threshold:** ${settings['auto-ban-strikes'] || 5} strikes`, inline: true })
                    .addFields({ name: "🤖 AI Settings", value: `**AI Suggestions:** ${settings['ai-suggestions'] !== false ? '✅ Enabled' : '❌ Disabled'}\n**AI Sensitivity:** ${settings['ai-sensitivity'] || 'medium'}`, inline: true })
                    .addFields({ name: "🌴 LOA Settings", value: `**Auto-Restore Roles:** ${settings['loa-auto-restore'] !== false ? '✅ Yes' : '❌ No'}\n**Reminder Days:** ${settings['loa-reminder-days'] || 1} day(s) before`, inline: true })
                    .addFields({ name: "💡 How to Change", value: "Use the following commands:\n`settings strike-threshold <number>`\n`settings timeout-duration <1d|7d|14d>`\n`settings auto-ban-strikes <number>`" })
                    .setFooter({ text: "Click buttons to navigate" })
                    .setTimestamp();

                await interaction.update({ embeds: [settingsEmbed], components: [finalRow] });
            }
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('dashboard_moderation')
                        .setLabel('Moderation')
                        .setEmoji('📊')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('dashboard_staff')
                        .setLabel('Staff')
                        .setEmoji('👥')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('dashboard_loa')
                        .setLabel('LOA')
                        .setEmoji('🌴')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('dashboard_settings')
                        .setLabel('Settings')
                        .setEmoji('⚙️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

            if (isBotCreator) {
                disabledRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('dashboard_bots')
                        .setLabel('Bots')
                        .setEmoji('🤖')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true)
                );
            }

            dashboardMsg.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
}
