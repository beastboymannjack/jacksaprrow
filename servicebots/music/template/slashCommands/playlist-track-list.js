const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../helpers/musicHelpers');
const Playlist = require('../../database/models/Playlist');
const PlaylistTrack = require('../../database/models/PlaylistTrack');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlisttracklist')
        .setDescription('Show the list of tracks in a playlist')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the playlist to show the list of tracks from')
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
        const playlistName = interaction.options.getString('name');
        const userId = interaction.user.id;

        const playlist = await Playlist.findOne({
            where: { userId, name: playlistName },
            include: [{ model: PlaylistTrack, as: 'tracks' }],
        });

        if (!playlist) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Playlist **${playlistName}** not found!`);
            return interaction.reply({ 
                embeds: [embed],
                ephemeral: true
            });
        }

        if (!playlist.tracks || playlist.tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Playlist **${playlistName}** is empty!`);
            return interaction.reply({ 
                embeds: [embed],
                ephemeral: true
            });
        }

        const createTrackListPage = async (page = 1) => {
            const itemsPerPage = 5;
            const totalPages = Math.ceil(playlist.tracks.length / itemsPerPage) || 1;
            page = Math.max(1, Math.min(page, totalPages));

            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentPageTracks = playlist.tracks.slice(start, end);

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`playlisttracks_prev_${page}`)
                    .setEmoji(emojis.prevPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId(`playlisttracks_next_${page}`)
                    .setEmoji(emojis.nextPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages)
            );

            let trackList = '';
            currentPageTracks.forEach((track, index) => {
                if (!track) {
                    trackList += `**${start + index + 1}.** Unknown Track\n`;
                } else {
                    let title = track.title || 'Unknown Title';
                    title = title.replace(/[[\]()]/g, '');
                    const uri = track.uri || '#';
                    const length = track.length || 0;
                    trackList += `**${start + index + 1}.** [${title.length > 55 ? title.slice(0, 52) + '…' : title}](${uri}) \`${formatDuration(length)}\`\n`;
                }
            });

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`## ${emojis.music} ${playlistName}\n\n${trackList}\n**Page ${page}/${totalPages}** • **${playlist.tracks.length} tracks in playlist**`);

            return { embeds: [embed], components: [buttons], fetchReply: true };
        };

        const response = await interaction.reply(await createTrackListPage(1));

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: `${emojis.error} Only the command user can navigate!`, ephemeral: true });
            }

            const customId = i.customId;
            const currentPage = parseInt(customId.split('_')[2]);
            let newPage = currentPage;

            if (customId.startsWith('playlisttracks_prev')) {
                newPage = currentPage - 1;
            } else if (customId.startsWith('playlisttracks_next')) {
                newPage = currentPage + 1;
            }

            await i.update(await createTrackListPage(newPage));
        });

        collector.on('end', () => {
            response.edit({ components: [] }).catch(() => {});
        });
    },
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
