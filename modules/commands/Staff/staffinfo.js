const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const PromotionService = require('../../staff/promotionService.js');
const { STAFF_RANKS, ACHIEVEMENTS, CELEBRATION_EMOJIS } = require('../../constants/staff.js');

module.exports = {
    name: "staffinfo",
    description: "📊 View detailed staff profile with rank, XP, achievements, and stats!",
    usage: "staffinfo [@user]",
    aliases: ["staffprofile", "si", "profile", "staffcard"],

    run: async (client, message, args) => {
        const promotionService = new PromotionService(client);
        
        if (!promotionService.hasStaffRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Access Denied!")
                    .setDescription("**Oops!** You need to be a staff member to view staff profiles!\n\nIf you believe this is an error, please contact a manager. 💬")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const targetUser = message.mentions.users.first() || message.author;
        const stats = promotionService.getStats(targetUser.id);
        const currentRank = promotionService.getRank(targetUser.id);
        const nextRank = promotionService.getNextRank(targetUser.id);
        const progressData = promotionService.getProgressToNextRank(targetUser.id);
        const rankHistory = promotionService.getRankHistory(targetUser.id);
        
        const celebration = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
        const progressBar = promotionService.generateProgressBar(progressData.progress, 15);

        const timeInRank = moment(currentRank.promotedAt).fromNow(true);
        const joinedAt = moment(stats.joinedAt).format('MMM Do, YYYY');

        const mainEmbed = new EmbedBuilder()
            .setColor(currentRank.color)
            .setTitle(`${celebration} Staff Profile: ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields({ name: `${currentRank.emoji} Current Rank`, value: `**${currentRank.name}** (Level ${currentRank.level})\n` +
                `└ In rank for: ${timeInRank}`, inline: true })
            .addFields({ name: "⚡ Total XP", value: `**${stats.totalXp.toLocaleString()}**\n` +
                `└ Lifetime earnings`, inline: true })
            .addFields({ name: "🔥 Activity Streak", value: `**${stats.currentStreak}** day${stats.currentStreak !== 1 ? 's' : ''}\n` +
                `└ Best: ${stats.longestStreak} days`, inline: true });

        if (!progressData.isMaxRank && nextRank) {
            mainEmbed.addFields({ name: "📈 Progress to Next Rank", value: `${nextRank.emoji} **${nextRank.name}**\n` +
                `\`[${progressBar}]\` **${progressData.progress}%**\n` +
                `⚡ **${progressData.xpNeeded.toLocaleString()}** XP needed`, inline: false });
        } else {
            mainEmbed.addFields({ name: "👑 Maximum Rank Achieved!", value: `${celebration} **Legendary Status!** ${celebration}\n` +
                `You've reached the pinnacle of excellence!`, inline: false });
        }

        mainEmbed
            .addFields({ name: "🎫 Tickets", value: `Closed: **${stats.ticketsClosed}**\n` +
                `Claimed: **${stats.ticketsClaimed}**`, inline: true })
            .addFields({ name: "🤖 Bots", value: `Created: **${stats.botsCreated}**\n` +
                `Started: **${stats.botsStarted}**`, inline: true })
            .addFields({ name: "🔨 Moderation", value: `Actions: **${stats.modActions}**\n` +
                `Warns: **${stats.warnsIssued}** | Bans: **${stats.bansIssued}**`, inline: true });

        const unlockedAchievements = stats.achievements.length;
        const totalAchievements = Object.keys(ACHIEVEMENTS).length;
        const achievementPercent = Math.floor((unlockedAchievements / totalAchievements) * 100);

        mainEmbed.addFields({ name: "🏆 Achievements", value: `**${unlockedAchievements}/${totalAchievements}** unlocked (${achievementPercent}%)\n` +
            `└ Use the buttons below to view details!`, inline: false });

        mainEmbed
            .addFields({ name: "📅 Member Since", value: joinedAt, inline: true })
            .addFields({ name: "📊 Promotions", value: `**${stats.promotions.length}**`, inline: true })
            .addFields({ name: "💼 Staff Trained", value: `**${stats.staffTrained}**`, inline: true })
            .setFooter({ text: "Staff Management System • Use buttons for more details!", iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_achievements')
                    .setLabel('🏆 Achievements')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('view_history')
                    .setLabel('📜 Rank History')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('view_perks')
                    .setLabel('✨ Perks')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('view_xp')
                    .setLabel('⚡ XP Log')
                    .setStyle(ButtonStyle.Secondary)
            );

        const reply = await message.reply({ embeds: [mainEmbed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });

        collector.on('collect', async (interaction) => {
            let embed;

            switch (interaction.customId) {
                case 'view_achievements':
                    embed = await generateAchievementsEmbed(client, targetUser, stats);
                    break;
                case 'view_history':
                    embed = generateHistoryEmbed(targetUser, stats, rankHistory);
                    break;
                case 'view_perks':
                    embed = generatePerksEmbed(targetUser, currentRank);
                    break;
                case 'view_xp':
                    embed = generateXPLogEmbed(targetUser, stats);
                    break;
            }

            const backRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_main')
                        .setLabel('◀️ Back to Profile')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('view_achievements')
                        .setLabel('🏆')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(interaction.customId === 'view_achievements'),
                    new ButtonBuilder()
                        .setCustomId('view_history')
                        .setLabel('📜')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(interaction.customId === 'view_history'),
                    new ButtonBuilder()
                        .setCustomId('view_perks')
                        .setLabel('✨')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(interaction.customId === 'view_perks'),
                    new ButtonBuilder()
                        .setCustomId('view_xp')
                        .setLabel('⚡')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(interaction.customId === 'view_xp')
                );

            if (interaction.customId === 'back_main') {
                await interaction.update({ embeds: [mainEmbed], components: [row] });
            } else {
                await interaction.update({ embeds: [embed], components: [backRow] });
            }
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('expired')
                        .setLabel('Session Expired')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            reply.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};

async function generateAchievementsEmbed(client, targetUser, stats) {
    let unlockedText = '';
    let lockedText = '';

    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
        const unlocked = stats.achievements.includes(achievement.id);
        
        if (unlocked) {
            unlockedText += `${achievement.emoji} **${achievement.name}**\n└ ${achievement.description} (+${achievement.xpBonus} XP)\n\n`;
        } else {
            let progress = 0;
            let progressText = '';
            
            switch (achievement.requirement.type) {
                case 'tickets_closed':
                    progress = Math.min(100, (stats.ticketsClosed / achievement.requirement.count) * 100);
                    progressText = `${stats.ticketsClosed}/${achievement.requirement.count}`;
                    break;
                case 'bots_created':
                    progress = Math.min(100, (stats.botsCreated / achievement.requirement.count) * 100);
                    progressText = `${stats.botsCreated}/${achievement.requirement.count}`;
                    break;
                case 'mod_actions':
                    progress = Math.min(100, (stats.modActions / achievement.requirement.count) * 100);
                    progressText = `${stats.modActions}/${achievement.requirement.count}`;
                    break;
                case 'streak':
                    const bestStreak = Math.max(stats.currentStreak, stats.longestStreak);
                    progress = Math.min(100, (bestStreak / achievement.requirement.count) * 100);
                    progressText = `${bestStreak}/${achievement.requirement.count} days`;
                    break;
                case 'total_xp':
                    progress = Math.min(100, (stats.totalXp / achievement.requirement.count) * 100);
                    progressText = `${stats.totalXp.toLocaleString()}/${achievement.requirement.count.toLocaleString()}`;
                    break;
                default:
                    progressText = 'Special';
            }
            
            lockedText += `🔒 **${achievement.name}** (${Math.floor(progress)}%)\n└ ${achievement.description}\n\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`🏆 ${targetUser.username}'s Achievements`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    if (unlockedText) {
        embed.addFields({ name: "✅ Unlocked", value: unlockedText.substring(0, 1024), inline: false });
    }
    if (lockedText) {
        embed.addFields({ name: "🔒 Locked", value: lockedText.substring(0, 1024), inline: false });
    }

    embed.setFooter({ text: `${stats.achievements.length}/${Object.keys(ACHIEVEMENTS).length} achievements unlocked` });

    return embed;
}

function generateHistoryEmbed(targetUser, stats, rankHistory) {
    let historyText = '';

    const combinedHistory = [
        ...stats.promotions.map(p => ({ ...p, type: 'PROMOTION' })),
        ...stats.demotions.map(d => ({ ...d, type: 'DEMOTION' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (combinedHistory.length === 0) {
        historyText = '*No rank changes recorded yet.*\n\nKeep up the great work and your first promotion will come soon! 🌟';
    } else {
        for (const entry of combinedHistory.slice(0, 10)) {
            const emoji = entry.type === 'PROMOTION' ? '⬆️' : '⬇️';
            const fromRank = STAFF_RANKS[entry.from] || { emoji: '❓', name: entry.from };
            const toRank = STAFF_RANKS[entry.to] || { emoji: '❓', name: entry.to };
            const date = moment(entry.date).format('MMM Do, YYYY');
            
            historyText += `${emoji} **${entry.type}** - ${date}\n`;
            historyText += `└ ${fromRank.emoji} ${fromRank.name} → ${toRank.emoji} ${toRank.name}\n`;
            if (entry.reason) {
                historyText += `└ 📝 ${entry.reason.substring(0, 50)}${entry.reason.length > 50 ? '...' : ''}\n`;
            }
            historyText += '\n';
        }
    }

    return new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`📜 ${targetUser.username}'s Rank History`)
        .setDescription(historyText)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields({ name: "📊 Summary", value: `⬆️ Promotions: **${stats.promotions.length}**\n` +
            `⬇️ Demotions: **${stats.demotions.length}**`, inline: true })
        .setFooter({ text: "Showing last 10 rank changes" });
}

function generatePerksEmbed(targetUser, currentRank) {
    let perksText = currentRank.perks.map((p, i) => `**${i + 1}.** ${p}`).join('\n');
    
    let allPerksText = '';
    const rankKeys = Object.keys(STAFF_RANKS);
    const currentIndex = rankKeys.indexOf(currentRank.key);
    
    for (let i = 0; i <= currentIndex; i++) {
        const rank = STAFF_RANKS[rankKeys[i]];
        allPerksText += `${rank.emoji} **${rank.name}**\n`;
        allPerksText += rank.perks.map(p => `└ ${p}`).join('\n') + '\n\n';
    }

    return new EmbedBuilder()
        .setColor(currentRank.color)
        .setTitle(`✨ ${targetUser.username}'s Perks`)
        .setDescription(`**Current Rank:** ${currentRank.emoji} ${currentRank.name}`)
        .addFields({ name: "🎁 Your Active Perks", value: perksText, inline: false })
        .addFields({ name: "📋 All Unlocked Perks by Rank", value: allPerksText.substring(0, 1024), inline: false })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Perks unlock as you rank up!" });
}

function generateXPLogEmbed(targetUser, stats) {
    let xpText = '';

    if (stats.xpHistory.length === 0) {
        xpText = '*No XP history recorded yet.*\n\nStart earning XP by helping out! 💪';
    } else {
        for (const entry of stats.xpHistory.slice(0, 15)) {
            const sign = entry.amount >= 0 ? '+' : '';
            const timeAgo = moment(entry.date).fromNow();
            xpText += `${entry.emoji} **${sign}${entry.amount}** - ${entry.message}\n`;
            xpText += `└ *${timeAgo}*\n\n`;
        }
    }

    return new EmbedBuilder()
        .setColor("#57F287")
        .setTitle(`⚡ ${targetUser.username}'s XP Log`)
        .setDescription(xpText)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields({ name: "📊 XP Stats", value: `⚡ Total XP: **${stats.totalXp.toLocaleString()}**\n` +
            `🔥 Current Streak: **${stats.currentStreak}** days\n` +
            `🏆 Best Streak: **${stats.longestStreak}** days`, inline: false })
        .setFooter({ text: `Showing last ${Math.min(15, stats.xpHistory.length)} XP entries` });
}
