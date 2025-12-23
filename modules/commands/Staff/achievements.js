const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const ProgressionService = require('../../staff/progressionService.js');
const { ACHIEVEMENTS, CELEBRATION_EMOJIS } = require('../../constants/staff.js');

module.exports = {
    name: "achievements",
    description: "🏆 View all achievements and your progress towards unlocking them!",
    usage: "achievements [@user]",
    aliases: ["achieve", "badges", "trophies", "medals"],

    run: async (client, message, args) => {
        const progressionService = new ProgressionService(client);
        
        if (!progressionService.hasStaffRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Access Denied!")
                    .setDescription("**Oops!** You need to be a staff member to view achievements!\n\nIf you believe this is an error, please contact a manager. 💬")
                    .setFooter({ text: "Staff Achievement System" })
                ]
            });
        }

        const targetUser = message.mentions.users.first() || message.author;
        const achievements = progressionService.getAchievements(targetUser.id);
        const achievementCount = progressionService.getAchievementCount(targetUser.id);

        const unlockedAchievements = achievements.filter(a => a.unlocked);
        const lockedAchievements = achievements.filter(a => !a.unlocked);

        const celebration = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
        const completionPercent = Math.floor((achievementCount.unlocked / achievementCount.total) * 100);

        const overviewEmbed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle(`🏆 ${targetUser.username}'s Achievement Showcase`)
            .setDescription(`${celebration} **Achievement Progress** ${celebration}\n\n` +
                `**${achievementCount.unlocked}** / **${achievementCount.total}** achievements unlocked!\n` +
                `\`[${progressionService.generateProgressBar(completionPercent, 20)}]\` **${completionPercent}%**\n\n` +
                `${completionPercent === 100 ? '🌟 **LEGENDARY STATUS - ALL ACHIEVEMENTS UNLOCKED!** 🌟' : 
                completionPercent >= 75 ? '🔥 Almost there! Keep pushing!' :
                completionPercent >= 50 ? '⭐ Halfway there! Great progress!' :
                completionPercent >= 25 ? '💪 Good start! Keep it up!' :
                '🌱 Your journey begins! So much to unlock!'}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: "Staff Achievement System • Use buttons to navigate!", iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        if (unlockedAchievements.length > 0) {
            let unlockedText = '';
            for (const achievement of unlockedAchievements.slice(0, 8)) {
                unlockedText += `${achievement.emoji} **${achievement.name}**\n└ *${achievement.description}*\n`;
            }
            if (unlockedAchievements.length > 8) {
                unlockedText += `\n*...and ${unlockedAchievements.length - 8} more!*`;
            }
            overviewEmbed.addFields({ name: `✅ Unlocked (${unlockedAchievements.length})`, value: unlockedText, inline: false });
        }

        if (lockedAchievements.length > 0) {
            let lockedText = '';
            const closestToUnlock = lockedAchievements.sort((a, b) => b.progress - a.progress).slice(0, 3);
            for (const achievement of closestToUnlock) {
                lockedText += `🔒 **${achievement.name}** - ${achievement.progress}%\n`;
                lockedText += `└ ${achievement.progressText}\n`;
            }
            overviewEmbed.addFields({ name: "🎯 Closest to Unlock", value: lockedText, inline: false });
        }

        const unlockedEmbed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle(`✅ ${targetUser.username}'s Unlocked Achievements`)
            .setDescription(unlockedAchievements.length > 0 
                ? `${celebration} **${unlockedAchievements.length} achievements earned!** ${celebration}\n\nThese represent your incredible dedication and hard work!`
                : `*No achievements unlocked yet!*\n\nStart earning XP by helping out to unlock achievements! 💪`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Staff Achievement System" })
            .setTimestamp();

        if (unlockedAchievements.length > 0) {
            let totalBonus = 0;
            for (const achievement of unlockedAchievements) {
                unlockedEmbed.addFields({ name: `${achievement.emoji} ${achievement.name}`, value: `*${achievement.description}*\n💰 +${achievement.xpBonus} XP bonus`, inline: true });
                totalBonus += achievement.xpBonus;
            }
            unlockedEmbed.addFields({ name: "💎 Total Bonus XP Earned", value: `**${totalBonus.toLocaleString()}** XP from achievements!`, inline: false });
        }

        const lockedEmbed = new EmbedBuilder()
            .setColor("#99AAB5")
            .setTitle(`🔒 ${targetUser.username}'s Locked Achievements`)
            .setDescription(lockedAchievements.length > 0
                ? `**${lockedAchievements.length} achievements** waiting to be unlocked!\n\nKeep working hard - these rewards are within reach! ✨`
                : `${celebration} **ALL ACHIEVEMENTS UNLOCKED!** ${celebration}\n\nYou've done it! You're a true legend! 👑`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Staff Achievement System" })
            .setTimestamp();

        if (lockedAchievements.length > 0) {
            const sortedLocked = lockedAchievements.sort((a, b) => b.progress - a.progress);
            for (const achievement of sortedLocked.slice(0, 9)) {
                const progressBar = progressionService.generateProgressBar(achievement.progress, 8);
                lockedEmbed.addFields({ name: `🔒 ${achievement.name}`, value: `*${achievement.description}*\n\`[${progressBar}]\` ${achievement.progress}%\n📊 ${achievement.progressText}\n💰 Reward: +${achievement.xpBonus} XP`, inline: true });
            }
            if (sortedLocked.length > 9) {
                lockedEmbed.addFields({ name: "📋 More Achievements", value: `*${sortedLocked.length - 9} more achievements to discover!*`, inline: false });
            }
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('achievements_overview')
                    .setLabel('Overview')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('achievements_unlocked')
                    .setLabel(`Unlocked (${unlockedAchievements.length})`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('achievements_locked')
                    .setLabel(`Locked (${lockedAchievements.length})`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('achievements_rare')
                    .setLabel('Rare')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💎')
            );

        const reply = await message.reply({ embeds: [overviewEmbed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'achievements_overview') {
                await interaction.update({ embeds: [overviewEmbed], components: [row] });
            } else if (interaction.customId === 'achievements_unlocked') {
                await interaction.update({ embeds: [unlockedEmbed], components: [row] });
            } else if (interaction.customId === 'achievements_locked') {
                await interaction.update({ embeds: [lockedEmbed], components: [row] });
            } else if (interaction.customId === 'achievements_rare') {
                const rareAchievements = achievements.filter(a => a.xpBonus >= 300);
                const rareEmbed = new EmbedBuilder()
                    .setColor("#9B59B6")
                    .setTitle(`💎 Rare & Legendary Achievements`)
                    .setDescription(`**These are the most prestigious achievements!**\n\nOnly the most dedicated staff members can earn these legendary rewards! ✨`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Staff Achievement System" })
                    .setTimestamp();

                for (const achievement of rareAchievements) {
                    const status = achievement.unlocked ? '✅ UNLOCKED' : `🔒 ${achievement.progress}%`;
                    rareEmbed.addFields({ name: `${achievement.emoji} ${achievement.name}`, value: `*${achievement.description}*\n💰 **+${achievement.xpBonus} XP**\n${status}`, inline: true });
                }

                await interaction.update({ embeds: [rareEmbed], components: [row] });
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
