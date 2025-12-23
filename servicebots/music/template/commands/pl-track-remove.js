const { EmbedBuilder } = require('discord.js');
const Playlist = require('../../database/models/Playlist');
const PlaylistTrack = require('../../database/models/PlaylistTrack');
const emojis = require('../emojis.json');

module.exports = {
    name: 'pl track remove',
    aliases: ['playlist-track-remove', 'pltrackremove', 'pl-track-remove'],
    description: 'Remove a track from one of your playlists',
    
    async execute(message, args) {
        if (args.length < 2) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please provide both playlist name and position! Usage: \`pl track remove <playlist name> | <position>\``);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const fullText = args.join(' ');
        const parts = fullText.split('|').map(p => p.trim());
        
        if (parts.length !== 2) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please use \`|\` to separate playlist and position! Usage: \`pl track remove <playlist name> | <position>\``);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const playlistName = parts[0];
        const position = parseInt(parts[1]);
        
        if (isNaN(position) || position < 1) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Invalid position! Please provide a valid number.`);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const userId = message.author.id;

        const playlist = await Playlist.findOne({
            where: { userId, name: playlistName },
            include: [{ model: PlaylistTrack, as: 'tracks' }],
        });
        
        if (!playlist) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Playlist **${playlistName}** not found!`);
            return message.reply({ 
                embeds: [embed] 
            });
        }

        if (!playlist.tracks || playlist.tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Playlist **${playlistName}** is empty!`);
            return message.reply({ 
                embeds: [embed] 
            });
        }

        if (position < 1 || position > playlist.tracks.length) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Invalid position! Playlist has **${playlist.tracks.length}** tracks.`);
            return message.reply({ 
                embeds: [embed] 
            });
        }

        const trackToRemove = playlist.tracks[position - 1];
        await trackToRemove.destroy();

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} Removed **${trackToRemove.title}** from playlist **${playlistName}**!`);
        
        return message.reply({ 
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
