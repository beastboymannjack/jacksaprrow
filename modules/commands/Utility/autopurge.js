const { EmbedBuilder } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.AdminRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("MANAGE_GUILD");
}

module.exports = {
    name: "autopurge",
    description: "Setup automatic message purging for a channel",
    usage: "autopurge <channel> <interval_hours> [max_messages]",
    aliases: ["setautopurge"],

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only admins can setup auto purge.")
                ]
            });
        }

        const channel = message.mentions.channels.first() || 
                       (args[0] ? message.guild.channels.cache.get(args[0]) : null);
        const hours = parseInt(args[1]);
        const maxMessages = parseInt(args[2]) || 50;

        if (!channel) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Channel")
                    .setDescription("**Usage:** `autopurge #channel <hours> [max_messages]`")
                ]
            });
        }

        if (isNaN(hours) || hours < 1) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Interval")
                    .setDescription("Interval must be at least 1 hour.")
                ]
            });
        }

        const settingsKey = `${message.guild.id}-autopurge`;
        client.serversettings.set(settingsKey, {
            enabled: true,
            channelId: channel.id,
            intervalHours: hours,
            maxMessages: maxMessages,
            lastPurge: Date.now()
        });

        // Setup interval
        const intervalMs = hours * 3600000;
        setInterval(async () => {
            try {
                const msgs = await channel.messages.fetch({ limit: maxMessages });
                if (msgs.size > 0) {
                    await channel.bulkDelete(msgs, true).catch(() => {});
                }
            } catch (e) {
                console.error('[AutoPurge] Error:', e.message);
            }
        }, intervalMs);

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("✅ Auto Purge Setup Complete")
                .addFields(
                    { name: "📍 Channel", value: channel.toString(), inline: true },
                    { name: "⏰ Interval", value: `${hours} hours`, inline: true },
                    { name: "📊 Max Messages", value: maxMessages.toString(), inline: true }
                )
                .setTimestamp()
            ]
        });
    }
};
