const { EmbedBuilder } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");

// Store auto-restart settings
const autoRestartBots = new Map();

module.exports = {
    name: "autorestart",
    aliases: ["autofix", "autorec"],
    description: "Enable/disable auto-restart for crashed bots",
    usage: "autorestart <botname> <on/off>",

    run: async (client, message, args) => {
        const isOwner = message.author.id === mainconfig.BotOwnerID;
        if (!isOwner) return message.reply("❌ Only owners can use this!");

        const botName = args[0];
        const toggle = args[1]?.toLowerCase();

        if (!botName || !['on', 'off'].includes(toggle)) {
            return message.reply("❌ Usage: `,autorestart <botname> <on/off>`");
        }

        const isEnabled = toggle === 'on';
        autoRestartBots.set(botName, isEnabled);

        message.reply({
            embeds: [new EmbedBuilder()
                .setColor(isEnabled ? "#57F287" : "#ED4245")
                .setTitle(`${isEnabled ? "✅" : "❌"} Auto-Restart ${isEnabled ? "Enabled" : "Disabled"}`)
                .setDescription(`Auto-restart for \`${botName}\` is now **${isEnabled ? "enabled" : "disabled"}**.\n\nThe bot will ${isEnabled ? "automatically restart if it crashes" : "not auto-restart on crashes"}.`)
            ]
        });
    }
};
