/**
 * Utility to fetch Discord server ID from invite links
 * Supports formats: discord.gg/XXXXX, discord.com/invite/XXXXX, https://discord.gg/XXXXX
 */

const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?discord\.(?:gg|com\/invite)\/([a-zA-Z0-9-_]+)/gi;

/**
 * Extract invite codes from text
 * @param {string} text - Text containing Discord invite links
 * @returns {string[]} Array of invite codes
 */
function extractInviteCodes(text) {
    if (!text || typeof text !== 'string') return [];
    
    const codes = [];
    let match;
    
    // Reset regex lastIndex
    INVITE_REGEX.lastIndex = 0;
    
    while ((match = INVITE_REGEX.exec(text)) !== null) {
        if (match[1]) {
            codes.push(match[1]);
        }
    }
    
    return [...new Set(codes)]; // Remove duplicates
}

/**
 * Fetch server details from Discord invite code
 * @param {Client} client - Discord.js client
 * @param {string} inviteCode - The invite code (without discord.gg/)
 * @returns {Promise<{guildId: string, guildName: string, inviteCode: string, success: boolean}>}
 */
async function fetchServerFromInvite(client, inviteCode) {
    try {
        if (!inviteCode || typeof inviteCode !== 'string') {
            return {
                success: false,
                error: 'Invalid invite code provided'
            };
        }
        
        const invite = await client.fetchInvite(inviteCode);
        
        if (!invite || !invite.guild) {
            return {
                success: false,
                error: 'Invite is invalid or does not contain guild information'
            };
        }
        
        return {
            success: true,
            guildId: invite.guild.id,
            guildName: invite.guild.name,
            inviteCode: inviteCode,
            guildIcon: invite.guild.iconURL(),
            memberCount: invite.memberCount || 'Unknown',
            inviterUsername: invite.inviter?.username || 'Unknown'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to fetch invite information'
        };
    }
}

/**
 * Parse text for Discord invites and fetch all server IDs
 * @param {Client} client - Discord.js client
 * @param {string} text - Text potentially containing Discord invites
 * @returns {Promise<Array>} Array of server info objects
 */
async function fetchAllServersFromText(client, text) {
    try {
        const inviteCodes = extractInviteCodes(text);
        
        if (inviteCodes.length === 0) {
            return [];
        }
        
        const results = [];
        
        for (const code of inviteCodes) {
            const result = await fetchServerFromInvite(client, code);
            results.push(result);
        }
        
        return results;
    } catch (error) {
        console.error('[InviteServerFetcher] Error fetching servers from text:', error.message);
        return [];
    }
}

/**
 * Check if text contains a Discord invite
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function containsInvite(text) {
    return extractInviteCodes(text).length > 0;
}

module.exports = {
    extractInviteCodes,
    fetchServerFromInvite,
    fetchAllServersFromText,
    containsInvite,
    INVITE_REGEX
};
