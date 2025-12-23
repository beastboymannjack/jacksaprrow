const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "setupfeedback",
    category: "Setup",
    aliases: ["feedbacksetup"],
    description: "Setup the feedback collection system",
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

        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("📝 Feedback System")
            .setDescription(
                "**We value your feedback!**\n\n" +
                "Help us improve by sharing your experience:\n\n" +
                "⭐ **Rate our service** - Let us know how we're doing\n" +
                "💡 **Suggest features** - Ideas for improvements\n" +
                "🐛 **Report issues** - Help us fix problems\n\n" +
                "Click a button below to submit your feedback!"
            )
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("feedback_positive").setLabel("Positive").setEmoji("👍").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("feedback_neutral").setLabel("Neutral").setEmoji("😐").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("feedback_negative").setLabel("Needs Work").setEmoji("👎").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("feedback_suggestion").setLabel("Suggestion").setEmoji("💡").setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("✅ Feedback System Setup Complete")
                .setDescription(`Feedback panel has been created in ${message.channel}`)
                .setTimestamp()
            ]
        });
    }
};
