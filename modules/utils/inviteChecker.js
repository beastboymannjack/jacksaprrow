const mainconfig = require("../../mainconfig");
const { fetchServerFromInvite, extractInviteCodes } = require("./inviteServerFetcher");

async function getUserInvites(guild, userId) {
    try {
        const invites = await guild.invites.fetch();
        let totalInvites = 0;
        
        for (const [, invite] of invites) {
            if (invite.inviter && invite.inviter.id === userId) {
                totalInvites += invite.uses || 0;
            }
        }
        
        return totalInvites;
    } catch (error) {
        console.error('[InviteChecker] Error fetching invites:', error.message);
        return 0;
    }
}

async function hasBypassRole(guild, userId) {
    const bypassRoleId = mainconfig.InviteRequirements?.BypassRoleID;
    if (!bypassRoleId) return false;
    
    try {
        const member = await guild.members.fetch(userId);
        return member.roles.cache.has(bypassRoleId);
    } catch (error) {
        console.error('[InviteChecker] Error checking bypass role:', error.message);
        return false;
    }
}

async function checkInviteRequirement(guild, userId) {
    if (!mainconfig.InviteRequirements?.Enabled) {
        return { passed: true, required: 0, current: 0, bypassed: false };
    }
    
    const hasBypass = await hasBypassRole(guild, userId);
    if (hasBypass) {
        return { passed: true, required: 0, current: 0, bypassed: true };
    }
    
    const requiredInvites = mainconfig.InviteRequirements?.RequiredInvites || 5;
    const currentInvites = await getUserInvites(guild, userId);
    
    return {
        passed: currentInvites >= requiredInvites,
        required: requiredInvites,
        current: currentInvites,
        remaining: Math.max(0, requiredInvites - currentInvites),
        bypassed: false
    };
}

module.exports = {
    getUserInvites,
    checkInviteRequirement,
    fetchServerFromInvite,
    extractInviteCodes
};
