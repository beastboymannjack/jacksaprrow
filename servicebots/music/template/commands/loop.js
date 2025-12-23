const { EmbedBuilder } = require('discord.js');
const { hasControlPermission } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    name: 'loop',
    aliases: ['repeat', 'lp'],
    description: 'Set repeat mode',

    async execute(message, args) {
        const { client, member, guild } = message;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return message.reply({ embeds: [embed] });
        }

        const player = client.poru.players.get(guild.id);
        
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No music is currently playing!`);
            return message.reply({ embeds: [embed] });
        }

        if (member.voice.channel.id !== player.voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You must be in the same voice channel as the bot!`);
            return message.reply({ embeds: [embed] });
        }

        if (!hasControlPermission(message, player)) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Only the requester, admins, or server managers can control the music!`);
            return message.reply({ embeds: [embed] });
        }

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please specify a mode: \`off\`, \`track\`, or \`queue\`!`);
            return message.reply({ embeds: [embed] });
        }

        const mode = args[0].toLowerCase();
        let loopText = '';
        
        if (mode === 'off' || mode === 'none') {
            player.setLoop('NONE');
            loopText = `${emojis.error} Loop mode disabled.`;
        } else if (mode === 'track') {
            player.setLoop('TRACK');
            loopText = `${emojis.loopTrack} Loop track enabled.`;
        } else if (mode === 'queue') {
            player.setLoop('QUEUE');
            loopText = `${emojis.loop} Queue repeat enabled.`;
        } else {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Invalid mode! Use: \`off\`, \`track\`, or \`queue\`!`);
            return message.reply({ embeds: [embed] });
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(loopText);
        
        return message.reply({ embeds: [embed] });
    },
};
