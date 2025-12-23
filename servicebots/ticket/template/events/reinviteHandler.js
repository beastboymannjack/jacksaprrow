module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        // Track when members join as a potential "reinvitation" indicator
        // This helps detect if the server is still active and being promoted
        
        try {
            const guildId = member.guild.id;
            const invite = client.database.getBotInvite(guildId);
            
            // If bot was configured and members are joining, update last reinvite time
            if (invite && !member.user.bot) {
                client.database.updateBotReinvite(guildId);
                console.log(`🔄 Updated reinvite timestamp for guild: ${guildId}`);
            }
        } catch (error) {
            console.error('Error in reinvite handler:', error);
        }
    }
};
