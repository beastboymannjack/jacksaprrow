const Discord = require("discord.js");
const mainconfig = require("../../../mainconfig");

module.exports = {
    name: "dashboard",
    aliases: ["dash", "panel", "login", "auth"],
    category: "Information",
    description: "Get the dashboard link to manage bots and authenticate",
    usage: "dashboard",
    run: async (client, message, args) => {
        const dashboardURL = client.dashboardURL || mainconfig.DashBoard;
        
        if (!dashboardURL || !dashboardURL.startsWith('http')) {
            return message.reply({ 
                embeds: [new Discord.EmbedBuilder()
                    .setColor("#ff6b6b")
                    .setTitle("Dashboard Not Configured")
                    .setDescription("The dashboard URL is not configured yet. Please contact the server administrator to set up the DASHBOARD_URL environment variable.")
                ]
            }).catch(console.error);
        }
        
        const embed = new Discord.EmbedBuilder()
            .setColor(client.config.color || "#6861fe")
            .setTitle("🌐 Bot Hosting Dashboard")
            .setDescription("Access the dashboard to manage your bots, view logs, and more!")
            .addFields({ name: "🔗 Dashboard Link", value: `[Click here to open Dashboard](${dashboardURL})` })
            .addFields({ name: "📋 Dashboard Config", value: `[Dashboard Configuration & Invite](${dashboardURL}/config)` })
            .addFields({ name: "🚀 Quick Start", value: "1. Click the dashboard link above\n2. Click 'Login' in the top right\n3. Authorize with your Discord account\n4. Start managing your bots!" })
            .addFields({ name: "✨ Features", value: "• Create and manage hosted bots\n• View activity logs\n• Monitor bot status\n• Team management\n• Configure bot settings" })
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
        
        const row = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setLabel("Open Dashboard")
                    .setStyle(Discord.ButtonStyle.Link)
                    .setURL(dashboardURL)
                    .setEmoji("🌐"),
                new Discord.ButtonBuilder()
                    .setLabel("Dashboard Config")
                    .setStyle(Discord.ButtonStyle.Link)
                    .setURL(`${dashboardURL}/config`)
                    .setEmoji("⚙️"),
                new Discord.ButtonBuilder()
                    .setLabel("Login with Discord")
                    .setStyle(Discord.ButtonStyle.Link)
                    .setURL(`${dashboardURL}/login`)
                    .setEmoji("🔐")
            );
        
        message.reply({ embeds: [embed], components: [row] }).catch(console.error);
    }
};
