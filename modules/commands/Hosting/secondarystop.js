const Discord = require('discord.js');
const mainconfig = require('../../../mainconfig');
const remoteBotClient = require('../../api/remoteBotClient');

module.exports = {
    name: "secondarystop",
    aliases: ["secstop", "sstop", "secondary-stop"],
    category: "Hosting",
    description: "Stop a bot on deadloom hosting",
    usage: ",secondarystop <botName>",
    permissions: ["ADMINISTRATOR"],
    run: async (client, message, args, cmduser, text, prefix) => {
        const hasPermission = message.member.permissions.has("ADMINISTRATOR") ||
            message.member.roles.cache.has(mainconfig.ServerRoles.FounderId) ||
            message.member.roles.cache.has(mainconfig.ServerRoles.BotCreatorRoleId) ||
            message.member.roles.cache.has(mainconfig.ServerRoles.ChiefBotCreatorRoleId) ||
            message.author.id === mainconfig.BotOwnerID;

        if (!hasPermission) {
            return message.reply({ embeds: [
                new Discord.EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ You do not have permission to use this command.')
            ]});
        }

        if (!remoteBotClient.isConfigured()) {
            return message.reply({ embeds: [
                new Discord.EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ deadloom hosting Not Configured')
                    .setDescription('Remote bot hosting is not configured. Please set up `REMOTE_LOG_URL` and `REMOTE_LOG_API_KEY` environment variables.')
            ]});
        }

        if (!args[0]) {
            return message.reply({ embeds: [
                new Discord.EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription(`❌ Usage: \`${prefix}secondarystop <botName>\``)
            ]});
        }

        const botKey = args[0].toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
        
        const loadingEmbed = new Discord.EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('⏳ Stopping Bot')
            .setDescription(`Stopping bot \`${botKey}\` on deadloom hosting...\nPlease wait...`);

        const msg = await message.reply({ embeds: [loadingEmbed] });

        try {
            const result = await remoteBotClient.stopBot(botKey);

            const successEmbed = new Discord.EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Bot Stopped')
                .addFields({ name: 'Bot Name', value: `\`${botKey}\``, inline: true })
                .addFields({ name: 'Location', value: '🖥️ deadloom hosting', inline: true })
                .setDescription('The bot has been successfully stopped.')
                .setFooter({ text: `Stopped by ${message.author.tag}` })
                .setTimestamp();

            await msg.edit({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new Discord.EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Failed to Stop Bot')
                .addFields({ name: 'Bot Name', value: `\`${botKey}\``, inline: true })
                .setDescription(`\`\`\`\n${error.message}\n\`\`\``)
                .setFooter({ text: `Error: ${error.message}` })
                .setTimestamp();

            await msg.edit({ embeds: [errorEmbed] });
        }
    }
};
