const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const { STAFF_RANKS, XP_REWARDS, ACHIEVEMENTS, CELEBRATION_EMOJIS, EXCITEMENT_PHRASES, PROMOTION_MESSAGES } = require('../constants/staff.js');
const mainconfig = require("../../mainconfig.js");

class ProgressionService {
    constructor(client) {
        this.client = client;
    }

    getRandomCelebration() {
        return CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
    }

    getRandomExcitement() {
        return EXCITEMENT_PHRASES[Math.floor(Math.random() * EXCITEMENT_PHRASES.length)];
    }

    getRandomPromotion(user, rank) {
        const template = PROMOTION_MESSAGES[Math.floor(Math.random() * PROMOTION_MESSAGES.length)];
        return template.replace('{user}', `<@${user}>`).replace('{rank}', rank);
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
            demotions: []
        });
        return this.client.staffstats.get(userId);
    }

    ensureUserRank(userId) {
        this.client.staffranks.ensure(userId, {
            rank: 'TRAINEE',
            promotedAt: new Date(),
            promotedBy: null
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

    async addXP(userId, actionType, customAmount = null, reason = null) {
        const stats = this.ensureUserStats(userId);
        const rankData = this.ensureUserRank(userId);
        
        let xpAmount = customAmount;
        let xpEmoji = '✨';
        let xpMessage = reason || 'XP Reward';

        if (!customAmount && XP_REWARDS[actionType]) {
            const reward = XP_REWARDS[actionType];
            xpAmount = reward.xp;
            xpEmoji = reward.emoji;
            xpMessage = reward.message;
        }

        if (!xpAmount) return { success: false, error: 'Invalid action type' };

        this.updateStreak(userId);

        if (stats.currentStreak >= 7 && stats.currentStreak % 7 === 0) {
            xpAmount += XP_REWARDS.WEEK_STREAK.xp;
        }
        if (stats.currentStreak >= 30 && stats.currentStreak % 30 === 0) {
            xpAmount += XP_REWARDS.MONTH_STREAK.xp;
        }

        stats.xp += xpAmount;
        stats.totalXp += xpAmount;

        switch (actionType) {
            case 'TICKET_CLOSED': stats.ticketsClosed++; break;
            case 'TICKET_CLAIMED': stats.ticketsClaimed++; break;
            case 'BOT_CREATED': stats.botsCreated++; break;
            case 'BOT_STARTED': stats.botsStarted++; break;
            case 'MODERATION_ACTION': stats.modActions++; break;
            case 'WARN_ISSUED': stats.warnsIssued++; stats.modActions++; break;
            case 'BAN_ISSUED': stats.bansIssued++; stats.modActions++; break;
            case 'HELPFUL_RESPONSE': stats.helpfulResponses++; break;
            case 'MENTOR_BONUS': stats.staffTrained++; break;
        }

        stats.xpHistory.unshift({
            amount: xpAmount,
            type: actionType,
            emoji: xpEmoji,
            message: xpMessage,
            date: new Date()
        });

        if (stats.xpHistory.length > 50) {
            stats.xpHistory = stats.xpHistory.slice(0, 50);
        }

        this.client.staffstats.set(userId, stats);

        const newAchievements = await this.checkAchievements(userId);

        const promotionResult = await this.checkPromotion(userId);

        return {
            success: true,
            xpGained: xpAmount,
            totalXp: stats.totalXp,
            currentXp: stats.xp,
            emoji: xpEmoji,
            message: xpMessage,
            newAchievements,
            promoted: promotionResult.promoted,
            newRank: promotionResult.newRank
        };
    }

    async removeXP(userId, amount, reason = 'XP Removed') {
        const stats = this.ensureUserStats(userId);
        
        stats.xp = Math.max(0, stats.xp - amount);
        stats.totalXp = Math.max(0, stats.totalXp - amount);

        stats.xpHistory.unshift({
            amount: -amount,
            type: 'XP_REMOVED',
            emoji: '📉',
            message: reason,
            date: new Date()
        });

        this.client.staffstats.set(userId, stats);

        return {
            success: true,
            xpRemoved: amount,
            totalXp: stats.totalXp,
            currentXp: stats.xp
        };
    }

    updateStreak(userId) {
        const stats = this.ensureUserStats(userId);
        const today = moment().startOf('day');
        const lastActive = stats.lastActiveDate ? moment(stats.lastActiveDate).startOf('day') : null;

        if (!lastActive) {
            stats.currentStreak = 1;
            stats.lastActiveDate = new Date();
        } else if (today.diff(lastActive, 'days') === 0) {
            return stats.currentStreak;
        } else if (today.diff(lastActive, 'days') === 1) {
            stats.currentStreak++;
            stats.lastActiveDate = new Date();
            
            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
            }
        } else {
            stats.currentStreak = 1;
            stats.lastActiveDate = new Date();
        }

        this.client.staffstats.set(userId, stats);
        return stats.currentStreak;
    }

    async checkAchievements(userId) {
        const stats = this.ensureUserStats(userId);
        const newAchievements = [];

        for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
            if (stats.achievements.includes(achievement.id)) continue;

            let earned = false;

            switch (achievement.requirement.type) {
                case 'tickets_closed':
                    earned = stats.ticketsClosed >= achievement.requirement.count;
                    break;
                case 'bots_created':
                    earned = stats.botsCreated >= achievement.requirement.count;
                    break;
                case 'mod_actions':
                    earned = stats.modActions >= achievement.requirement.count;
                    break;
                case 'streak':
                    earned = stats.currentStreak >= achievement.requirement.count || 
                             stats.longestStreak >= achievement.requirement.count;
                    break;
                case 'staff_trained':
                    earned = stats.staffTrained >= achievement.requirement.count;
                    break;
                case 'total_xp':
                    earned = stats.totalXp >= achievement.requirement.count;
                    break;
                case 'special':
                    if (achievement.requirement.condition === 'early_activity') {
                        const hour = new Date().getHours();
                        earned = hour < 8;
                    } else if (achievement.requirement.condition === 'late_activity') {
                        const hour = new Date().getHours();
                        earned = hour >= 0 && hour < 5;
                    }
                    break;
            }

            if (earned) {
                stats.achievements.push(achievement.id);
                stats.xp += achievement.xpBonus;
                stats.totalXp += achievement.xpBonus;
                newAchievements.push({
                    ...achievement,
                    xpBonus: achievement.xpBonus
                });
            }
        }

        if (newAchievements.length > 0) {
            this.client.staffstats.set(userId, stats);
        }

        return newAchievements;
    }

    async checkPromotion(userId) {
        const stats = this.ensureUserStats(userId);
        const rankData = this.ensureUserRank(userId);
        const currentRank = STAFF_RANKS[rankData.rank];
        
        if (!currentRank) return { promoted: false };

        const rankKeys = Object.keys(STAFF_RANKS);
        const currentIndex = rankKeys.indexOf(rankData.rank);
        
        if (currentIndex === rankKeys.length - 1) {
            return { promoted: false };
        }

        const nextRankKey = rankKeys[currentIndex + 1];
        const nextRank = STAFF_RANKS[nextRankKey];

        if (stats.totalXp >= nextRank.xpRequired) {
            rankData.rank = nextRankKey;
            rankData.promotedAt = new Date();
            rankData.promotedBy = 'AUTO';

            stats.promotions.push({
                from: rankKeys[currentIndex],
                to: nextRankKey,
                date: new Date(),
                xpAtPromotion: stats.totalXp
            });

            this.client.staffranks.set(userId, rankData);
            this.client.staffstats.set(userId, stats);

            return {
                promoted: true,
                oldRank: currentRank,
                newRank: nextRank,
                newRankKey: nextRankKey
            };
        }

        return { promoted: false };
    }

    async promoteUser(userId, promoterId, targetRank = null) {
        const stats = this.ensureUserStats(userId);
        const rankData = this.ensureUserRank(userId);
        const currentRank = rankData.rank;
        const rankKeys = Object.keys(STAFF_RANKS);
        const currentIndex = rankKeys.indexOf(currentRank);

        let newRankKey;
        if (targetRank && STAFF_RANKS[targetRank.toUpperCase()]) {
            newRankKey = targetRank.toUpperCase();
        } else if (currentIndex < rankKeys.length - 1) {
            newRankKey = rankKeys[currentIndex + 1];
        } else {
            return { success: false, error: 'User is already at maximum rank!' };
        }

        rankData.rank = newRankKey;
        rankData.promotedAt = new Date();
        rankData.promotedBy = promoterId;

        stats.promotions.push({
            from: currentRank,
            to: newRankKey,
            date: new Date(),
            by: promoterId,
            xpAtPromotion: stats.totalXp
        });

        this.client.staffranks.set(userId, rankData);
        this.client.staffstats.set(userId, stats);

        return {
            success: true,
            oldRank: STAFF_RANKS[currentRank],
            newRank: STAFF_RANKS[newRankKey],
            oldRankKey: currentRank,
            newRankKey
        };
    }

    async demoteUser(userId, demoterId, targetRank = null) {
        const stats = this.ensureUserStats(userId);
        const rankData = this.ensureUserRank(userId);
        const currentRank = rankData.rank;
        const rankKeys = Object.keys(STAFF_RANKS);
        const currentIndex = rankKeys.indexOf(currentRank);

        let newRankKey;
        if (targetRank && STAFF_RANKS[targetRank.toUpperCase()]) {
            newRankKey = targetRank.toUpperCase();
        } else if (currentIndex > 0) {
            newRankKey = rankKeys[currentIndex - 1];
        } else {
            return { success: false, error: 'User is already at minimum rank!' };
        }

        rankData.rank = newRankKey;
        rankData.promotedAt = new Date();
        rankData.promotedBy = demoterId;

        stats.demotions.push({
            from: currentRank,
            to: newRankKey,
            date: new Date(),
            by: demoterId
        });

        this.client.staffranks.set(userId, rankData);
        this.client.staffstats.set(userId, stats);

        return {
            success: true,
            oldRank: STAFF_RANKS[currentRank],
            newRank: STAFF_RANKS[newRankKey],
            oldRankKey: currentRank,
            newRankKey
        };
    }

    getRank(userId) {
        const rankData = this.ensureUserRank(userId);
        const rankKey = rankData.rank;
        const rank = STAFF_RANKS[rankKey];
        return { ...rank, key: rankKey, promotedAt: rankData.promotedAt };
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

    getLeaderboard(limit = 10) {
        const allStats = this.client.staffstats.fetchEverything();
        const leaderboard = [];

        allStats.forEach((data, odId) => {
            leaderboard.push({
                odId,
                totalXp: data.totalXp || 0,
                ticketsClosed: data.ticketsClosed || 0,
                botsCreated: data.botsCreated || 0,
                currentStreak: data.currentStreak || 0,
                achievements: data.achievements?.length || 0
            });
        });

        leaderboard.sort((a, b) => b.totalXp - a.totalXp);

        return leaderboard.slice(0, limit).map((entry, index) => {
            const rankData = this.client.staffranks.get(entry.odId) || { rank: 'TRAINEE' };
            const rank = STAFF_RANKS[rankData.rank] || STAFF_RANKS.TRAINEE;
            return {
                ...entry,
                position: index + 1,
                rank,
                rankKey: rankData.rank
            };
        });
    }

    getStats(userId) {
        return this.ensureUserStats(userId);
    }

    getRecentXP(userId, limit = 5) {
        const stats = this.ensureUserStats(userId);
        return stats.xpHistory.slice(0, limit);
    }

    getAchievements(userId) {
        const stats = this.ensureUserStats(userId);
        const userAchievements = [];

        for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
            const unlocked = stats.achievements.includes(achievement.id);
            let progress = 0;
            let progressText = '';

            if (!unlocked) {
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
                    case 'staff_trained':
                        progress = Math.min(100, (stats.staffTrained / achievement.requirement.count) * 100);
                        progressText = `${stats.staffTrained}/${achievement.requirement.count}`;
                        break;
                    case 'total_xp':
                        progress = Math.min(100, (stats.totalXp / achievement.requirement.count) * 100);
                        progressText = `${stats.totalXp.toLocaleString()}/${achievement.requirement.count.toLocaleString()} XP`;
                        break;
                    case 'special':
                        progressText = 'Special condition';
                        break;
                }
            }

            userAchievements.push({
                ...achievement,
                key,
                unlocked,
                progress: Math.floor(progress),
                progressText
            });
        }

        return userAchievements;
    }

    getAchievementCount(userId) {
        const stats = this.ensureUserStats(userId);
        return {
            unlocked: stats.achievements.length,
            total: Object.keys(ACHIEVEMENTS).length
        };
    }

    formatXPGain(xpResult) {
        let message = `${xpResult.emoji} **+${xpResult.xpGained} XP** - ${xpResult.message}`;
        
        if (xpResult.newAchievements && xpResult.newAchievements.length > 0) {
            message += '\n\n🏆 **NEW ACHIEVEMENT(S)!**';
            for (const achievement of xpResult.newAchievements) {
                message += `\n${achievement.emoji} **${achievement.name}** (+${achievement.xpBonus} XP)`;
            }
        }

        if (xpResult.promoted) {
            message += `\n\n${this.getRandomCelebration()} **LEVEL UP!** ${this.getRandomCelebration()}`;
            message += `\nYou've been promoted to **${xpResult.newRank.emoji} ${xpResult.newRank.name}**!`;
        }

        return message;
    }
}

module.exports = ProgressionService;
