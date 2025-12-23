const { EmbedBuilder } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "setupnodestats",
    category: "Setup",
    aliases: ["nodestatssetup", "setupstats"],
    description: "Setup the node status roles",
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

        client.setups.set(message.guild.id, message.channel.id, "nodeStatsChannel");

        const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("✅ Node Stats Setup Complete")
            .setDescription("Node statistics channel has been configured.")
            .addFields({ name: "📊 Features", value: "• Real-time node status updates\n" +
                "• Server health monitoring\n" +
                "• Automatic status role assignments\n" +
                "• Performance metrics display" })
            .addFields({ name: "📋 Configuration", value: `Stats Channel: ${message.channel}` })
            .setFooter({ text: `Set by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
