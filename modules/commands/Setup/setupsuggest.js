const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "setupsuggest",
    category: "Setup",
    aliases: ["suggestsetup", "setupsuggestions"],
    description: "Setup the suggestions system",
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

        client.setups.set(message.guild.id, message.channel.id, "suggestionChannel");

        const embed = new EmbedBuilder()
            .setColor("#9B59B6")
            .setTitle("💡 Suggestion System")
            .setDescription(
                "**Share Your Ideas!**\n\n" +
                "Have a suggestion to improve our service?\n\n" +
                "Click the button below to submit a suggestion.\n" +
                "Our team reviews all suggestions regularly!\n\n" +
                "✨ **Good suggestions may be implemented!**"
            )
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("submit_suggestion").setLabel("Submit Suggestion").setEmoji("💡").setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("✅ Suggestion System Setup Complete")
                .setDescription(`Suggestions channel set to ${message.channel}`)
                .setTimestamp()
            ]
        });
    }
};
