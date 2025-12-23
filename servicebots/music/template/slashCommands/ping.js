const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: 'Pinging...', 
            fetchReply: true,
            ephemeral: true 
        });

        const wsLatency = interaction.client.ws.ping;
        const editLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const uptime = Math.floor(interaction.client.uptime / 1000);

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setTitle('**Pong!**')
            .setDescription(`${emojis.dots} Websocket Latency: \`${wsLatency}ms\`\n${emojis.dots} Edit Response: \`${editLatency}ms\`\n${emojis.dots} Uptime: \`${uptime}s\``);

        await interaction.editReply({
            content: null,
            embeds: [embed]
        });
    },
};
