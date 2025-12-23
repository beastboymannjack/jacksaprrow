const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const mainconfig = require("../../../mainconfig.js");
const botProcessManager = require("../../botProcessManager");

module.exports = {
    name: "botinfo",
    aliases: ["binfo", "checkbot", "botdetail"],
    description: "Get advanced information about a hosted bot",
    usage: "botinfo <botname>",

    run: async (client, message, args) => {
        const botName = args.join(" ");
        if (!botName) return message.reply("❌ Usage: `,botinfo <botname>`");

        const hostedBots = botProcessManager.getAllHostedBots();
        const foundBot = hostedBots.find(b => b.name.toLowerCase() === botName.toLowerCase());
        
        if (!foundBot) return message.reply(`❌ Bot not found: \`${botName}\``);

        const status = botProcessManager.getBotStatus(foundBot.path);
        const uptime = status.startedAt ? getUptime(status.startedAt) : "N/A";
        
        // Get file info
        const configPath = path.join(foundBot.path, 'config.json');
        const packagePath = path.join(foundBot.path, 'package.json');
        let configSize = "N/A";
        let dependencies = "N/A";

        try {
            if (fs.existsSync(configPath)) {
                const stats = fs.statSync(configPath);
                configSize = (stats.size / 1024).toFixed(2) + " KB";
            }
            if (fs.existsSync(packagePath)) {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
                dependencies = Object.keys(pkg.dependencies || {}).length;
            }
        } catch (err) {
            // Silent fail
        }

        const embed = new EmbedBuilder()
            .setColor(status.running ? "#57F287" : "#ED4245")
            .setTitle(`🤖 Bot Information: ${foundBot.name}`)
            .addFields(
                { name: "Status", value: status.running ? "🟢 Online" : "🔴 Offline", inline: true },
                { name: "Type", value: foundBot.type || "Unknown", inline: true },
                { name: "Uptime", value: uptime, inline: true },
                { name: "PID", value: status.pid ? String(status.pid) : "N/A", inline: true },
                { name: "Created", value: status.startedAt ? new Date(status.startedAt).toLocaleString() : "N/A", inline: true },
                { name: "Exists", value: foundBot.exists ? "✅ Yes" : "❌ No", inline: true },
                { name: "Path", value: `\`${foundBot.path}\``, inline: false },
                { name: "Config Size", value: configSize, inline: true },
                { name: "Dependencies", value: String(dependencies), inline: true }
            )
            .setFooter({ text: `Bot Management | Last Updated: ${new Date().toLocaleString()}` })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};

function getUptime(startDate) {
    const ms = Date.now() - new Date(startDate).getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
