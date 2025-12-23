const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Playlist = require('../../database/models/Playlist');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlistcreate')
        .setDescription('Create a new empty playlist')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name for your new playlist')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const playlistName = interaction.options.getString('name');
        const userId = interaction.user.id;

        const playlistCount = await Playlist.count({ where: { userId } });

        if (playlistCount >= config.MUSIC.PLAYLIST_LIMIT) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You have reached the maximum playlist limit (**${config.MUSIC.PLAYLIST_LIMIT}** playlists)!`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        const existing = await Playlist.findOne({ where: { userId, name: playlistName } });
        if (existing) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You already have a playlist named **${playlistName}**!`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        await Playlist.create({ userId, name: playlistName });

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} Created empty playlist **${playlistName}**!\nUse \`/playlisttrackadd\` to add songs to it.`);
        
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
