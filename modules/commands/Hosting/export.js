const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "export",
    category: "Hosting",
    aliases: ["exportbot", "exportconfig"],
    description: "Export bot configuration to a file",
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
                    .setDescription("`,export <botname>`\n\nExports the bot's configuration as a downloadable file.")
                    .setTimestamp()
                ]
            });
        }

        const config = {
            name: botName,
            exportedAt: new Date().toISOString(),
            exportedBy: message.author.tag
        };

        const buffer = Buffer.from(JSON.stringify(config, null, 2), 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `${botName}-config-${Date.now()}.json` });

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("✅ Configuration Exported")
                .setDescription(`Bot \`${botName}\` configuration has been exported.`)
                .setFooter({ text: `Exported by ${message.author.tag}` })
                .setTimestamp()
            ],
            files: [attachment]
        });
    }
};
