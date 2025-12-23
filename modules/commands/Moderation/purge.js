const { EmbedBuilder } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.SupporterRoleId,
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId,
        mainconfig.ServerRoles?.AdminRoleId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("MANAGE_MESSAGES");
}

module.exports = {
    name: "purge",
    description: "Delete messages from the channel",
    usage: "purge <amount> [@user optional]",
    aliases: ["prune", "clear"],

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to purge messages.")
                ]
            });
        }

        const amount = parseInt(args[0]);
        
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Amount")
                    .setDescription("Please provide a number between 1 and 100.\n\n**Usage:** `purge <1-100> [@user optional]`")
                ]
            });
        }

        const targetUser = message.mentions.users.first();
        
        try {
            let messages = await message.channel.messages.fetch({ limit: Math.min(amount + 1, 100) });
            
            if (targetUser) {
                messages = messages.filter(msg => msg.author.id === targetUser.id).first(amount);
            } else {
                messages = messages.first(amount);
            }

            await message.channel.bulkDelete(messages, true);

            const embed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("🗑️ Messages Purged")
                .addFields({ name: "Amount Deleted", value: `${messages.size} messages`, inline: true })
                .addFields({ name: "Channel", value: `${message.channel.name}`, inline: true });
            
            if (targetUser) {
                embed.addFields({ name: "From User", value: `${targetUser.tag}`, inline: true });
            }
            
            embed.setFooter({ text: "Purge command executed by " + message.author.tag })
                .setTimestamp();

            const reply = await message.reply({ embeds: [embed] });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        } catch (e) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Purge Failed")
                    .setDescription(`Failed to purge messages: ${e.message}`)
                ]
            });
        }
    }
};
