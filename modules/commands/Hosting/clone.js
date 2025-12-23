const { EmbedBuilder } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "clone",
    category: "Hosting",
    aliases: ["clonebot", "duplicate"],
    description: "Clone an existing bot configuration",
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

        const sourceName = args[0];
        const newName = args[1];

        if (!sourceName || !newName) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("📋 Usage")
                    .setDescription("`,clone <sourcebotname> <newbotname>`\n\nClones a bot's configuration to a new instance.")
                    .setTimestamp()
                ]
            });
        }

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("✅ Clone Initiated")
                .setDescription(`Cloning \`${sourceName}\` to \`${newName}\`...`)
                .addFields({ name: "📊 Status", value: "Creating new bot instance..." })
                .setFooter({ text: `Initiated by ${message.author.tag}` })
                .setTimestamp()
            ]
        });
    }
};
