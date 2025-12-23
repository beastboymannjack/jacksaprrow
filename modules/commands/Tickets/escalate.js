const { EmbedBuilder } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "escalate",
    category: "Tickets",
    aliases: ["escalateticket", "sendup"],
    description: "Escalate a ticket to higher management",
    run: async (client, message, args, prefix) => {
        const isOwner = message.author.id === mainconfig.BotOwnerID || 
            (mainconfig.OwnerInformation?.OwnerID || []).includes(message.author.id);
        const isAdmin = message.member.permissions.has("ADMINISTRATOR");
        const isStaff = message.member.permissions.has("ManageChannels");
        
        if (!isOwner && !isAdmin && !isStaff) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("❌ Access Denied")
                    .setDescription("```You do not have permission to use this command!```")
                    .setTimestamp()
                ]
            });
        }

        if (!message.channel.name.includes("ticket")) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("❌ Invalid Channel")
                    .setDescription("This command can only be used in ticket channels!")
                    .setTimestamp()
                ]
            });
        }

        const reason = args.join(" ") || "No reason provided";

        const newName = message.channel.name.replace(/^(🟢|🟡|🟠|🔴)?/, "🔴");
        try {
            await message.channel.setName(newName);
        } catch (e) {}

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("🚨 Ticket Escalated")
                .setDescription("This ticket has been escalated to higher management.")
                .addFields({ name: "📋 Reason", value: reason })
                .addFields({ name: "👤 Escalated By", value: message.author.tag, inline: true })
                .addFields({ name: "⏰ Time", value: new Date().toLocaleString(), inline: true })
                .setFooter({ text: "Management will respond shortly" })
                .setTimestamp()
            ]
        });
    }
};
