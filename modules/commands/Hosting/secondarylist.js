const Discord = require('discord.js');
const mainconfig = require('../../../mainconfig');
const remoteBotClient = require('../../api/remoteBotClient');

module.exports = {
    name: "secondarylist",
    aliases: ["seclist", "slist", "secondary-list", "secondarybots"],
    category: "Hosting",
    description: "List all bots on deadloom hosting",
    usage: ",secondarylist",
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

        const loadingEmbed = new Discord.EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('⏳ Fetching Bots')
            .setDescription('Retrieving list of bots from deadloom hosting...');

        const msg = await message.reply({ embeds: [loadingEmbed] });

        try {
            const bots = await remoteBotClient.listBots();

            if (!bots || bots.length === 0) {
                const emptyEmbed = new Discord.EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('📭 No Bots Found')
                    .setDescription('There are currently no bots on deadloom hosting.')
                    .setFooter({ text: 'deadloom hosting Bot Hosting' });

                return await msg.edit({ embeds: [emptyEmbed] });
            }

            const embed = new Discord.EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`🤖 deadloom hosting Bots (${bots.length})`)
                .setDescription('List of all bots hosted on deadloom hosting')
                .setFooter({ text: 'deadloom hosting Bot Hosting' })
                .setTimestamp();

            for (const bot of bots.slice(0, 25)) {
                const statusEmoji = bot.running ? '🟢' : '🔴';
                const uptime = bot.uptime ? formatUptime(bot.uptime) : 'N/A';
                
                embed.addFields({ name: `${statusEmoji} ${bot.name}`, value: [
                        `**Status**: ${bot.running ? 'Running' : 'Stopped'}`,
                        `**Type**: ${bot.type || 'Unknown'}`,
                        `**PID**: \`${bot.pid || 'N/A'}\``,
                        `**Uptime**: ${uptime}`,
                        `**Started**: ${bot.startedAt ? new Date(bot.startedAt).toLocaleString() : 'N/A'}`
                    ].join('\n'),
                    inline: false
                });
            }

            if (bots.length > 25) {
                embed.setDescription(`Showing 25 of ${bots.length} bots`);
            }

            await msg.edit({ embeds: [embed] });
        } catch (error) {
            const errorEmbed = new Discord.EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Failed to Fetch Bot List')
                .setDescription(`\`\`\`\n${error.message}\n\`\`\``)
                .setFooter({ text: `Error: ${error.message}` });

            await msg.edit({ embeds: [errorEmbed] });
        }
    }
};

function formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}
