const cron = require('node-cron');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log('🔄 Starting invite expiration check (runs daily)...');

        // Run daily at 00:00 UTC to check for expired invites
        cron.schedule('0 0 * * *', async () => {
            console.log('📅 Running daily bot invite expiration check...');
            
            try {
                const expiredInvites = client.database.getExpiredBotInvites(3);
                
                if (expiredInvites.length === 0) {
                    console.log('✅ No expired bot invites found.');
                    return;
                }

                console.log(`⚠️ Found ${expiredInvites.length} expired bot invite(s)`);

                for (const invite of expiredInvites) {
                    try {
                        const guild = await client.guilds.fetch(invite.guildId).catch(() => null);
                        
                        if (guild) {
                            const logChannelId = invite.logChannelId;
                            const logChannel = guild.channels.cache.get(logChannelId);

                            // Send notification to log channel
                            if (logChannel) {
                                await logChannel.send({
                                    embeds: [{
                                        color: 0xED4245,
                                        title: '❌ Bot Removal Notice',
                                        description: `The ticket bot has not been reinvited for 3+ days. The bot configuration has been removed from the database.`,
                                        fields: [
                                            { name: 'Guild ID', value: invite.guildId, inline: true },
                                            { name: 'Reason', value: 'No reinvitation within 3 days', inline: true },
                                            { name: 'Last Invite Date', value: new Date(invite.lastReinviteAt).toLocaleString(), inline: false }
                                        ],
                                        timestamp: new Date()
                                    }]
                                }).catch(err => console.error(`Failed to send log message: ${err}`));
                            }

                            // Remove from database
                            client.database.removeBotInvite(invite.guildId);
                            console.log(`✅ Removed bot configuration for guild: ${invite.guildId}`);

                        } else {
                            // Guild not found, remove from database
                            client.database.removeBotInvite(invite.guildId);
                            console.log(`✅ Guild not found (${invite.guildId}), removed from database`);
                        }
                    } catch (error) {
                        console.error(`Error processing expired invite for guild ${invite.guildId}:`, error);
                    }
                }
            } catch (error) {
                console.error('Error during invite expiration check:', error);
            }
        });

        console.log('✅ Invite expiration check scheduled successfully');
    }
};
