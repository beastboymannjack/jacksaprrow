const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const { STAFF_RANKS, PROMOTION_MESSAGES, DEMOTION_MESSAGES, CELEBRATION_EMOJIS, EXCITEMENT_PHRASES } = require('../constants/staff.js');
const mainconfig = require("../../mainconfig.js");

class PromotionService {
    constructor(client) {
        this.client = client;
    }

    getRandomCelebration() {
        return CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
    }

    getRandomExcitement() {
        return EXCITEMENT_PHRASES[Math.floor(Math.random() * EXCITEMENT_PHRASES.length)];
    }

    getRandomPromotionMessage(userId, rankName) {
        const template = PROMOTION_MESSAGES[Math.floor(Math.random() * PROMOTION_MESSAGES.length)];
        return template.replace('{user}', `<@${userId}>`).replace('{rank}', rankName);
    }

    getRandomDemotionMessage(userId, rankName) {
        const template = DEMOTION_MESSAGES[Math.floor(Math.random() * DEMOTION_MESSAGES.length)];
        return template.replace('{user}', `<@${userId}>`).replace('{rank}', rankName);
    }

    ensureUserStats(userId) {
        this.client.staffstats.ensure(userId, {
            xp: 0,
            totalXp: 0,
            ticketsClosed: 0,
            ticketsClaimed: 0,
            botsCreated: 0,
            botsStarted: 0,
            modActions: 0,
            warnsIssued: 0,
            bansIssued: 0,
            helpfulResponses: 0,
            staffTrained: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            achievements: [],
            xpHistory: [],
            joinedAt: new Date(),
            promotions: [],
            demotions: [],
            loaHistory: []
        });
        return this.client.staffstats.get(userId);
    }

    ensureUserRank(userId) {
        this.client.staffranks.ensure(userId, {
            rank: 'TRAINEE',
            promotedAt: new Date(),
            promotedBy: null,
            roleHistory: []
        });
        return this.client.staffranks.get(userId);
    }

    hasStaffRole(member) {
        const staffRoles = [
            mainconfig.ServerRoles?.SupporterRoleId,
            mainconfig.ServerRoles?.BotCreatorRoleId,
            mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
            mainconfig.ServerRoles?.FounderId,
            mainconfig.ServerRoles?.NewSupporterRoleId,
            mainconfig.ServerRoles?.AdminRoleId,
            mainconfig.ServerRoles?.ModRoleId
        ].filter(Boolean);
        
        return staffRoles.some(roleId => member.roles.cache.has(roleId)) || 
               member.permissions.has("ADMINISTRATOR");
    }

    hasLeadPermission(member) {
        const leadRoles = [
            mainconfig.ServerRoles?.FounderId,
            mainconfig.ServerRoles?.OwnerRoleId,
            mainconfig.ServerRoles?.CoOwnerRoleId,
            mainconfig.ServerRoles?.AdminRoleId,
            mainconfig.ServerRoles?.ChiefHumanResources,
            mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
            mainconfig.ServerRoles?.ChiefSupporterRoleId
        ].filter(Boolean);
        
        return leadRoles.some(roleId => member.roles.cache.has(roleId)) || 
               member.permissions.has("ADMINISTRATOR");
    }

    hasAdminPermission(member) {
        const adminRoles = [
            mainconfig.ServerRoles?.FounderId,
            mainconfig.ServerRoles?.OwnerRoleId,
            mainconfig.ServerRoles?.CoOwnerRoleId,
            mainconfig.ServerRoles?.AdminRoleId
        ].filter(Boolean);
        
        return adminRoles.some(roleId => member.roles.cache.has(roleId)) || 
               member.permissions.has("ADMINISTRATOR");
    }

    getRankRoleId(rankKey) {
        const roleMapping = {
            'TRAINEE': mainconfig.ServerRoles?.NewSupporterRoleId,
            'JUNIOR': mainconfig.ServerRoles?.SupporterRoleId,
            'SENIOR': mainconfig.ServerRoles?.BotCreatorRoleId,
            'LEAD': mainconfig.ServerRoles?.ChiefSupporterRoleId,
            'MANAGER': mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
            'ADMIN': mainconfig.ServerRoles?.AdminRoleId
        };
        return roleMapping[rankKey] || null;
    }

    async updateDiscordRoles(member, oldRankKey, newRankKey) {
        const rolesChanged = { added: [], removed: [] };
        
        try {
            const oldRoleId = this.getRankRoleId(oldRankKey);
            const newRoleId = this.getRankRoleId(newRankKey);

            if (oldRoleId && member.roles.cache.has(oldRoleId)) {
                await member.roles.remove(oldRoleId);
                rolesChanged.removed.push(oldRoleId);
            }

            if (newRoleId && !member.roles.cache.has(newRoleId)) {
                await member.roles.add(newRoleId);
                rolesChanged.added.push(newRoleId);
            }
        } catch (error) {
            console.log(`[PromotionService] Role update error: ${error.message}`);
        }

        return rolesChanged;
    }

    checkEligibility(userId) {
        const stats = this.ensureUserStats(userId);
        const rankData = this.ensureUserRank(userId);
        const currentRank = STAFF_RANKS[rankData.rank];
        
        if (!currentRank) return { eligible: false, reason: 'Invalid current rank' };

        const rankKeys = Object.keys(STAFF_RANKS);
        const currentIndex = rankKeys.indexOf(rankData.rank);
        
        if (currentIndex === rankKeys.length - 1) {
            return { eligible: false, reason: 'Already at maximum rank', isMaxRank: true };
        }

        const nextRankKey = rankKeys[currentIndex + 1];
        const nextRank = STAFF_RANKS[nextRankKey];

        const timeInRank = Date.now() - new Date(rankData.promotedAt).getTime();
        const minTimeRequired = 7 * 24 * 60 * 60 * 1000;

        const eligibilityChecks = {
            hasEnoughXP: stats.totalXp >= nextRank.xpRequired,
            hasTimeInRank: timeInRank >= minTimeRequired,
            xpCurrent: stats.totalXp,
            xpRequired: nextRank.xpRequired,
            xpNeeded: Math.max(0, nextRank.xpRequired - stats.totalXp),
            daysInRank: Math.floor(timeInRank / (24 * 60 * 60 * 1000)),
            minDaysRequired: 7
        };

        const eligible = eligibilityChecks.hasEnoughXP;

        return {
            eligible,
            currentRank,
            currentRankKey: rankData.rank,
            nextRank,
            nextRankKey,
            ...eligibilityChecks,
            reason: eligible ? 'Meets all requirements!' : 
                   !eligibilityChecks.hasEnoughXP ? `Needs ${eligibilityChecks.xpNeeded.toLocaleString()} more XP` :
                   `Needs ${eligibilityChecks.minDaysRequired - eligibilityChecks.daysInRank} more days in rank`
        };
    }

    async promoteUser(userId, promoterId, reason = 'Promotion', guild = null) {
        const stats = this.ensureUserStats(userId);
        const rankData = this.ensureUserRank(userId);
        const currentRank = rankData.rank;
        const rankKeys = Object.keys(STAFF_RANKS);
        const currentIndex = rankKeys.indexOf(currentRank);

        if (currentIndex === rankKeys.length - 1) {
            return { success: false, error: 'User is already at maximum rank! 👑' };
        }

        const newRankKey = rankKeys[currentIndex + 1];
        const oldRankData = STAFF_RANKS[currentRank];
        const newRankData = STAFF_RANKS[newRankKey];

        rankData.rank = newRankKey;
        rankData.promotedAt = new Date();
        rankData.promotedBy = promoterId;
        rankData.roleHistory = rankData.roleHistory || [];
        rankData.roleHistory.push({
            from: currentRank,
            to: newRankKey,
            action: 'PROMOTION',
            by: promoterId,
            reason,
            date: new Date()
        });

        stats.promotions.push({
            from: currentRank,
            to: newRankKey,
            date: new Date(),
            by: promoterId,
            reason,
            xpAtPromotion: stats.totalXp
        });

        this.client.staffranks.set(userId, rankData);
        this.client.staffstats.set(userId, stats);

        let rolesChanged = { added: [], removed: [] };
        if (guild) {
            try {
                const member = await guild.members.fetch(userId);
                rolesChanged = await this.updateDiscordRoles(member, currentRank, newRankKey);
            } catch (error) {
                console.log(`[PromotionService] Could not update roles: ${error.message}`);
            }
        }

        return {
            success: true,
            oldRank: oldRankData,
            newRank: newRankData,
            oldRankKey: currentRank,
            newRankKey,
            rolesChanged,
            stats
        };
    }

    async demoteUser(userId, demoterId, reason = 'Demotion', guild = null) {
        const stats = this.ensureUserStats(userId);
        const rankData = this.ensureUserRank(userId);
        const currentRank = rankData.rank;
        const rankKeys = Object.keys(STAFF_RANKS);
        const currentIndex = rankKeys.indexOf(currentRank);

        if (currentIndex === 0) {
            return { success: false, error: 'User is already at minimum rank! 🌱' };
        }

        const newRankKey = rankKeys[currentIndex - 1];
        const oldRankData = STAFF_RANKS[currentRank];
        const newRankData = STAFF_RANKS[newRankKey];

        rankData.rank = newRankKey;
        rankData.promotedAt = new Date();
        rankData.promotedBy = demoterId;
        rankData.roleHistory = rankData.roleHistory || [];
        rankData.roleHistory.push({
            from: currentRank,
            to: newRankKey,
            action: 'DEMOTION',
            by: demoterId,
            reason,
            date: new Date()
        });

        stats.demotions.push({
            from: currentRank,
            to: newRankKey,
            date: new Date(),
            by: demoterId,
            reason
        });

        this.client.staffranks.set(userId, rankData);
        this.client.staffstats.set(userId, stats);

        let rolesChanged = { added: [], removed: [] };
        if (guild) {
            try {
                const member = await guild.members.fetch(userId);
                rolesChanged = await this.updateDiscordRoles(member, currentRank, newRankKey);
            } catch (error) {
                console.log(`[PromotionService] Could not update roles: ${error.message}`);
            }
        }

        return {
            success: true,
            oldRank: oldRankData,
            newRank: newRankData,
            oldRankKey: currentRank,
            newRankKey,
            rolesChanged,
            stats
        };
    }

    async setRank(userId, targetRankKey, setterId, reason = 'Rank set', guild = null) {
        const rankKey = targetRankKey.toUpperCase();
        if (!STAFF_RANKS[rankKey]) {
            return { success: false, error: `Invalid rank! Available ranks: ${Object.keys(STAFF_RANKS).join(', ')}` };
        }

        const stats = this.ensureUserStats(userId);
        const rankData = this.ensureUserRank(userId);
        const currentRank = rankData.rank;
        
        if (currentRank === rankKey) {
            return { success: false, error: `User is already at **${STAFF_RANKS[rankKey].name}** rank!` };
        }

        const oldRankData = STAFF_RANKS[currentRank];
        const newRankData = STAFF_RANKS[rankKey];
        const isPromotion = newRankData.level > oldRankData.level;

        rankData.rank = rankKey;
        rankData.promotedAt = new Date();
        rankData.promotedBy = setterId;
        rankData.roleHistory = rankData.roleHistory || [];
        rankData.roleHistory.push({
            from: currentRank,
            to: rankKey,
            action: isPromotion ? 'PROMOTION' : 'DEMOTION',
            by: setterId,
            reason,
            date: new Date()
        });

        if (isPromotion) {
            stats.promotions.push({
                from: currentRank,
                to: rankKey,
                date: new Date(),
                by: setterId,
                reason,
                xpAtPromotion: stats.totalXp
            });
        } else {
            stats.demotions.push({
                from: currentRank,
                to: rankKey,
                date: new Date(),
                by: setterId,
                reason
            });
        }

        this.client.staffranks.set(userId, rankData);
        this.client.staffstats.set(userId, stats);

        let rolesChanged = { added: [], removed: [] };
        if (guild) {
            try {
                const member = await guild.members.fetch(userId);
                rolesChanged = await this.updateDiscordRoles(member, currentRank, rankKey);
            } catch (error) {
                console.log(`[PromotionService] Could not update roles: ${error.message}`);
            }
        }

        return {
            success: true,
            oldRank: oldRankData,
            newRank: newRankData,
            oldRankKey: currentRank,
            newRankKey: rankKey,
            isPromotion,
            rolesChanged,
            stats
        };
    }

    generatePromotionEmbed(targetUser, result, promoterId) {
        const celebration = this.getRandomCelebration();
        const embed = new EmbedBuilder()
            .setColor(result.newRank.color)
            .setTitle(`${celebration} 🎊 PROMOTION ALERT! 🎊 ${celebration}`)
            .setDescription(this.getRandomPromotionMessage(targetUser.id, result.newRank.name))
            .addFields({ name: "📈 Rank Change", value: `${result.oldRank.emoji} **${result.oldRank.name}** → ${result.newRank.emoji} **${result.newRank.name}**`, inline: false })
            .addFields({ name: "✨ New Perks Unlocked", value: result.newRank.perks.map(p => `• ${p}`).join('\n'), inline: false })
            .addFields({ name: "👤 Promoted By", value: `<@${promoterId}>`, inline: true })
            .addFields({ name: "📅 Date", value: moment().format('MMMM Do, YYYY'), inline: true })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setImage('https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif')
            .setFooter({ text: `${this.getRandomExcitement()} • Staff Management System` })
            .setTimestamp();

        return embed;
    }

    generateDemotionEmbed(targetUser, result, demoterId, reason) {
        const embed = new EmbedBuilder()
            .setColor(result.newRank.color)
            .setTitle("📋 Rank Update")
            .setDescription(this.getRandomDemotionMessage(targetUser.id, result.newRank.name))
            .addFields({ name: "📉 Rank Change", value: `${result.oldRank.emoji} **${result.oldRank.name}** → ${result.newRank.emoji} **${result.newRank.name}**`, inline: false })
            .addFields({ name: "📝 Reason", value: reason, inline: false })
            .addFields({ name: "👤 Updated By", value: `<@${demoterId}>`, inline: true })
            .addFields({ name: "📅 Date", value: moment().format('MMMM Do, YYYY'), inline: true })
            .addFields({ name: "💪 Keep Going!", value: "This is just a step back to help you grow. We believe in you!", inline: false })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: "Staff Management System • You've got this!" })
            .setTimestamp();

        return embed;
    }

    generatePromotionDM(targetUser, result, guildName) {
        const celebration = this.getRandomCelebration();
        return new EmbedBuilder()
            .setColor(result.newRank.color)
            .setTitle(`${celebration} CONGRATULATIONS! You've Been Promoted! ${celebration}`)
            .setDescription(`🎉 **Amazing news!** 🎉\n\nYou've been promoted in **${guildName}**!\n\n${this.getRandomExcitement()}`)
            .addFields({ name: "🆕 Your New Rank", value: `${result.newRank.emoji} **${result.newRank.name}**`, inline: true })
            .addFields({ name: "⬆️ Previous Rank", value: `${result.oldRank.emoji} ${result.oldRank.name}`, inline: true })
            .addFields({ name: "✨ New Perks", value: result.newRank.perks.map(p => `• ${p}`).join('\n'), inline: false })
            .addFields({ name: "🎯 Keep It Up!", value: "Your hard work and dedication have been noticed. Continue being awesome!", inline: false })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: guildName })
            .setTimestamp();
    }

    generateDemotionDM(targetUser, result, guildName, reason) {
        return new EmbedBuilder()
            .setColor("#FEE75C")
            .setTitle("📋 Rank Update Notification")
            .setDescription(`Your rank in **${guildName}** has been updated.`)
            .addFields({ name: "📉 New Rank", value: `${result.newRank.emoji} **${result.newRank.name}**`, inline: true })
            .addFields({ name: "⬇️ Previous Rank", value: `${result.oldRank.emoji} ${result.oldRank.name}`, inline: true })
            .addFields({ name: "📝 Reason", value: reason, inline: false })
            .addFields({ name: "💪 Moving Forward", value: "This is an opportunity to grow and improve. We believe in your potential!\n\n" +
                "If you have questions, please reach out to a manager.", inline: false })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: guildName })
            .setTimestamp();
    }

    async sendDMNotification(user, embed) {
        try {
            await user.send({ embeds: [embed] });
            return { success: true };
        } catch (error) {
            console.log(`[PromotionService] Could not DM user ${user.tag}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    getBulkEligibleForPromotion() {
        const allRanks = this.client.staffranks.fetchEverything();
        const eligible = [];

        allRanks.forEach((rankData, userId) => {
            const eligibility = this.checkEligibility(userId);
            if (eligibility.eligible) {
                eligible.push({
                    userId,
                    currentRank: eligibility.currentRank,
                    currentRankKey: eligibility.currentRankKey,
                    nextRank: eligibility.nextRank,
                    nextRankKey: eligibility.nextRankKey,
                    xpCurrent: eligibility.xpCurrent,
                    xpRequired: eligibility.xpRequired,
                    daysInRank: eligibility.daysInRank
                });
            }
        });

        return eligible.sort((a, b) => b.xpCurrent - a.xpCurrent);
    }

    getRank(userId) {
        const rankData = this.ensureUserRank(userId);
        const rankKey = rankData.rank;
        const rank = STAFF_RANKS[rankKey];
        return { ...rank, key: rankKey, promotedAt: rankData.promotedAt, promotedBy: rankData.promotedBy };
    }

    getStats(userId) {
        return this.ensureUserStats(userId);
    }

    getRankHistory(userId) {
        const rankData = this.ensureUserRank(userId);
        return rankData.roleHistory || [];
    }

    getNextRank(userId) {
        const rankData = this.ensureUserRank(userId);
        const rankKeys = Object.keys(STAFF_RANKS);
        const currentIndex = rankKeys.indexOf(rankData.rank);
        
        if (currentIndex === rankKeys.length - 1) {
            return null;
        }

        const nextRankKey = rankKeys[currentIndex + 1];
        return { ...STAFF_RANKS[nextRankKey], key: nextRankKey };
    }

    getProgressToNextRank(userId) {
        const stats = this.ensureUserStats(userId);
        const currentRank = this.getRank(userId);
        const nextRank = this.getNextRank(userId);

        if (!nextRank) {
            return {
                currentXp: stats.totalXp,
                requiredXp: currentRank.xpRequired,
                progress: 100,
                xpNeeded: 0,
                isMaxRank: true
            };
        }

        const xpIntoCurrentRank = stats.totalXp - currentRank.xpRequired;
        const xpNeededForNext = nextRank.xpRequired - currentRank.xpRequired;
        const progress = Math.min(100, Math.floor((xpIntoCurrentRank / xpNeededForNext) * 100));

        return {
            currentXp: stats.totalXp,
            currentRankXp: currentRank.xpRequired,
            nextRankXp: nextRank.xpRequired,
            xpIntoRank: xpIntoCurrentRank,
            xpNeededForNext,
            progress,
            xpNeeded: nextRank.xpRequired - stats.totalXp,
            isMaxRank: false
        };
    }

    generateProgressBar(progress, length = 20) {
        const filled = Math.round((progress / 100) * length);
        const empty = length - filled;
        const filledChar = '█';
        const emptyChar = '░';
        return filledChar.repeat(filled) + emptyChar.repeat(empty);
    }

    logActivity(userId, action, details = {}) {
        const stats = this.ensureUserStats(userId);
        stats.activityLog = stats.activityLog || [];
        stats.activityLog.unshift({
            action,
            ...details,
            timestamp: new Date()
        });

        if (stats.activityLog.length > 100) {
            stats.activityLog = stats.activityLog.slice(0, 100);
        }

        this.client.staffstats.set(userId, stats);
    }
}

module.exports = PromotionService;
