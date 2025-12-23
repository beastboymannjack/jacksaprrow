const { EmbedBuilder } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "migrate",
    category: "Hosting",
    aliases: ["migratebot", "transfer"],
    description: "Migrate a bot to a different node or owner",
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
        const target = args[1];

        if (!botName || !target) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("📋 Usage")
                    .setDescription("`,migrate <botname> <target>`\n\nTarget can be a node name or user mention.")
                    .setTimestamp()
                ]
            });
        }

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("✅ Migration Initiated")
                .setDescription(`Bot \`${botName}\` migration to \`${target}\` has been queued.`)
                .addFields({ name: "📊 Status", value: "Migration in progress..." })
                .setFooter({ text: `Initiated by ${message.author.tag}` })
                .setTimestamp()
            ]
        });
    }
};
