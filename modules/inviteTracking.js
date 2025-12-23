const Enmap = require('enmap');
const path = require('path');

/**
 * Invite Tracking System
 * Tracks invites, prevents duplicates, manages 7-day expiration
 */
class InviteTracking {
    constructor() {
        // Store invite records: { userId -> { invitedUsers: [{ id, timestamp, botName, expiresAt }] } }
        this.inviteDB = new Enmap({ name: "inviteTracking", dataDir: "./dbs/invites" });
        
        // Store bot expiration: { botName -> { createdAt, expiresAt, invitesUsed: [userId] } }
        this.botExpirationDB = new Enmap({ name: "botExpiration", dataDir: "./dbs/invites" });
        
        // Initialize
        this.initDB();
    }

    initDB() {
        // Ensure databases are ready
        this.inviteDB.defer;
        this.botExpirationDB.defer;
    }

    /**
     * Track a new invite - record that user X invited person Y
     * @param {string} userId - ID of user making the invite
     * @param {string} invitedUserId - ID of invited user
     * @param {string} botName - Name of bot being created with these invites
     * @returns {boolean} - true if tracked, false if already invited
     */
    trackInvite(userId, invitedUserId, botName = null) {
        try {
            // Check if this user was already invited by this person
            if (this.isUserAlreadyInvited(userId, invitedUserId)) {
                return false;
            }

            // Get user's invite history
            const userKey = `user_${userId}`;
            let inviteRecord = this.inviteDB.get(userKey) || { invitedUsers: [] };

            // Add new invite record
            inviteRecord.invitedUsers.push({
                invitedUserId,
                timestamp: Date.now(),
                botName,
                marked: false // Will be marked as used when bot is created
            });

            this.inviteDB.set(userKey, inviteRecord);
            return true;
        } catch (err) {
            console.error('[InviteTracking] Error tracking invite:', err);
            return false;
        }
    }

    /**
     * Check if a user was already invited by another user
     * @param {string} userId - ID of user who did the inviting
     * @param {string} invitedUserId - ID of the person to check
     * @returns {boolean} - true if already invited
     */
    isUserAlreadyInvited(userId, invitedUserId) {
        try {
            const userKey = `user_${userId}`;
            const inviteRecord = this.inviteDB.get(userKey);

            if (!inviteRecord) return false;

            return inviteRecord.invitedUsers.some(invite => invite.invitedUserId === invitedUserId);
        } catch (err) {
            console.error('[InviteTracking] Error checking if user invited:', err);
            return false;
        }
    }

    /**
     * Mark invites as used when a bot is created
     * @param {string} userId - ID of user creating the bot
     * @param {string} botName - Name of the bot being created
     * @param {number} invitesNeeded - How many invites are required
     * @returns {object} - { success: boolean, markedCount: number }
     */
    markInvitesAsUsed(userId, botName, invitesNeeded = 5) {
        try {
            const userKey = `user_${userId}`;
            let inviteRecord = this.inviteDB.get(userKey) || { invitedUsers: [] };
            
            // Find unused invites
            const unusedInvites = inviteRecord.invitedUsers.filter(inv => !inv.marked);
            
            if (unusedInvites.length < invitesNeeded) {
                return { success: false, markedCount: 0, message: 'Not enough invites available' };
            }

            // Mark the required number of invites as used
            let markedCount = 0;
            for (let i = 0; i < invitesNeeded && i < inviteRecord.invitedUsers.length; i++) {
                if (!inviteRecord.invitedUsers[i].marked) {
                    inviteRecord.invitedUsers[i].marked = true;
                    inviteRecord.invitedUsers[i].botName = botName;
                    markedCount++;
                }
            }

            this.inviteDB.set(userKey, inviteRecord);

            // Record bot creation with expiration (7 days from now)
            const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
            this.botExpirationDB.set(`bot_${botName}`, {
                createdAt: Date.now(),
                expiresAt,
                ownerId: userId,
                invitesUsed: unusedInvites.slice(0, invitesNeeded).map(inv => inv.invitedUserId),
                renewed: false
            });

            return { success: true, markedCount, expiresAt };
        } catch (err) {
            console.error('[InviteTracking] Error marking invites as used:', err);
            return { success: false, markedCount: 0, message: err.message };
        }
    }

    /**
     * Get bot expiration info
     * @param {string} botName - Name of the bot
     * @returns {object} - Expiration details or null
     */
    getBotExpiration(botName) {
        try {
            const botKey = `bot_${botName}`;
            return this.botExpirationDB.get(botKey) || null;
        } catch (err) {
            console.error('[InviteTracking] Error getting bot expiration:', err);
            return null;
        }
    }

    /**
     * Check if a bot's hosting has expired
     * @param {string} botName - Name of the bot
     * @returns {boolean} - true if expired
     */
    checkBotExpired(botName) {
        try {
            const botExpiration = this.getBotExpiration(botName);
            if (!botExpiration) return false;

            return Date.now() > botExpiration.expiresAt;
        } catch (err) {
            console.error('[InviteTracking] Error checking bot expiration:', err);
            return false;
        }
    }

    /**
     * Get remaining days for a bot
     * @param {string} botName - Name of the bot
     * @returns {number} - Days remaining (0 if expired)
     */
    getRemainingDays(botName) {
        try {
            const botExpiration = this.getBotExpiration(botName);
            if (!botExpiration) return 0;

            const remaining = botExpiration.expiresAt - Date.now();
            if (remaining <= 0) return 0;

            return Math.ceil(remaining / (24 * 60 * 60 * 1000));
        } catch (err) {
            console.error('[InviteTracking] Error getting remaining days:', err);
            return 0;
        }
    }

    /**
     * Renew a bot's hosting with new invites
     * @param {string} userId - ID of user renewing
     * @param {string} botName - Name of bot to renew
     * @param {number} invitesNeeded - How many invites needed
     * @returns {object} - { success: boolean, newExpiresAt: timestamp }
     */
    renewBotHosting(userId, botName, invitesNeeded = 5) {
        try {
            const userKey = `user_${userId}`;
            let inviteRecord = this.inviteDB.get(userKey) || { invitedUsers: [] };

            // Find unused invites
            const unusedInvites = inviteRecord.invitedUsers.filter(inv => !inv.marked);
            
            if (unusedInvites.length < invitesNeeded) {
                return { success: false, message: 'Not enough new invites to renew' };
            }

            // Mark new invites as used
            let markedCount = 0;
            for (let i = 0; i < inviteRecord.invitedUsers.length && markedCount < invitesNeeded; i++) {
                if (!inviteRecord.invitedUsers[i].marked) {
                    inviteRecord.invitedUsers[i].marked = true;
                    markedCount++;
                }
            }

            this.inviteDB.set(userKey, inviteRecord);

            // Extend bot expiration by 7 more days
            const botKey = `bot_${botName}`;
            let botExpiration = this.botExpirationDB.get(botKey) || {
                createdAt: Date.now(),
                expiresAt: Date.now(),
                ownerId: userId,
                invitesUsed: []
            };

            const newExpiresAt = botExpiration.expiresAt + (7 * 24 * 60 * 60 * 1000); // Add 7 days
            botExpiration.expiresAt = newExpiresAt;
            botExpiration.renewed = true;
            botExpiration.lastRenewal = Date.now();

            this.botExpirationDB.set(botKey, botExpiration);

            return { success: true, newExpiresAt, daysAdded: 7 };
        } catch (err) {
            console.error('[InviteTracking] Error renewing bot hosting:', err);
            return { success: false, message: err.message };
        }
    }

    /**
     * Get user's invite statistics
     * @param {string} userId - ID of user
     * @returns {object} - Statistics about user's invites
     */
    getUserInviteStats(userId) {
        try {
            const userKey = `user_${userId}`;
            const inviteRecord = this.inviteDB.get(userKey) || { invitedUsers: [] };

            const total = inviteRecord.invitedUsers.length;
            const used = inviteRecord.invitedUsers.filter(inv => inv.marked).length;
            const available = total - used;

            return {
                total,
                used,
                available,
                invites: inviteRecord.invitedUsers
            };
        } catch (err) {
            console.error('[InviteTracking] Error getting user stats:', err);
            return { total: 0, used: 0, available: 0, invites: [] };
        }
    }

    /**
     * Get all expired bots
     * @returns {array} - Array of expired bot objects
     */
    getExpiredBots() {
        try {
            const expiredBots = [];
            const now = Date.now();

            // Iterate through all bots in the database
            this.botExpirationDB.forEach((botData, botKey) => {
                if (botData.expiresAt && botData.expiresAt < now) {
                    expiredBots.push({
                        name: botKey.replace('bot_', ''),
                        ...botData
                    });
                }
            });

            return expiredBots;
        } catch (err) {
            console.error('[InviteTracking] Error getting expired bots:', err);
            return [];
        }
    }
}

module.exports = new InviteTracking();
