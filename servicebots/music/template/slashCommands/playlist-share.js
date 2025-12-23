const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hexToDecimal } = require('../helpers/colorHelper');
const Playlist = require('../../database/models/Playlist');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlistshare')
        .setDescription('Share a playlist with others')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the playlist to share')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    
    async autocomplete(interaction) {
        const userId = interaction.user.id;
        const focusedValue = interaction.options.getFocused();

        try {
            const playlists = await Playlist.findAll({
                where: { userId },
                limit: 25,
            });

            if (!playlists || playlists.length === 0) {
                return interaction.respond([]);
            }

            const filteredChoices = playlists
                .map((playlist) => playlist.name)
                .filter((name) => name.toLowerCase().includes(focusedValue.toLowerCase()))
                .map((name) => ({ name: name.length > 100 ? name.slice(0, 97) + '...' : name, value: name }));
            
            return interaction.respond(filteredChoices.slice(0, 25));
        } catch (error) {
            console.error('Playlist autocomplete error:', error);
            return interaction.respond([]);
        }
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const playlistName = interaction.options.getString('name');
        const userId = interaction.user.id;

        const playlist = await Playlist.findOne({ 
            where: { userId, name: playlistName } 
        });
        
        if (!playlist) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Playlist **${playlistName}** not found!`);
            return interaction.editReply({ 
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
            .setDescription(`## ${emojis.music} Share Playlist: ${playlist.name}\n\nShare this code with others so they can import your playlist using \`/playlistimport\`:\n\n**Share Code:** \`${shareCode}\``);
        
        return interaction.editReply({ 
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
