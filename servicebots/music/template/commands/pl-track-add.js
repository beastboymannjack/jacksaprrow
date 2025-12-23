const { EmbedBuilder } = require('discord.js');
const Playlist = require('../../database/models/Playlist');
const PlaylistTrack = require('../../database/models/PlaylistTrack');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    name: 'pl track add',
    aliases: ['playlist-track-add', 'pltrackadd', 'pl-track-add'],
    description: 'Add a single song to one of your playlists',
    
    async execute(message, args) {
        const { client } = message;
        
        if (args.length < 2) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please provide both playlist name and song! Usage: \`pl track add <playlist name> | <song name/url>\``);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const fullText = args.join(' ');
        const parts = fullText.split('|').map(p => p.trim());
        
        if (parts.length !== 2) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please use \`|\` to separate playlist and song! Usage: \`pl track add <playlist name> | <song name/url>\``);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const playlistName = parts[0];
        const query = parts[1];
        const userId = message.author.id;

        const playlist = await Playlist.findOne({ 
            where: { userId, name: playlistName } 
        });
        
        if (!playlist) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Playlist **${playlistName}** not found!`);
            return message.reply({ 
                embeds: [embed] 
            });
        }

        const loadingEmbed = new EmbedBuilder().setColor(0x00d4aa).setDescription(`${emojis.music} Searching for song...`);
        const loadingMsg = await message.reply({ 
            embeds: [loadingEmbed]
        });

        const res = await client.poru.resolve({ query, requester: message.author });
        if (!res || !res.tracks || res.tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Could not find that song!`);
            return loadingMsg.edit({ 
                embeds: [embed] 
            });
        }

        const track = res.tracks[0];

        await PlaylistTrack.create({
            playlistId: playlist.id,
            title: track.info.title,
            identifier: track.info.identifier,
            author: track.info.author,
            length: track.info.length,
            uri: track.info.uri,
            artworkUrl: track.info.artworkUrl || track.info.image || null,
        });

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} Added **[${track.info.title}](${track.info.uri})** to playlist **${playlistName}**!`);
        
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
