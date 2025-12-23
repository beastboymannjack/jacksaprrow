const Discord = require("discord.js");
const mainconfig = require("../../../mainconfig");

module.exports = {
    name: "verify",
    aliases: ["authenticate", "link"],
    category: "Information",
    description: "Verify your account by linking with the dashboard",
    usage: "verify",
    run: async (client, message, args) => {
        const dashboardURL = client.dashboardURL || mainconfig.DashBoard;
        
        if (!dashboardURL || !dashboardURL.startsWith('http')) {
            return message.reply({ 
                embeds: [new Discord.EmbedBuilder()
                    .setColor("#ff6b6b")
                    .setTitle("Verification Not Available")
                    .setDescription("The dashboard URL is not configured yet. Please contact the server administrator to set up the DASHBOARD_URL environment variable.")
                ]
            }).catch(console.error);
        }
        
        const embed = new Discord.EmbedBuilder()
            .setColor(client.config.color || "#6861fe")
            .setTitle("Account Verification")
            .setDescription("Link your Discord account with our dashboard to access all features!")
            .addFields({ name: "Step 1", value: `Visit the [Dashboard](${dashboardURL})` })
            .addFields({ name: "Step 2", value: `Click [Login](${dashboardURL}/login) to authenticate with Discord` })
            .addFields({ name: "Step 3", value: "Grant the required permissions when prompted" })
            .addFields({ name: "Step 4", value: "You're now verified and can access all dashboard features!" })
            .addFields({ name: "Why Verify?", value: "• Manage your hosted bots\n• Access the bot creation panel\n• View your bot statistics\n• Get support faster" })
            .setFooter({ text: `User ID: ${message.author.id}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp()
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));
        
        const row = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setLabel("Verify Now")
                    .setStyle(Discord.ButtonStyle.Link)
                    .setURL(`${dashboardURL}/login`)
                    .setEmoji("✅")
            );
        
        message.reply({ embeds: [embed], components: [row] }).catch(console.error);
    }
};
