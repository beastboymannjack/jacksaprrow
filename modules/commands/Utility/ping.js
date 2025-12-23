const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    aliases: ['latency', 'ms'],
    category: 'Utility',
    description: 'Check bot latency and status',
    usage: ',ping',
    
    async execute(message, client) {
        const msg = await message.reply({ content: '🔄 Checking latency...' });
        
        const apiLatency = Math.round(client.ws.ping);
        const botLatency = msg.createdTimestamp - message.createdTimestamp;
        const uptime = Math.floor(client.uptime / 1000);
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Bot Latency & Status')
            .addFields(
                { name: 'API Latency', value: `\`${apiLatency}ms\``, inline: true },
                { name: 'Bot Latency', value: `\`${botLatency}ms\``, inline: true },
                { name: 'Uptime', value: `\`${uptime}s\``, inline: true },
                { name: 'Status', value: apiLatency < 100 ? '🟢 Excellent' : apiLatency < 200 ? '🟡 Good' : '🔴 Poor', inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        return msg.edit({ content: null, embeds: [embed] });
    }
};
