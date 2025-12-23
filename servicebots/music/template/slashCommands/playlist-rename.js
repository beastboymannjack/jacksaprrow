const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hexToDecimal } = require('../helpers/colorHelper');
const Playlist = require('../../database/models/Playlist');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlistrename')
        .setDescription('Rename one of your playlists')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the playlist to rename')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('new_name')
                .setDescription('The new name for the playlist')
                .setRequired(true)
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
            return interaction.respond([]);
        }
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const playlistName = interaction.options.getString('name');
        const newName = interaction.options.getString('new_name');
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

        const existingWithNewName = await Playlist.findOne({ 
            where: { userId, name: newName } 
        });
        
        if (existingWithNewName) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You already have a playlist named **${newName}**!`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        playlist.name = newName;
        await playlist.save();

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} Renamed playlist **${playlistName}** to **${newName}**!`);
        
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
