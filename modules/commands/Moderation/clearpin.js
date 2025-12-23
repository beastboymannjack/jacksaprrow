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
    name: "clearpin",
    description: "Clear all pinned messages from the channel",
    usage: "clearpin",

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to clear pins.")
                ]
            });
        }

        try {
            const pinnedMessages = await message.channel.messages.fetchPinned();
            
            if (pinnedMessages.size === 0) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle("📌 No Pins")
                        .setDescription("There are no pinned messages in this channel.")
                    ]
                });
            }

            for (const pinned of pinnedMessages.values()) {
                await pinned.unpin().catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("📌 Pins Cleared")
                .addFields({ name: "Unpinned Messages", value: `${pinnedMessages.size} messages`, inline: true })
                .setFooter({ text: "Executed by " + message.author.tag })
                .setTimestamp();

            const reply = await message.reply({ embeds: [embed] });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        } catch (e) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Clear Pins Failed")
                    .setDescription(`Failed to clear pins: ${e.message}`)
                ]
            });
        }
    }
};
