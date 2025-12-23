const { EmbedBuilder } = require('discord.js');
const moment = require('moment');

module.exports = {
    name: "staffstats",
    description: "📊 View detailed staff statistics and team performance!",
    usage: "staffstats [server|weekly|monthly]",
    aliases: ["teamstats", "serverstats", "stats"],

    run: async (client, message, args) => {
        const guildId = message.guild.id;
        const view = args[0]?.toLowerCase() || 'server';

        const allStaffData = [];
        client.staffstats.forEach((value, key) => {
            if (key.startsWith(guildId)) {
                const userId = key.split('-')[1];
                allStaffData.push({ id: userId, ...value });
            }
        });

        const totalActions = allStaffData.reduce((a, b) => a + b.actions, 0);
        const totalWarnings = allStaffData.reduce((a, b) => a + b.warnings, 0);
        const totalKicks = allStaffData.reduce((a, b) => a + b.kicks, 0);
        const totalBans = allStaffData.reduce((a, b) => a + b.bans, 0);
        const totalMutes = allStaffData.reduce((a, b) => a + b.mutes, 0);
        const totalHelped = allStaffData.reduce((a, b) => a + b.helpedUsers, 0);
        const totalTickets = allStaffData.reduce((a, b) => a + b.ticketsResolved, 0);

        const activeStaff = allStaffData.filter(s => {
            if (!s.lastActive) return false;
            const daysSinceActive = moment().diff(moment(s.lastActive), 'days');
            return daysSinceActive <= 7;
        }).length;

        const streakKings = allStaffData.filter(s => s.activityStreak >= 7).length;
        const legends = allStaffData.filter(s => s.actions >= 500).length;

        const topPerformer = allStaffData.sort((a, b) => b.actions - a.actions)[0];
        const longestStreakHolder = allStaffData.sort((a, b) => b.longestStreak - a.longestStreak)[0];

        const getProgressBar = (value, max, length = 15) => {
            const filled = Math.min(Math.round((value / max) * length), length);
            return '█'.repeat(filled) + '░'.repeat(length - filled);
        };

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("📊 ━━━ SERVER STAFF STATISTICS ━━━ 📊")
            .setDescription(`Comprehensive overview of your team's performance!\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        embed.addFields({ name: "👥 Staff Overview", value: `📋 **Total Staff:** ${allStaffData.length}\n` +
            `✅ **Active (7d):** ${activeStaff}\n` +
            `🔥 **On Streaks:** ${streakKings}\n` +
            `👑 **Legends (500+):** ${legends}`,
            inline: true });

        embed.addFields({ name: "📈 Total Actions", value: `🎯 **All Actions:** ${totalActions.toLocaleString()}\n` +
            `⚠️ **Warnings:** ${totalWarnings.toLocaleString()}\n` +
            `👢 **Kicks:** ${totalKicks.toLocaleString()}\n` +
            `🔨 **Bans:** ${totalBans.toLocaleString()}`,
            inline: true });

        embed.addFields({ name: "🌟 Helpfulness", value: `🤝 **Users Helped:** ${totalHelped.toLocaleString()}\n` +
            `🎫 **Tickets Resolved:** ${totalTickets.toLocaleString()}\n` +
            `🤐 **Mutes Issued:** ${totalMutes.toLocaleString()}`,
            inline: true });

        if (topPerformer) {
            const topUser = await client.users.fetch(topPerformer.id).catch(() => null);
            embed.addFields({ name: "🏆 Top Performer", value: `👤 **${topUser?.tag || 'Unknown'}**\n` +
                `📊 ${topPerformer.actions.toLocaleString()} total actions\n` +
                `🔥 ${topPerformer.activityStreak} day streak`,
                inline: true });
        }

        if (longestStreakHolder) {
            const streakUser = await client.users.fetch(longestStreakHolder.id).catch(() => null);
            embed.addFields({ name: "⚡ Streak Champion", value: `👤 **${streakUser?.tag || 'Unknown'}**\n` +
                `🏆 ${longestStreakHolder.longestStreak} day record\n` +
                `🔥 ${longestStreakHolder.activityStreak} current`, inline: true });
        }

        const avgActionsPerStaff = allStaffData.length > 0 ? Math.round(totalActions / allStaffData.length) : 0;
        const maxActions = Math.max(...allStaffData.map(s => s.actions), 1);

        embed.addFields({ name: "📊 Action Distribution", value: `⚠️ Warnings: ${getProgressBar(totalWarnings, totalActions || 1)}\n` +
            `👢 Kicks: ${getProgressBar(totalKicks, totalActions || 1)}\n` +
            `🔨 Bans: ${getProgressBar(totalBans, totalActions || 1)}\n` +
            `🤐 Mutes: ${getProgressBar(totalMutes, totalActions || 1)}`,
            inline: false });

        embed.addFields({ name: "📈 Averages & Insights", value: `📊 **Avg Actions/Staff:** ${avgActionsPerStaff.toLocaleString()}\n` +
            `👀 **Activity Rate:** ${allStaffData.length > 0 ? Math.round((activeStaff / allStaffData.length) * 100) : 0}%\n` +
            `🎯 **Team Health:** ${activeStaff >= allStaffData.length * 0.7 ? '🟢 Excellent' : activeStaff >= allStaffData.length * 0.4 ? '🟡 Good' : '🔴 Needs Attention'}`,
            inline: false });

        embed.setFooter({ text: "📊 Stats update in real-time • Keep up the great work, team!" })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
