const { EmbedBuilder } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "assign",
    category: "Tickets",
    aliases: ["assignticket", "claim"],
    description: "Assign a ticket to a staff member",
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

        const member = message.mentions.members.first() || message.member;

        try {
            await message.channel.permissionOverwrites.edit(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        } catch (e) {}

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("✅ Ticket Assigned")
                .setDescription(`This ticket has been assigned to ${member}`)
                .addFields({ name: "👤 Assigned Staff", value: `${member.user.tag}`, inline: true })
                .addFields({ name: "📅 Assigned At", value: new Date().toLocaleString(), inline: true })
                .setFooter({ text: `Assigned by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp()
            ]
        });
    }
};
