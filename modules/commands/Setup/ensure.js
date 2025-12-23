const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Roles } = require("../../../settings.json");
const emoji = require("../../../emoji")
const {
    theDB,
} = require("../../utilfunctions");

module.exports = {
    name: require("path").parse(__filename).name,
    category: "Setup",
    aliases: ["savedb"],
    description: "",
    run: async (client, message, args, prefix) => {
        if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            theDB(client, message.guild);
            await message.react("<a:yes:933239140718358558>")
            await message.reply(`✅ ***Succesfully Saved ALL The DataBase***`).catch(() => { });
        } else {
            message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`❌ ERROR | An Error Occurred`)
                    .setDescription(`\`\`\`You Don't Have Permission To Run This Command\`\`\``)
                    .setFooter({text: message.guild.name, iconURL: message.guild.iconURL()})
                    .setTimestamp()
                ]
            });
            await message.react("<:no:933239221836206131>")
        }
    }
}
