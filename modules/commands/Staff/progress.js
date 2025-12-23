const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const ProgressionService = require('../../staff/progressionService.js');
const { STAFF_RANKS, CELEBRATION_EMOJIS } = require('../../constants/staff.js');

module.exports = {
    name: "progress",
    description: "🚀 View your amazing staff progress, XP, rank, and journey to the top!",
    usage: "progress [@user]",
    aliases: ["rank", "level", "profile", "stats"],

    run: async (client, message, args) => {
        const progressionService = new ProgressionService(client);
        
        if (!progressionService.hasStaffRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Access Denied!")
                    .setDescription("**Oops!** You need to be a staff member to view progression stats!\n\nIf you believe this is an error, please contact a manager. 💬")
                    .setFooter({ text: "Staff Progression System" })
                ]
            });
        }

        const targetUser = message.mentions.users.first() || message.author;
        const targetMember = message.guild.members.cache.get(targetUser.id);

        if (targetUser.id !== message.author.id && !progressionService.hasStaffRole(targetMember)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ User Not Found!")
                    .setDescription("That user is not a staff member!")
                    .setFooter({ text: "Staff Progression System" })
                ]
            });
        }

        const stats = progressionService.getStats(targetUser.id);
        const currentRank = progressionService.getRank(targetUser.id);
        const nextRank = progressionService.getNextRank(targetUser.id);
        const progressData = progressionService.getProgressToNextRank(targetUser.id);
        const recentXP = progressionService.getRecentXP(targetUser.id, 5);
        const achievementCount = progressionService.getAchievementCount(targetUser.id);
        const leaderboard = progressionService.getLeaderboard(50);
        const userPosition = leaderboard.findIndex(e => e.odId === targetUser.id) + 1;

        const celebration = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
        const progressBar = progressionService.generateProgressBar(progressData.progress, 15);

        let rankProgressField = '';
        if (progressData.isMaxRank) {
            rankProgressField = `${celebration} **MAX RANK ACHIEVED!** ${celebration}\nYou've reached the pinnacle of excellence!`;
        } else {
            rankProgressField = `**Progress to ${nextRank.emoji} ${nextRank.name}:**\n`;
            rankProgressField += `\`[${progressBar}]\` **${progressData.progress}%**\n`;
            rankProgressField += `📊 \`${stats.totalXp.toLocaleString()}\` / \`${nextRank.xpRequired.toLocaleString()}\` XP\n`;
            rankProgressField += `⚡ **${progressData.xpNeeded.toLocaleString()}** XP needed!`;
        }

        let recentXPField = '';
        if (recentXP.length > 0) {
            for (const xp of recentXP) {
                const timeAgo = moment(xp.date).fromNow();
                const sign = xp.amount >= 0 ? '+' : '';
                recentXPField += `${xp.emoji} **${sign}${xp.amount}** - ${xp.message}\n└ ${timeAgo}\n`;
            }
        } else {
            recentXPField = '*No recent XP gains yet!*\nStart helping out to earn XP! 💪';
        }

        let streakField = '';
        if (stats.currentStreak > 0) {
            const fireEmoji = stats.currentStreak >= 7 ? '🔥' : '📅';
            streakField = `${fireEmoji} **${stats.currentStreak}** day${stats.currentStreak > 1 ? 's' : ''} streak!`;
            if (stats.currentStreak >= 7) {
                streakField += ' 🎉';
            }
            if (stats.longestStreak > stats.currentStreak) {
                streakField += `\n🏆 Best: **${stats.longestStreak}** days`;
            }
        } else {
            streakField = '😴 No active streak\n*Be active today to start one!*';
        }

        const embed = new EmbedBuilder()
            .setColor(currentRank.color)
            .setTitle(`${currentRank.emoji} ${targetUser.username}'s Staff Profile`)
            .setDescription(`${celebration} **Welcome to your progression dashboard!** ${celebration}\n\n${targetUser.id === message.author.id ? progressionService.getRandomExcitement() : `Let's see how ${targetUser.username} is doing!`}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields({ name: `${currentRank.emoji} Current Rank`, value: `**${currentRank.name}**\n*Level ${currentRank.level}*`, inline: true })
            .addFields({ name: "⚡ Total XP", value: `**${stats.totalXp.toLocaleString()}**`, inline: true })
            .addFields({ name: "🏆 Leaderboard", value: userPosition > 0 ? `#${userPosition}` : 'Unranked', inline: true })
            .addFields({ name: "📈 Rank Progress", value: rankProgressField, inline: false })
            .addFields({ name: "🔥 Activity Streak", value: streakField, inline: true })
            .addFields({ name: "🏅 Achievements", value: `**${achievementCount.unlocked}**/${achievementCount.total} unlocked`, inline: true })
            .addFields({ name: "📋 Recent XP", value: recentXPField, inline: false })
            .setFooter({ text: `Staff since ${moment(stats.joinedAt).format('MMM Do, YYYY')} • Use ,achievements for more!`, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const statsEmbed = new EmbedBuilder()
            .setColor(currentRank.color)
            .setTitle(`📊 ${targetUser.username}'s Detailed Stats`)
            .addFields({ name: "🎫 Tickets", value: `**${stats.ticketsClosed}** closed\n**${stats.ticketsClaimed}** claimed`, inline: true })
            .addFields({ name: "🤖 Bots", value: `**${stats.botsCreated}** created\n**${stats.botsStarted}** started`, inline: true })
            .addFields({ name: "🔨 Moderation", value: `**${stats.modActions}** actions\n**${stats.warnsIssued}** warns\n**${stats.bansIssued}** bans`, inline: true })
            .addFields({ name: "💬 Other", value: `**${stats.helpfulResponses}** helpful responses\n**${stats.staffTrained}** staff trained`, inline: true })
            .addFields({ name: "📅 Streaks", value: `Current: **${stats.currentStreak}** days\nLongest: **${stats.longestStreak}** days`, inline: true })
            .addFields({ name: "📈 History", value: `**${stats.promotions.length}** promotion(s)\n**${stats.demotions.length}** demotion(s)`, inline: true })
            .setFooter({ text: "Staff Progression System" })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('progress_overview')
                    .setLabel('Overview')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('progress_stats')
                    .setLabel('Detailed Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('progress_perks')
                    .setLabel('Rank Perks')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✨')
            );

        const reply = await message.reply({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'progress_overview') {
                await interaction.update({ embeds: [embed], components: [row] });
            } else if (interaction.customId === 'progress_stats') {
                await interaction.update({ embeds: [statsEmbed], components: [row] });
            } else if (interaction.customId === 'progress_perks') {
                const perksEmbed = new EmbedBuilder()
                    .setColor(currentRank.color)
                    .setTitle(`${currentRank.emoji} ${currentRank.name} - Rank Perks`)
                    .setDescription(`**Your current rank unlocks these amazing perks!**`)
                    .addFields({ name: "✨ Current Perks", value: currentRank.perks.map(p => `• ${p}`).join('\n'), inline: false });

                if (nextRank) {
                    perksEmbed.addFields({ name: `🔮 Next Rank: ${nextRank.emoji} ${nextRank.name}`, value: `*Unlocks at ${nextRank.xpRequired.toLocaleString()} XP*\n\n` +
                        nextRank.perks.map(p => `• ${p}`).join('\n'), inline: false });
                }

                perksEmbed.setFooter({ text: "Keep earning XP to unlock more perks!" });

                await interaction.update({ embeds: [perksEmbed], components: [row] });
            }
        });

        collector.on('end', async () => {
            try {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                    );
                await reply.edit({ components: [disabledRow] });
            } catch (e) {}
        });
    }
};
