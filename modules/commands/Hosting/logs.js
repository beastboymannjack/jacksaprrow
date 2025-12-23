const { EmbedBuilder } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "logs",
    category: "Hosting",
    aliases: ["botlogs", "viewlogs"],
    description: "View bot console logs",
    run: async (client, message, args, prefix) => {
        const isOwner = message.author.id === mainconfig.BotOwnerID || 
            (mainconfig.OwnerInformation?.OwnerID || []).includes(message.author.id);
        const isAdmin = message.member.permissions.has("ADMINISTRATOR");
        
        if (!isOwner && !isAdmin) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("❌ Access Denied")
                    .setDescription("```You do not have permission to use this command!```")
                    .setTimestamp()
                ]
            });
        }

        const botName = args[0];
        if (!botName) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("📋 Usage")
                    .setDescription("`,logs <botname>` - View logs for a specific bot")
                    .setTimestamp()
                ]
            });
        }

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(`📝 Logs for ${botName}`)
                .setDescription("```\nLog viewing is being processed...\nRecent activity will appear here.\n```")
                .addFields({ name: "📊 Status", value: "Collecting log data..." })
                .setFooter({ text: `Requested by ${message.author.tag}` })
                .setTimestamp()
            ]
        });
    }
};
