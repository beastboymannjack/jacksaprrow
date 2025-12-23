const { Message, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js')
const mainconfig = require("../../../mainconfig.js")
const { GetBot } = require("../../utilfunctions");
const botProcessManager = require("../../botProcessManager");
const path = require('path');
const fs = require('fs');

module.exports = {
    name: "deletebot",
    description: "Deletes a bot from the server",
    usage: "deletebot <botname>",

    run: async (client, message, args) => {
        if (!message.member.roles.cache.has(`${mainconfig.ServerRoles.OwnerRoleId}`)) {
            return message.reply({
                content: `❌ **You Are Not Allowed To Execute This Command, Only Owners!**`
            });
        }

        try {
            const logs = client.channels.cache.get(`${mainconfig.LoggingChannelID.BotManagementChannelID}`);
            let bot;
            try {
                bot = await GetBot(message, args);
            } catch (e) {
                console.log(e.stack ? String(e.stack).grey : String(e).grey);
                return message.reply("ERROR:" + e);
            }

            if (!bot || !bot.id) {
                return message.channel.send("**❌ To Delete The Bot, Please Mention a Bot!**");
            }

            client.bots.ensure(bot.id, {
                info: "There Is No information on This Bot Available.",
                type: "Default"
            });

            let data = client.bots.get(bot.id, "info");
            if (!data || data.type == "Default") {
                return message.reply("❌ There is no detail Data about this Bot");
            }

            let botPath = data.toString().split("\n")[2];
            if (!botPath || !fs.existsSync(botPath)) {
                return message.reply("❌ Could not find the bot folder path");
            }

            const Buttons_menu = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Success)
                        .setLabel(`Yes, Delete Bot`)
                        .setCustomId("Delete-Bot")
                        .setDisabled(false),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Danger)
                        .setLabel(`Don't Delete Bot`)
                        .setCustomId("Dont-Delete")
                        .setDisabled(false),
                );

            const Buttons_menu_Disabled = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Success)
                        .setLabel(`Yes, Delete Bot`)
                        .setCustomId("Delete-Bot")
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Danger)
                        .setLabel(`Don't Delete Bot`)
                        .setCustomId("Dont-Delete")
                        .setDisabled(true),
                );

            const deletebot = await message.reply({
                content: `⚠️ **Are You Sure You Want To Delete ALL Files Of ${bot}?**\n> This Step Can't Be Undone!`,
                components: [Buttons_menu]
            });

            let collector = deletebot.createMessageComponentCollector({ time: 60000 });

            collector.on("collect", async (b) => {
                if (b.user.id !== message.author.id) {
                    return b.reply({
                        content: `❌ **Only <@${message.author.id}> Is Allowed To React To This Message!**`,
                        ephemeral: true
                    });
                }

                if (b.isButton()) {
                    if (b.customId == "Delete-Bot") {
                        try {
                            await botProcessManager.deleteBot(botPath);
                            client.bots.delete(bot.id);

                            const embed = new EmbedBuilder()
                                .setAuthor({
                                    name: message.author.tag,
                                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                                })
                                .setColor(0xFF0000)
                                .setFooter({
                                    text: `ID: ${message.author.id}`,
                                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                                })
                                .setDescription(`👍 **Fully Deleted the Bot of:** ${bot} | ${bot.tag} (\`${bot.id}\`)\n**Path:** \`${botPath}\``);

                            if (logs) {
                                logs.send({ embeds: [embed] }).catch(console.log);
                            }

                            await deletebot.edit({ components: [Buttons_menu_Disabled] });
                            await b.reply({
                                content: `✅ **Fully Deleted the Bot of:** ${bot} | ${bot.tag} (\`${bot.id}\`)\n**Path:** \`${botPath}\``
                            });
                        } catch (err) {
                            console.error(err);
                            await b.reply({
                                content: `❌ **Error deleting bot:** ${err.message}`
                            });
                        }
                    }

                    if (b.customId == "Dont-Delete") {
                        await deletebot.edit({ components: [Buttons_menu_Disabled] });
                        await b.reply({ content: `**❌ Canceled The Deletion!**` });
                    }
                }
            });

            collector.on("end", () => {
                deletebot.edit({ components: [Buttons_menu_Disabled] }).catch(() => {});
            });

        } catch (e) {
            console.log(e.stack ? String(e.stack).grey : String(e).grey);
            return message.reply("❌ There is no detail Data about this Bot :c");
        }
    }
}
