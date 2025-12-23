const { EmbedBuilder } = require('discord.js');
const Playlist = require('../../database/models/Playlist');
const emojis = require('../emojis.json');

module.exports = {
    name: 'pl share',
    aliases: ['playlist-share', 'plshare', 'pl-share'],
    description: 'Share a playlist with others',
    
    async execute(message, args) {
        const playlistName = args.join(' ');
        
        if (!playlistName) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please provide a playlist name!`);
            return message.reply({ 
                embeds: [embed]
            });
        }

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

        let shareCode = playlist.shareCode;

        if (!shareCode) {
            shareCode = `DEADLOOM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            playlist.shareCode = shareCode;
            await playlist.save();
        }

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`## ${emojis.music} Share Playlist: ${playlist.name}\n\nShare this code with others so they can import your playlist using \`pl import\`:\n\n**Share Code:** \`${shareCode}\``);
        
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
