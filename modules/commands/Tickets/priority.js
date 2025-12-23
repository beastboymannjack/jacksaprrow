const { EmbedBuilder } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "priority",
    category: "Tickets",
    aliases: ["setpriority", "ticketpriority"],
    description: "Set the priority level of a ticket",
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

        const level = args[0]?.toLowerCase();
        const validLevels = ["low", "medium", "high", "urgent"];

        if (!level || !validLevels.includes(level)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("📋 Priority Levels")
                    .setDescription("Usage: `,priority <level>`")
                    .addFields({ name: "Available Levels", value: "🟢 `low` - Non-urgent issues\n" +
                        "🟡 `medium` - Standard priority\n" +
                        "🟠 `high` - Important issues\n" +
                        "🔴 `urgent` - Critical issues" })
                    .setTimestamp()
                ]
            });
        }

        const colors = { low: "#00FF00", medium: "#FFFF00", high: "#FFA500", urgent: "#FF0000" };
        const emojis = { low: "🟢", medium: "🟡", high: "🟠", urgent: "🔴" };

        const newName = message.channel.name.replace(/^(🟢|🟡|🟠|🔴)?/, emojis[level]);
        
        try {
            await message.channel.setName(newName);
        } catch (e) {}

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(colors[level])
                .setTitle(`${emojis[level]} Priority Updated`)
                .setDescription(`Ticket priority set to **${level.toUpperCase()}**`)
                .setFooter({ text: `Set by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp()
            ]
        });
    }
};
