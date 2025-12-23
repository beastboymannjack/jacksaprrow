const { EmbedBuilder } = require('discord.js');
const Playlist = require('../../database/models/Playlist');
const PlaylistTrack = require('../../database/models/PlaylistTrack');
const emojis = require('../emojis.json');

module.exports = {
    name: 'pl append',
    aliases: ['playlist-append', 'plappend', 'pl-append'],
    description: 'Add songs from a playlist to the current queue',
    
    async execute(message, args) {
        const { client, member, guild, channel } = message;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const playlistName = args.join(' ');
        
        if (!playlistName) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please provide a playlist name!`);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const loadingEmbed = new EmbedBuilder().setColor(0x00d4aa).setDescription(`${emojis.music} Loading playlist **${playlistName}**...`);
        const loadingMsg = await message.reply({ 
            embeds: [loadingEmbed]
        });

        const userId = message.author.id;

        const playlist = await Playlist.findOne({
            where: { userId, name: playlistName },
            include: [{ model: PlaylistTrack, as: 'tracks' }],
        });

        if (!playlist) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Playlist **${playlistName}** not found!`);
            return loadingMsg.edit({ 
                embeds: [embed] 
            });
        }

        if (!playlist.tracks || playlist.tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Playlist **${playlistName}** is empty!`);
            return loadingMsg.edit({ 
                embeds: [embed] 
            });
        }

        let player = client.poru.players.get(guild.id);
        
        if (!player) {
            player = client.poru.createConnection({
                guildId: guild.id,
                voiceChannel: member.voice.channel.id,
                textChannel: channel.id,
                deaf: true,
                mute: false,
            });
            if (player.autoplayEnabled === undefined) player.autoplayEnabled = true;
        }

        let added = 0;
        for (const trackData of playlist.tracks) {
            try {
                const poruTrack = await client.poru.resolve({ query: trackData.uri, requester: message.author });
                if (poruTrack && poruTrack.tracks && poruTrack.tracks[0]) {
                    player.queue.add(poruTrack.tracks[0]);
                    added++;
                }
            } catch (e) {
                console.error(`Error resolving track ${trackData.uri}:`, e.message);
            }
        }

        if (!player.isPlaying && player.isConnected) player.play();

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} Added **${added}** songs from playlist **${playlistName}** to the queue!`);
        
        return loadingMsg.edit({ 
            embeds: [embed] 
        });
    },
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
