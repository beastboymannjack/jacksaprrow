const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "setupverify",
    category: "Setup",
    aliases: ["verifysetup", "setupverification"],
    description: "Setup the verification system",
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
            .setColor("#00D9FF")
            .setTitle("✅ Verification Required")
            .setDescription(
                "**Welcome to our server!**\n\n" +
                "To gain access to all channels, please verify yourself.\n\n" +
                "📋 **Rules:**\n" +
                "• Be respectful to all members\n" +
                "• No spam or self-promotion\n" +
                "• Follow Discord ToS\n\n" +
                "Click the button below to verify!"
            )
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("verify_member").setLabel("Verify Me").setEmoji("✅").setStyle(ButtonStyle.Success)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("✅ Verification System Setup Complete")
                .setDescription(`Verification panel has been created in ${message.channel}\n\n**Note:** Make sure to configure a verified role!`)
                .setTimestamp()
            ]
        });
    }
};
