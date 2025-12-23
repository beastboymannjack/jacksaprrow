const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDuration, createProgressBar } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),

    async execute(interaction) {
        const { client, member, guild } = interaction;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const player = client.poru.players.get(guild.id);
        
        if (!player || !player.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No music is currently playing!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const track = player.currentTrack;
        const progressBar = createProgressBar(player);
        
        const loopStatus = player.loop === 'TRACK' ? `${emojis.loopTrack || '🔂'} Track` : 
                          player.loop === 'QUEUE' ? `${emojis.loopQueue || '🔁'} Queue` : 
                          `${emojis.loopOff || '➡️'} Off`;
        
        const autoplayStatus = player.autoplayEnabled ? `${emojis.enabled || '✅'} On` : `${emojis.disabled || '❌'} Off`;

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setTitle(`${emojis.nowplaying || '🎵'} Now Playing`)
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .addFields(
                { name: `${emojis.artist || '👤'} Artist`, value: track.info.author || 'Unknown', inline: true },
                { name: `${emojis.duration || '⏱️'} Duration`, value: formatDuration(track.info.length), inline: true },
                { name: `${emojis.progress || '📊'} Progress`, value: progressBar, inline: false },
                { name: `${emojis.loopQueue || '🔁'} Loop`, value: loopStatus, inline: true },
                { name: `${emojis.autoplay || '▶️'} Autoplay`, value: autoplayStatus, inline: true }
            )
            .setFooter({ text: `Requested by ${track.info.requester?.username || track.info.requester || 'Unknown'}` });
        
        if (track.info.artworkUrl || track.info.image) {
            embed.setThumbnail(track.info.artworkUrl || track.info.image);
        }

        return interaction.reply({ embeds: [embed] });
    },
};
