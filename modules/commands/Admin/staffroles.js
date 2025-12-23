const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");

// Get staff roles from mainconfig.js
function getStaffRolesFromConfig() {
    return {
        ModRoleId: mainconfig.ServerRoles?.ModRoleId,
        ChiefSupporterRoleId: mainconfig.ServerRoles?.ChiefSupporterRoleId,
        SupporterRoleId: mainconfig.ServerRoles?.SupporterRoleId,
        NewSupporterRoleId: mainconfig.ServerRoles?.NewSupporterRoleId,
        BotCreatorRoleId: mainconfig.ServerRoles?.BotCreatorRoleId,
        ChiefBotCreatorRoleId: mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        FounderId: mainconfig.ServerRoles?.FounderId,
        AdminRoleId: mainconfig.ServerRoles?.AdminRoleId,
        ChiefHumanResources: mainconfig.ServerRoles?.ChiefHumanResources,
        HumanResources: mainconfig.ServerRoles?.HumanResources
    };
}

module.exports = {
    name: "staffroles",
    description: "View staff roles configuration from mainconfig",
    usage: "staffroles",
    aliases: ["staffroleconfig", "srconfig", "viewstaffroles"],

    run: async (client, message, args) => {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only administrators can view staff roles.")
                ]
            });
        }

        const staffRoles = getStaffRolesFromConfig();

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("👥 Staff Roles Configuration")
            .setDescription("Current staff roles from mainconfig.js")
            .addFields(
                { 
                    name: "🛡️ Moderator Roles", 
                    value: `**ModRoleId:** ${staffRoles.ModRoleId ? `<@&${staffRoles.ModRoleId}>` : '❌ Not Set'}`, 
                    inline: false 
                },
                { 
                    name: "🎧 Supporter Roles", 
                    value: `**ChiefSupporterRoleId:** ${staffRoles.ChiefSupporterRoleId ? `<@&${staffRoles.ChiefSupporterRoleId}>` : '❌ Not Set'}\n**SupporterRoleId:** ${staffRoles.SupporterRoleId ? `<@&${staffRoles.SupporterRoleId}>` : '❌ Not Set'}\n**NewSupporterRoleId:** ${staffRoles.NewSupporterRoleId ? `<@&${staffRoles.NewSupporterRoleId}>` : '❌ Not Set'}`, 
                    inline: false 
                },
                { 
                    name: "🤖 Bot Creator Roles", 
                    value: `**ChiefBotCreatorRoleId:** ${staffRoles.ChiefBotCreatorRoleId ? `<@&${staffRoles.ChiefBotCreatorRoleId}>` : '❌ Not Set'}\n**BotCreatorRoleId:** ${staffRoles.BotCreatorRoleId ? `<@&${staffRoles.BotCreatorRoleId}>` : '❌ Not Set'}`, 
                    inline: false 
                },
                { 
                    name: "📊 Administrative Roles", 
                    value: `**FounderId:** ${staffRoles.FounderId ? `<@&${staffRoles.FounderId}>` : '❌ Not Set'}\n**AdminRoleId:** ${staffRoles.AdminRoleId ? `<@&${staffRoles.AdminRoleId}>` : '❌ Not Set'}`, 
                    inline: false 
                },
                { 
                    name: "💼 Human Resources Roles", 
                    value: `**ChiefHumanResources:** ${staffRoles.ChiefHumanResources ? `<@&${staffRoles.ChiefHumanResources}>` : '❌ Not Set'}\n**HumanResources:** ${staffRoles.HumanResources ? `<@&${staffRoles.HumanResources}>` : '❌ Not Set'}`, 
                    inline: false 
                }
            )
            .addFields({
                name: "📝 How to Change",
                value: "Edit these roles in `mainconfig.js` using environment variables:\n```\nMOD_ROLE_ID=...\nSUPPORTER_ROLE_ID=...\nBOT_CREATOR_ROLE_ID=...\n```",
                inline: false
            })
            .setFooter({ text: "Staff roles are centralized in mainconfig.js" })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
