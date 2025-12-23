const activeVotes = new Map();

function getVoteKey(guildId, type) {
    return `${guildId}-${type}`;
}

function startVote(guildId, type, initiatorId) {
    const key = getVoteKey(guildId, type);
    if (activeVotes.has(key)) {
        return null;
    }
    
    const vote = {
        type,
        guildId,
        initiatorId,
        voters: new Set([initiatorId]),
        createdAt: Date.now()
    };
    
    activeVotes.set(key, vote);
    return vote;
}

function addVote(guildId, type, userId) {
    const key = getVoteKey(guildId, type);
    const vote = activeVotes.get(key);
    
    if (!vote) {
        return null;
    }
    
    if (vote.voters.has(userId)) {
        return { alreadyVoted: true, vote };
    }
    
    vote.voters.add(userId);
    return { alreadyVoted: false, vote };
}

function checkVoteThreshold(guildId, type, voiceChannel, threshold) {
    const key = getVoteKey(guildId, type);
    const vote = activeVotes.get(key);
    
    if (!vote) {
        return { passed: false, currentVotes: 0, requiredVotes: 0 };
    }
    
    const members = voiceChannel.members.filter(m => !m.user.bot);
    const totalMembers = members.size;
    const requiredVotes = Math.ceil((totalMembers * threshold) / 100);
    const currentVotes = vote.voters.size;
    
    return {
        passed: currentVotes >= requiredVotes,
        currentVotes,
        requiredVotes,
        totalMembers
    };
}

function clearVote(guildId, type) {
    const key = getVoteKey(guildId, type);
    return activeVotes.delete(key);
}

function getVote(guildId, type) {
    const key = getVoteKey(guildId, type);
    return activeVotes.get(key);
}

function hasVoted(guildId, type, userId) {
    const key = getVoteKey(guildId, type);
    const vote = activeVotes.get(key);
    return vote ? vote.voters.has(userId) : false;
}

module.exports = {
    startVote,
    addVote,
    checkVoteThreshold,
    clearVote,
    getVote,
    hasVoted
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
