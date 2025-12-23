const { EmbedBuilder, Message, PermissionFlagsBits } = require("discord.js");
const config = require("../../../config.json");
const ee = require("../../../embed.json");
const role = require("../../../settings.json");
const mainconfig  = require("../../../mainconfig");

//Here the command starts
module.exports = {
    name : "clear",

        //running the command with the parameters: client, message, args, user, text, prefix
  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))  return;
                let clearamount = Number(args[0]);
                if(!clearamount || clearamount > 1000 || clearamount < 1) return message.reply("Please provide a number between 1 and 1000!");
                try{
                                message.channel.bulkDelete(clearamount);
                message.delete().catch(e => console.log("Couldn't delete msg, this is a catch to prevent crash"))
                
                }catch{
                        message.reply({embeds: [new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`❌ ERROR | An Error Occurred`)
                .setDescription(`\`\`\`AN Unknown Error Occurred, Please Try Again.\`\`\``)
                .setFooter({text: message.guild.name, iconURL: message.guild.iconURL()})
                .setTimestamp()
            ]});
            await message.react("<:no:933239221836206131>")
                }
                
        }
}