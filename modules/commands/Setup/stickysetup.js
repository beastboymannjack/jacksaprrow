const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "stickysetup",
    description: "Setup sticky welcome messages for new members",
    usage: "stickysetup <channel> [custom message]",

    run: async (client, message, args) => {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only administrators can setup sticky messages.")
                ]
            });
        }

        const channel = message.mentions.channels.first() || 
                       (args[0] ? message.guild.channels.cache.get(args[0]) : null);

        if (!channel) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Channel")
                    .setDescription("Please mention a valid channel.\n\n**Usage:** `stickysetup #channel [custom message]`")
                ]
            });
        }

        const customMessage = args.slice(1).join(' ') || `Welcome to **${message.guild.name}**! Please read the rules and verify to access more channels.`;

        // Store configuration
        const settingsKey = `${message.guild.id}-sticky`;
        client.serversettings.set(settingsKey, {
            enabled: true,
            channelId: channel.id,
            message: customMessage
        });

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("✅ Sticky Messages Setup Complete")
                .addFields(
                    { name: "📍 Channel", value: channel.toString(), inline: true },
                    { name: "📝 Message", value: customMessage, inline: false }
                )
                .setFooter({ text: "New members will see this message with auto-delete after 2 seconds" })
                .setTimestamp()
            ]
        });
    }
};
