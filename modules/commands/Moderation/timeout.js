const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const mainconfig = require("../../../mainconfig.js");

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.SupporterRoleId,
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("MODERATE_MEMBERS");
}

function generateCaseId(client, guildId) {
    const counterKey = `counter-${guildId}`;
    client.modcases.ensure(counterKey, { count: 0 });
    const counter = client.modcases.get(counterKey, "count") + 1;
    client.modcases.set(counterKey, counter, "count");
    return `MOD-${guildId.slice(-4)}-${String(counter).padStart(3, '0')}`;
}

function parseDuration(input) {
    const validDurations = {
        '1h': 3600000,
        '6h': 21600000,
        '12h': 43200000,
        '1d': 86400000,
        '3d': 259200000,
        '7d': 604800000,
        '14d': 1209600000,
        '28d': 2419200000
    };
    
    if (validDurations[input.toLowerCase()]) {
        return validDurations[input.toLowerCase()];
    }
    
    const parsed = ms(input);
    if (parsed && parsed > 0 && parsed <= 2419200000) {
        return parsed;
    }
    
    return null;
}

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

module.exports = {
    name: "timeout",
    description: "Timeout a user (mute)",
    usage: "timeout <@user> <duration> <reason>",
    aliases: ["mute"],

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to timeout members.")
                ]
            });
        }

        const targetUser = message.mentions.users.first() || 
            (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        
        if (!targetUser) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing User")
                    .setDescription("Please mention a user to timeout.\n\n**Usage:** `timeout @user <duration> <reason>`\n**Durations:** 1h, 6h, 12h, 1d, 3d, 7d, 14d, 28d")
                ]
            });
        }

        const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ User Not Found")
                    .setDescription("Could not find that member in this server.")
                ]
            });
        }

        if (!member.moderatable) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Cannot Timeout")
                    .setDescription("I cannot timeout this user. They may have higher permissions than me.")
                ]
            });
        }

        if (member.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Cannot Timeout")
                    .setDescription("You cannot timeout someone with equal or higher role than you.")
                ]
            });
        }

        const durationStr = args[1];
        if (!durationStr) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing Duration")
                    .setDescription("Please provide a duration.\n\n**Valid durations:** 1h, 6h, 12h, 1d, 3d, 7d, 14d, 28d")
                ]
            });
        }

        const duration = parseDuration(durationStr);
        if (!duration) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Duration")
                    .setDescription("Invalid duration format. Max timeout is 28 days.\n\n**Valid durations:** 1h, 6h, 12h, 1d, 3d, 7d, 14d, 28d")
                ]
            });
        }

        const reason = args.slice(2).join(' ') || 'No reason provided';
        const caseId = generateCaseId(client, message.guild.id);

        client.modcases.set(caseId, {
            type: 'timeout',
            user: targetUser.id,
            userTag: targetUser.tag,
            moderator: message.author.id,
            moderatorTag: message.author.tag,
            reason: reason,
            duration: duration,
            date: new Date(),
            expiresAt: new Date(Date.now() + duration),
            guildId: message.guild.id,
            status: 'active'
        });

        try {
            await targetUser.send({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("⏰ You Have Been Timed Out")
                    .setDescription(`You have been timed out in **${message.guild.name}**.`)
                    .addFields({ name: "⏱️ Duration", value: formatDuration(duration) })
                    .addFields({ name: "📝 Reason", value: reason })
                    .addFields({ name: "📋 Case ID", value: `\`${caseId}\`` })
                    .setTimestamp()
                ]
            });
        } catch (e) {}

        try {
            await member.timeout(duration, reason);
            
            const embed = new EmbedBuilder()
                .setColor("#FEE75C")
                .setTitle("⏰ User Timed Out")
                .addFields({ name: "👤 User", value: `${targetUser.tag}\n<@${targetUser.id}>`, inline: true })
                .addFields({ name: "👮 Moderator", value: `${message.author.tag}`, inline: true })
                .addFields({ name: "📋 Case ID", value: `\`${caseId}\``, inline: true })
                .addFields({ name: "⏱️ Duration", value: formatDuration(duration), inline: true })
                .addFields({ name: "📝 Reason", value: reason })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Staff Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (e) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Timeout Failed")
                    .setDescription(`Failed to timeout user: ${e.message}`)
                ]
            });
        }
    }
};
