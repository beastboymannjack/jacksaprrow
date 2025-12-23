const { EmbedBuilder } = require('discord.js');
const { formatDuration, createProgressBar } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    name: 'nowplaying',
    aliases: ['np'],
    description: 'Show the currently playing song',

    async execute(message) {
        const { client, member, guild } = message;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return message.reply({ embeds: [embed] });
        }

        const player = client.poru.players.get(guild.id);
        
        if (!player || !player.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No music is currently playing!`);
            return message.reply({ embeds: [embed] });
        }

        const track = player.currentTrack;
        const progressBar = createProgressBar(player);

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setTitle(`${emojis.nowplaying} Now Playing`)
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .addFields(
                { name: `${emojis.artist} Artist`, value: track.info.author, inline: true },
                { name: `${emojis.duration} Duration`, value: formatDuration(track.info.length), inline: true },
                { name: `${emojis.progress} Progress`, value: progressBar, inline: false },
                { name: `${emojis.loopQueue} Loop`, value: player.loop === 'TRACK' ? `${emojis.loopTrack} Track` : player.loop === 'QUEUE' ? `${emojis.loopQueue} Queue` : `${emojis.loopOff} Off`, inline: true },
                { name: `${emojis.autoplay} Autoplay`, value: player.autoplayEnabled ? `${emojis.enabled} On` : `${emojis.disabled} Off`, inline: true }
            )
            .setFooter({ text: `Requested by ${track.info.requester?.tag || track.info.requester?.username || 'Unknown'}` });

        if (track.info.artworkUrl || track.info.image) {
            embed.setThumbnail(track.info.artworkUrl || track.info.image);
        }

        return message.reply({ embeds: [embed] });
    },
};
