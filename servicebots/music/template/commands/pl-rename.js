const { EmbedBuilder } = require('discord.js');
const Playlist = require('../../database/models/Playlist');
const emojis = require('../emojis.json');

module.exports = {
    name: 'pl rename',
    aliases: ['playlist-rename', 'plrename', 'pl-rename'],
    description: 'Rename one of your playlists',
    
    async execute(message, args) {
        if (args.length < 2) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please provide both old and new playlist names! Usage: \`pl rename <old name> | <new name>\``);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const fullText = args.join(' ');
        const parts = fullText.split('|').map(p => p.trim());
        
        if (parts.length !== 2) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please use \`|\` to separate old and new names! Usage: \`pl rename <old name> | <new name>\``);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const playlistName = parts[0];
        const newName = parts[1];
        
        if (!playlistName || !newName) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Both names must be provided!`);
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

        const existingWithNewName = await Playlist.findOne({ 
            where: { userId, name: newName } 
        });
        
        if (existingWithNewName) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You already have a playlist named **${newName}**!`);
            return message.reply({ 
                embeds: [embed] 
            });
        }

        playlist.name = newName;
        await playlist.save();

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} Renamed playlist **${playlistName}** to **${newName}**!`);
        
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
