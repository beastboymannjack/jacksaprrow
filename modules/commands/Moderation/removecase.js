const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const mainconfig = require("../../../mainconfig.js");

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("ADMINISTRATOR");
}

module.exports = {
    name: "removecase",
    description: "Remove/overturn a moderation case",
    usage: "removecase <case_id> <reason>",
    aliases: ["deletecase", "overturn"],

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only senior staff and administrators can remove cases.")
                ]
            });
        }

        const caseId = args[0]?.toUpperCase();
        const reason = args.slice(1).join(' ');
        
        if (!caseId) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing Case ID")
                    .setDescription("Please provide a case ID to remove.\n\n**Usage:** `removecase MOD-001 <reason>`")
                ]
            });
        }

        if (!reason) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing Reason")
                    .setDescription("Please provide a reason for removing this case.\n\n**Usage:** `removecase MOD-001 <reason>`")
                ]
            });
        }

        const caseData = client.modcases.get(caseId);
        
        if (!caseData || caseId === 'counter') {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Case Not Found")
                    .setDescription(`No case found with ID \`${caseId}\`.`)
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

        if (caseData.status === 'removed') {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Already Removed")
                    .setDescription("This case has already been removed.")
                ]
            });
        }

        caseData.status = 'removed';
        caseData.removedBy = message.author.id;
        caseData.removedAt = new Date();
        caseData.removalReason = reason;
        client.modcases.set(caseId, caseData);

        if (caseData.type === 'warn' || caseData.type === 'strike') {
            const warningsKey = `${message.guild.id}-${caseData.user}`;
            const warnings = client.warnings.get(warningsKey) || [];
            const updatedWarnings = warnings.map(w => {
                if (w.caseId === caseId) {
                    w.active = false;
                    w.removedBy = message.author.id;
                    w.removedAt = new Date();
                }
                return w;
            });
            client.warnings.set(warningsKey, updatedWarnings);
        }

        const targetUser = await client.users.fetch(caseData.user).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle("✅ Case Removed")
            .addFields({ name: "📋 Case ID", value: `\`${caseId}\``, inline: true })
            .addFields({ name: "📝 Original Type", value: caseData.type.toUpperCase(), inline: true })
            .addFields({ name: "👤 User", value: targetUser ? targetUser.tag : `<@${caseData.user}>`, inline: true })
            .addFields({ name: "🗑️ Removed By", value: message.author.tag, inline: true })
            .addFields({ name: "📅 Removal Date", value: moment().format('MMM Do, YYYY'), inline: true })
            .addFields({ name: "💬 Removal Reason", value: reason })
            .setFooter({ text: "Staff Management System • Case Audit Trail", iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        if (targetUser) {
            try {
                await targetUser.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("✅ Case Removed")
                        .setDescription(`A moderation case against you in **${message.guild.name}** has been removed.`)
                        .addFields({ name: "📋 Case ID", value: `\`${caseId}\`` })
                        .addFields({ name: "📝 Original Reason", value: caseData.reason })
                        .addFields({ name: "💬 Removal Reason", value: reason })
                        .setTimestamp()
                    ]
                });
            } catch (e) {}
        }
    }
};
