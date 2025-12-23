const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { hexToDecimal } = require('../helpers/colorHelper');
const Playlist = require('../../database/models/Playlist');
const PlaylistTrack = require('../../database/models/PlaylistTrack');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlistimport')
        .setDescription('Import playlist from share code or Spotify URL')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Share code or Spotify playlist URL to import')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const { client, user } = interaction;
        
        await interaction.deferReply({ ephemeral: true });

        const codeOrUrl = interaction.options.getString('code');
        const userId = user.id;

        if (/^https?:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+/i.test(codeOrUrl.trim())) {
            return _importFromSpotify(interaction, codeOrUrl);
        }

        try {
            const originalPlaylist = await Playlist.findOne({
                where: { shareCode: codeOrUrl },
                include: [{ model: PlaylistTrack, as: 'tracks' }],
            });

            if (!originalPlaylist) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} Invalid share code! Please check the code and try again.`);
                return interaction.editReply({ 
                    embeds: [embed] 
                });
            }

            let newPlaylistName = originalPlaylist.name;

            const existing = await Playlist.findOne({ 
                where: { userId, name: newPlaylistName } 
            });
            
            if (existing) {
                newPlaylistName = `${newPlaylistName} (Imported)`;
            }

            const playlistCount = await Playlist.count({ where: { userId } });
            if (playlistCount >= config.MUSIC.PLAYLIST_LIMIT) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} You have reached the maximum playlist limit (**${config.MUSIC.PLAYLIST_LIMIT}** playlists)!`);
                return interaction.editReply({ 
                    embeds: [embed] 
                });
            }

            const newPlaylist = await Playlist.create({
                userId: userId,
                name: newPlaylistName,
            });

            const tracksToCopy = originalPlaylist.tracks.map((track) => ({
                playlistId: newPlaylist.id,
                title: track.title,
                identifier: track.identifier,
                author: track.author,
                length: track.length,
                uri: track.uri,
            }));

            await PlaylistTrack.bulkCreate(tracksToCopy);

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.success} Successfully imported **${tracksToCopy.length}** tracks from **${originalPlaylist.name}** as **${newPlaylist.name}**!`);

            return interaction.editReply({ 
                embeds: [embed] 
            });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Failed to import playlist. Please try again.`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }
    },
};

async function _importFromSpotify(interaction, url) {
    const { client, user } = interaction;
    const userId = user.id;

    const res = await client.poru.resolve({
        query: url,
        requester: user,
    });
    
    if (!res || res.loadType !== 'PLAYLIST_LOADED' || !res.tracks.length) {
        const embed = new EmbedBuilder()
            .setColor(0xff6b6b)
            .setDescription(`${emojis.error} Failed to load Spotify playlist! Make sure the URL is valid.`);
        return interaction.editReply({ 
            embeds: [embed] 
        });
    }

    const spotifyPlaylistName = res.playlistInfo.name;
    const tracksFromSpotify = res.tracks;

    const existingPlaylist = await Playlist.findOne({ 
        where: { userId, name: spotifyPlaylistName } 
    });
    
    if (existingPlaylist) {
        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`## ${emojis.music} Playlist Already Exists\nYou already have a playlist named **${spotifyPlaylistName}**. What would you like to do?`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('import_overwrite')
                .setLabel('Overwrite')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('import_copy')
                .setLabel('Create Copy')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('import_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const reply = await interaction.editReply({ 
            embeds: [embed],
            components: [row]
        });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === user.id,
            time: 60000,
        });

        collector.on('collect', async (i) => {
            await i.deferUpdate();

            if (i.customId === 'import_overwrite') {
                await PlaylistTrack.destroy({ where: { playlistId: existingPlaylist.id } });
                await _saveTracksToPlaylist(existingPlaylist, tracksFromSpotify);

                const successEmbed = new EmbedBuilder()
                    .setColor(0x00d4aa)
                    .setDescription(`${emojis.success} Overwritten playlist **${spotifyPlaylistName}** with **${tracksFromSpotify.length}** tracks from Spotify!`);
                await i.editReply({ 
                    embeds: [successEmbed],
                    components: []
                });
            } else if (i.customId === 'import_copy') {
                let newName = '';
                let copyNum = 1;
                let isNameAvailable = false;

                while (!isNameAvailable) {
                    newName = `${spotifyPlaylistName} (${copyNum})`;
                    const check = await Playlist.findOne({ where: { userId, name: newName } });
                    if (!check) {
                        isNameAvailable = true;
                    } else {
                        copyNum++;
                    }
                }

                const newPlaylist = await Playlist.create({ userId, name: newName });
                await _saveTracksToPlaylist(newPlaylist, tracksFromSpotify);

                const successEmbed = new EmbedBuilder()
                    .setColor(0x00d4aa)
                    .setDescription(`${emojis.success} Created new playlist **${newName}** with **${tracksFromSpotify.length}** tracks from Spotify!`);
                await i.editReply({ 
                    embeds: [successEmbed],
                    components: []
                });
            } else if (i.customId === 'import_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} Import cancelled.`);
                await i.editReply({ 
                    embeds: [cancelEmbed],
                    components: []
                });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} Import timed out. Please try again.`);
                interaction.editReply({ 
                    embeds: [timeoutEmbed],
                    components: []
                });
            }
        });
    } else {
        const playlistCount = await Playlist.count({ where: { userId } });
        if (playlistCount >= config.MUSIC.PLAYLIST_LIMIT) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You have reached the maximum playlist limit (**${config.MUSIC.PLAYLIST_LIMIT}** playlists)!`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        const newPlaylist = await Playlist.create({ userId, name: spotifyPlaylistName });
        await _saveTracksToPlaylist(newPlaylist, tracksFromSpotify);

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} Successfully imported **${tracksFromSpotify.length}** tracks from Spotify playlist **${spotifyPlaylistName}**!`);
        await interaction.editReply({ 
            embeds: [embed] 
        });
    }
}

async function _saveTracksToPlaylist(playlist, tracks) {
    const tracksToSave = tracks.map((track) => ({
        playlistId: playlist.id,
        title: track.info.title,
        identifier: track.info.identifier,
        author: track.info.author,
        length: track.info.length,
        uri: track.info.uri,
    }));
    await PlaylistTrack.bulkCreate(tracksToSave);
}

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
