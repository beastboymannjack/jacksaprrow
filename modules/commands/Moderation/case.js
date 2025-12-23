const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const mainconfig = require("../../../mainconfig.js");

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.SupporterRoleId,
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("ADMINISTRATOR");
}

module.exports = {
    name: "case",
    description: "View details of a specific moderation case",
    usage: "case <case_id>",
    aliases: ["caseinfo"],

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to view case details.")
                ]
            });
        }

        const caseId = args[0]?.toUpperCase();
        
        if (!caseId) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing Case ID")
                    .setDescription("Please provide a case ID.\n\n**Usage:** `case MOD-001`")
                ]
            });
        }

        const caseData = client.modcases.get(caseId);
        
        if (!caseData || caseId.startsWith('counter')) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Case Not Found")
                    .setDescription(`No case found with ID \`${caseId}\`.\n\nCase IDs are in the format: MOD-001, MOD-002, etc.`)
                ]
            });
        }

        if (caseData.guildId !== message.guild.id) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Access Denied")
                    .setDescription("This case belongs to a different server.")
                ]
            });
        }

        const typeEmojis = {
            warn: '⚠️ Warning',
            kick: '👢 Kick',
            ban: '🔨 Ban',
            unban: '🔓 Unban',
            timeout: '⏰ Timeout',
            strike: '⚡ Strike'
        };

        const typeColors = {
            warn: '#FEE75C',
            kick: '#ED4245',
            ban: '#ED4245',
            unban: '#57F287',
            timeout: '#FEE75C',
            strike: '#ED4245'
        };

        const targetUser = await client.users.fetch(caseData.user).catch(() => null);
        const moderator = await client.users.fetch(caseData.moderator).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(typeColors[caseData.type] || '#5865F2')
            .setTitle(`${typeEmojis[caseData.type] || '📋 Case'} - \`${caseId}\``)
            .addFields({ name: "👤 User", value: targetUser ? `${targetUser.tag}\n<@${targetUser.id}>` : `Unknown\n<@${caseData.user}>`, inline: true })
            .addFields({ name: "👮 Moderator", value: moderator ? `${moderator.tag}\n<@${moderator.id}>` : `Unknown\n<@${caseData.moderator}>`, inline: true })
            .addFields({ name: "📅 Date", value: moment(caseData.date).format('MMMM Do, YYYY\nh:mm A'), inline: true })
            .addFields({ name: "📝 Reason", value: caseData.reason || 'No reason provided' })
            .addFields({ name: "📊 Status", value: caseData.status === 'active' ? '🟢 Active' : '🔴 Resolved', inline: true });

        if (caseData.duration) {
            const durationText = formatDuration(caseData.duration);
            embed.addFields({ name: "⏱️ Duration", value: durationText, inline: true });
            
            if (caseData.expiresAt) {
                const expired = new Date(caseData.expiresAt) < new Date();
                embed.addFields({ name: "⏰ Expires", value: expired ? '✅ Expired' : moment(caseData.expiresAt).fromNow(), inline: true });
            }
        }

        if (targetUser) {
            embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));
        }

        embed.setFooter({ text: `Case ${caseId} • Staff Management System`, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp(new Date(caseData.date));

        await message.reply({ embeds: [embed] });
    }
};

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
}
