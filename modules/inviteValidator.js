const mainconfig = require('../mainconfig');

class InviteValidator {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Check if user has enough server invites to create a bot
     * @param {Discord.User} user - Discord user object
     * @param {Discord.Guild} guild - Discord guild object
     * @returns {Promise<{valid: boolean, invites: number, required: number, message: string}>}
     */
    async validateUserInvites(user, guild) {
        try {
            // Check if invite validation is enabled
            if (!mainconfig.InviteRequirements.Enabled) {
                return { valid: true, invites: 0, required: 0, message: 'Invite validation disabled' };
            }

            // Check if user has bypass role
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (member && mainconfig.InviteRequirements.BypassRoleID) {
                if (member.roles.cache.has(mainconfig.InviteRequirements.BypassRoleID)) {
                    return { valid: true, invites: Infinity, required: 0, message: 'Bypass role granted' };
                }
            }

            const requiredInvites = mainconfig.InviteRequirements.RequiredInvites || 5;
            
            // Fetch invites for the guild
            let inviteCount = 0;
            try {
                const invites = await guild.invites.fetch();
                // Count invites created by this user
                inviteCount = invites
                    .filter(invite => invite.inviter && invite.inviter.id === user.id)
                    .size;
            } catch (err) {
                console.error('[InviteValidator] Error fetching invites:', err.message);
                return { 
                    valid: false, 
                    invites: 0, 
                    required: requiredInvites, 
                    message: 'Could not verify invites. Please try again later.' 
                };
            }

            // Also check for uses if any invite was used
            let totalInviteUses = 0;
            try {
                const invites = await guild.invites.fetch();
                invites.forEach(invite => {
                    if (invite.inviter && invite.inviter.id === user.id) {
                        totalInviteUses += invite.uses || 0;
                    }
                });
            } catch (err) {
                // Silent fail, not critical
            }

            const isValid = totalInviteUses >= requiredInvites;
            const message = isValid 
                ? `✅ You have ${totalInviteUses} valid invite${totalInviteUses !== 1 ? 's' : ''}`
                : `❌ You need ${requiredInvites} invites but only have ${totalInviteUses}`;

            return {
                valid: isValid,
                invites: totalInviteUses,
                required: requiredInvites,
                message
            };
        } catch (err) {
            console.error('[InviteValidator] Validation error:', err);
            return { 
                valid: false, 
                invites: 0, 
                required: mainconfig.InviteRequirements.RequiredInvites, 
                message: 'Invite validation error: ' + err.message 
            };
        }
    }

    /**
     * Track a bot creation with invite requirement
     * @param {string} userId - Discord user ID
     * @param {number} invitesUsed - Number of invites used for this bot
     */
    trackBotCreation(userId, invitesUsed = mainconfig.InviteRequirements.RequiredInvites) {
        const key = `user_${userId}`;
        const record = this.cache.get(key) || { creations: 0, lastCreation: null, totalInvitesUsed: 0 };
        
        record.creations += 1;
        record.lastCreation = Date.now();
        record.totalInvitesUsed += invitesUsed;
        
        this.cache.set(key, record);
        return record;
    }

    /**
     * Get creation history for a user
     * @param {string} userId - Discord user ID
     */
    getUserCreationHistory(userId) {
        return this.cache.get(`user_${userId}`) || null;
    }

    /**
     * Clear cache (can be called periodically)
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = new InviteValidator();
