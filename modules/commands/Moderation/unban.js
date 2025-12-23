const { EmbedBuilder } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.SupporterRoleId,
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("BAN_MEMBERS");
}

function generateCaseId(client, guildId) {
    const counterKey = `counter-${guildId}`;
    client.modcases.ensure(counterKey, { count: 0 });
    const counter = client.modcases.get(counterKey, "count") + 1;
    client.modcases.set(counterKey, counter, "count");
    return `MOD-${guildId.slice(-4)}-${String(counter).padStart(3, '0')}`;
}

module.exports = {
    name: "unban",
    description: "Unban a user from the server",
    usage: "unban <userId> [reason]",

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to unban members.")
                ]
            });
        }

        const userId = args[0];
        
        if (!userId || !/^\d{17,19}$/.test(userId)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid User ID")
                    .setDescription("Please provide a valid user ID to unban.\n\n**Usage:** `unban <userId> [reason]`")
                ]
            });
        }

        const bans = await message.guild.bans.fetch().catch(() => null);
        if (!bans) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Error")
                    .setDescription("Could not fetch ban list.")
                ]
            });
        }

        const bannedUser = bans.get(userId);
        if (!bannedUser) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ User Not Banned")
                    .setDescription("This user is not banned from this server.")
                ]
            });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';
        const caseId = generateCaseId(client, message.guild.id);

        client.modcases.set(caseId, {
            type: 'unban',
            user: bannedUser.user.id,
            userTag: bannedUser.user.tag,
            moderator: message.author.id,
            moderatorTag: message.author.tag,
            reason: reason,
            date: new Date(),
            guildId: message.guild.id,
            status: 'active'
        });

        const appealKey = `${message.guild.id}-${bannedUser.user.id}`;
        if (client.appeals.has(appealKey)) {
            const appeal = client.appeals.get(appealKey);
            appeal.status = 'approved';
            appeal.resolvedBy = message.author.id;
            appeal.resolvedAt = new Date();
            client.appeals.set(appealKey, appeal);
        }

        try {
            await message.guild.members.unban(userId, reason);
            
            const embed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("🔓 User Unbanned")
                .addFields({ name: "👤 User", value: `${bannedUser.user.tag}\n<@${bannedUser.user.id}>`, inline: true })
                .addFields({ name: "👮 Moderator", value: `${message.author.tag}`, inline: true })
                .addFields({ name: "📋 Case ID", value: `\`${caseId}\``, inline: true })
                .addFields({ name: "📝 Reason", value: reason })
                .setThumbnail(bannedUser.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Staff Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (e) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Unban Failed")
                    .setDescription(`Failed to unban user: ${e.message}`)
                ]
            });
        }
    }
};
