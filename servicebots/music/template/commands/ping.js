const { EmbedBuilder } = require('discord.js');
const emojis = require('../emojis.json');

module.exports = {
    name: 'ping',
    aliases: ['latency', 'ms'],
    description: 'Check the bot\'s latency',
    
    async execute(message) {
        const sent = await message.reply({ 
            content: 'Pinging...',
            fetchReply: true
        });

        const wsLatency = message.client.ws.ping;
        const editLatency = sent.createdTimestamp - message.createdTimestamp;
        const uptime = Math.floor(message.client.uptime / 1000);

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setTitle('**Pong!**')
            .setDescription(`${emojis.dots} Websocket Latency: \`${wsLatency}ms\`\n${emojis.dots} Edit Response: \`${editLatency}ms\`\n${emojis.dots} Uptime: \`${uptime}s\``);

        await sent.edit({
            content: null,
            embeds: [embed]
        });
    },
};
