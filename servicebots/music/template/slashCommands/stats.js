const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hexToDecimal } = require('../helpers/colorHelper');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View bot statistics'),
    
    async execute(interaction) {
        const { client } = interaction;
        
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const totalChannels = client.channels.cache.size;
        const uptime = Math.floor(client.uptime / 1000);
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const activePlayers = client.poru.players.size;
        const wsLatency = client.ws.ping;
        const nodeCount = client.poru.nodes.size;
        
        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`# ${client.user.username} Statistics\n\n**Server Statistics**\n${emojis.dots} Servers: \`${totalGuilds}\`\n${emojis.dots} Users: \`${totalUsers.toLocaleString()}\`\n${emojis.dots} Channels: \`${totalChannels}\`\n\n**Music System**\n${emojis.dots} Active Players: \`${activePlayers}\`\n${emojis.dots} LavaLink Nodes: \`${nodeCount}\`\n\n**System Resources**\n${emojis.dots} Uptime: \`${uptimeString}\`\n${emojis.dots} Memory Usage: \`${memoryUsage} MB\`\n${emojis.dots} Websocket Latency: \`${wsLatency}ms\``);

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
