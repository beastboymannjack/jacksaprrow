const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: "leaderboard",
    description: "🏆 View the staff leaderboard and top performers!",
    usage: "leaderboard [weekly|monthly|all]",
    aliases: ["lb", "top", "rankings", "stafflb"],

    run: async (client, message, args) => {
        const guildId = message.guild.id;
        const period = args[0]?.toLowerCase() || 'all';

        const allStaffData = [];
        
        client.staffstats.forEach((value, key) => {
            if (key.startsWith(guildId)) {
                const userId = key.split('-')[1];
                allStaffData.push({
                    id: userId,
                    ...value
                });
            }
        });

        if (allStaffData.length === 0) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("📊 Staff Leaderboard")
                    .setDescription("🌱 No staff data yet! Start taking moderation actions to appear on the leaderboard!\n\n" +
                        "💡 **Tip:** Every warning, kick, ban, and helpful action counts towards your score!")
                    .setFooter({ text: "Be the first to claim the #1 spot! 🏆" })
                ]
            });
        }

        allStaffData.sort((a, b) => b.actions - a.actions);

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const rankEmojis = ['👑', '⚡', '🔥', '💫', '✨'];

        let leaderboardText = '';
        const topTen = allStaffData.slice(0, 10);

        for (let i = 0; i < topTen.length; i++) {
            const staff = topTen[i];
            const medal = medals[i] || `${i + 1}.`;
            const user = await client.users.fetch(staff.id).catch(() => null);
            const username = user?.username || 'Unknown User';
            
            let statusEmoji = '';
            if (staff.activityStreak >= 7) statusEmoji = '🔥';
            if (staff.activityStreak >= 30) statusEmoji = '⚡';
            if (staff.actions >= 500) statusEmoji = '👑';

            leaderboardText += `${medal} **${username}** ${statusEmoji}\n`;
            leaderboardText += `┗ 📊 ${staff.actions.toLocaleString()} actions | 🔥 ${staff.activityStreak}d streak\n\n`;
        }

        const userRank = allStaffData.findIndex(s => s.id === message.author.id) + 1;
        const userData = allStaffData.find(s => s.id === message.author.id);

        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("🏆 ━━━ STAFF LEADERBOARD ━━━ 🏆")
            .setDescription(`**Top performing staff members!**\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                leaderboardText +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        if (userRank > 0) {
            embed.addFields({ name: "📍 Your Position", value: `**#${userRank}** out of ${allStaffData.length} staff members\n` +
                `📊 **Actions:** ${userData.actions.toLocaleString()} | 🔥 **Streak:** ${userData.activityStreak} days`,
                inline: false });
        }

        const stats = {
            totalActions: allStaffData.reduce((a, b) => a + b.actions, 0),
            totalStaff: allStaffData.length,
            avgActions: Math.round(allStaffData.reduce((a, b) => a + b.actions, 0) / allStaffData.length)
        };

        embed.addFields({ name: "📈 Server Stats", value: `👥 **Active Staff:** ${stats.totalStaff}\n` +
            `📊 **Total Actions:** ${stats.totalActions.toLocaleString()}\n` +
            `📉 **Avg per Staff:** ${stats.avgActions.toLocaleString()}`,
            inline: true });

        embed.addFields({ name: "🌟 Legend", value: `👑 = 500+ actions\n` +
            `⚡ = 30+ day streak\n` +
            `🔥 = 7+ day streak`, inline: true });

        embed.setFooter({ text: "💪 Keep grinding to climb the ranks! Updated in real-time!" })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('lb_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('lb_mystats')
                    .setLabel('📊 My Stats')
                    .setStyle(ButtonStyle.Secondary)
            );

        const msg = await message.reply({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'lb_mystats') {
                const myData = allStaffData.find(s => s.id === message.author.id);
                if (myData) {
                    const statsEmbed = new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle(`📊 ${message.author.username}'s Stats`)
                        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                        .setDescription(`**Rank #${userRank}** on the leaderboard!\n\n` +
                            `🎯 **Total Actions:** ${myData.actions.toLocaleString()}\n` +
                            `⚠️ **Warnings:** ${myData.warnings.toLocaleString()}\n` +
                            `👢 **Kicks:** ${myData.kicks.toLocaleString()}\n` +
                            `🔨 **Bans:** ${myData.bans.toLocaleString()}\n` +
                            `🔥 **Current Streak:** ${myData.activityStreak} days\n` +
                            `🏆 **Best Streak:** ${myData.longestStreak} days`)
                        .setFooter({ text: "Keep up the great work! 💪" });
                    await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ content: "You don't have any stats yet! Start moderating to appear on the leaderboard! 🌟", ephemeral: true });
                }
            } else {
                await interaction.update({ embeds: [embed], components: [row] });
            }
        });
    }
};
