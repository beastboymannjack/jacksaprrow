const { EmbedBuilder } = require('discord.js');
const VerificationService = require('../verification/verificationService.js');
const mainconfig = require("../../mainconfig.js");

module.exports = (client) => {
    const config = mainconfig.YouTubeVerification;
    const codeAccessRoleId = config?.CodeAccessRoleID;

    if (!codeAccessRoleId) {
        console.log('[VerificationWatcher] Code Access Role ID not configured, skipping watcher setup');
        return;
    }

    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        if (!codeAccessRoleId) return;

        const hadRole = oldMember.roles.cache.has(codeAccessRoleId);
        const hasRole = newMember.roles.cache.has(codeAccessRoleId);

        if (hadRole && !hasRole) {
            const verificationService = new VerificationService(client);
            
            const data = verificationService.loadVerifications();
            const wasVerifiedInDb = data.verifications.some(v => v.userId === newMember.id && v.status === 'approved');
            if (wasVerifiedInDb) {
                verificationService.revokeVerification(newMember.id, null, 'Role removed from user');
                console.log(`[VerificationWatcher] Revoked verification for ${newMember.user.tag} - role was removed`);

                if (config.LoggingChannelID) {
                    let logChannel = newMember.guild.channels.cache.get(config.LoggingChannelID);
                    if (!logChannel) {
                        logChannel = await newMember.guild.channels.fetch(config.LoggingChannelID).catch(() => null);
                    }
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#FFA500')
                            .setTitle('⚠️ Verification Auto-Revoked')
                            .setDescription(`**User:** <@${newMember.id}> (${newMember.user.tag})`)
                            .addFields(
                                { name: '📋 Reason', value: 'Code Access role was removed from user', inline: true },
                                { name: '🔄 Status', value: 'User can re-verify by submitting a new screenshot', inline: true }
                            )
                            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                }
            }
        }
    });

    client.on('guildMemberRemove', async (member) => {
        if (!codeAccessRoleId) return;

        const hadRole = member.roles.cache.has(codeAccessRoleId);
        
        if (hadRole) {
            const verificationService = new VerificationService(client);
            
            const data = verificationService.loadVerifications();
            const wasVerifiedInDb = data.verifications.some(v => v.userId === member.id && v.status === 'approved');
            if (wasVerifiedInDb) {
                verificationService.revokeVerification(member.id, null, 'User left the server');
                console.log(`[VerificationWatcher] Revoked verification for ${member.user.tag} - user left server`);

                if (config.LoggingChannelID) {
                    let logChannel = member.guild.channels.cache.get(config.LoggingChannelID);
                    if (!logChannel) {
                        logChannel = await member.guild.channels.fetch(config.LoggingChannelID).catch(() => null);
                    }
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#FF6B6B')
                            .setTitle('🚪 Verified User Left')
                            .setDescription(`**User:** <@${member.id}> (${member.user.tag})`)
                            .addFields(
                                { name: '📋 Action', value: 'Verification status revoked', inline: true },
                                { name: '🔄 Note', value: 'User can re-verify if they rejoin', inline: true }
                            )
                            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                }
            }
        }
    });

    console.log('[VerificationWatcher] Role and member leave watcher initialized');
};
