const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const Playlist = require('../../database/models/Playlist');
const PlaylistTrack = require('../../database/models/PlaylistTrack');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    name: 'pl import',
    aliases: ['playlist-import', 'plimport', 'pl-import'],
    description: 'Import playlist from share code or Spotify URL',
    
    async execute(message, args) {
        const { client, author } = message;
        
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please provide a share code or Spotify playlist URL!`);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const codeOrUrl = args.join(' ');
        const userId = author.id;

        if (/^https?:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+/i.test(codeOrUrl.trim())) {
            return _importFromSpotify(message, codeOrUrl);
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
                return message.reply({ 
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
                return message.reply({ 
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

            return message.reply({ 
                embeds: [embed] 
            });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Failed to import playlist. Please try again.`);
            return message.reply({ 
                embeds: [embed] 
            });
        }
    },
};

async function _importFromSpotify(message, url) {
    const { client, author } = message;
    const userId = author.id;

    const loadingEmbed = new EmbedBuilder().setColor(0x00d4aa).setDescription(`${emojis.music} Loading Spotify playlist...`);
    const loadingMsg = await message.reply({ 
        embeds: [loadingEmbed]
    });

    const res = await client.poru.resolve({
        query: url,
        requester: author,
    });
    
    if (!res || res.loadType !== 'PLAYLIST_LOADED' || !res.tracks.length) {
        const embed = new EmbedBuilder()
            .setColor(0xff6b6b)
            .setDescription(`${emojis.error} Failed to load Spotify playlist! Make sure the URL is valid.`);
        return loadingMsg.edit({ 
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

        const reply = await loadingMsg.edit({ 
            embeds: [embed],
            components: [row]
        });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
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
                const cancelEmbed = new EmbedBuilder().setColor(0xff6b6b).setDescription(`${emojis.error} Import cancelled.`);
                await i.editReply({ 
                    embeds: [cancelEmbed],
                    components: []
                });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder().setColor(0xff6b6b).setDescription(`${emojis.error} Import timed out. Please try again.`);
                loadingMsg.edit({ 
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
            return loadingMsg.edit({ 
                embeds: [embed] 
            });
        }

        const newPlaylist = await Playlist.create({ userId, name: spotifyPlaylistName });
        await _saveTracksToPlaylist(newPlaylist, tracksFromSpotify);

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} Successfully imported **${tracksFromSpotify.length}** tracks from Spotify playlist **${spotifyPlaylistName}**!`);
        await loadingMsg.edit({ 
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
