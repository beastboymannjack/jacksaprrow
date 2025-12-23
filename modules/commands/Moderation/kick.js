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
           member.permissions.has("KICK_MEMBERS");
}

function generateCaseId(client, guildId) {
    const counterKey = `counter-${guildId}`;
    client.modcases.ensure(counterKey, { count: 0 });
    const counter = client.modcases.get(counterKey, "count") + 1;
    client.modcases.set(counterKey, counter, "count");
    return `MOD-${guildId.slice(-4)}-${String(counter).padStart(3, '0')}`;
}

module.exports = {
    name: "kick",
    description: "Kick a user from the server",
    usage: "kick <@user> <reason>",

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to kick members.")
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
                    .setDescription("Please mention a user to kick.\n\n**Usage:** `kick @user <reason>`")
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

        if (!member.kickable) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Cannot Kick")
                    .setDescription("I cannot kick this user. They may have higher permissions than me.")
                ]
            });
        }

        if (member.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Cannot Kick")
                    .setDescription("You cannot kick someone with equal or higher role than you.")
                ]
            });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';
        const caseId = generateCaseId(client, message.guild.id);

        client.modcases.set(caseId, {
            type: 'kick',
            user: targetUser.id,
            userTag: targetUser.tag,
            moderator: message.author.id,
            moderatorTag: message.author.tag,
            reason: reason,
            date: new Date(),
            guildId: message.guild.id,
            status: 'active'
        });

        try {
            await targetUser.send({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("👢 You Have Been Kicked")
                    .setDescription(`You have been kicked from **${message.guild.name}**.`)
                    .addFields({ name: "📝 Reason", value: reason })
                    .addFields({ name: "📋 Case ID", value: `\`${caseId}\`` })
                    .setTimestamp()
                ]
            });
        } catch (e) {}

        try {
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("👢 User Kicked")
                .addFields({ name: "👤 User", value: `${targetUser.tag}\n<@${targetUser.id}>`, inline: true })
                .addFields({ name: "👮 Moderator", value: `${message.author.tag}`, inline: true })
                .addFields({ name: "📋 Case ID", value: `\`${caseId}\``, inline: true })
                .addFields({ name: "📝 Reason", value: reason })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Staff Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (e) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Kick Failed")
                    .setDescription(`Failed to kick user: ${e.message}`)
                ]
            });
        }
    }
};
