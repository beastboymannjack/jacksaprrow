const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { hexToDecimal } = require('../helpers/colorHelper');
const Playlist = require('../../database/models/Playlist');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlistlist')
        .setDescription('Show all of your saved playlists'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const userId = interaction.user.id;

        const playlists = await Playlist.findAll({
            where: { userId },
            order: [['name', 'ASC']],
        });

        if (!playlists || playlists.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You don't have any playlists yet!`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(playlists.length / itemsPerPage) || 1;

        async function createPlaylistListEmbed(page = 1) {
            page = Math.max(1, Math.min(page, totalPages));
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentPagePlaylists = playlists.slice(start, end);

            const list = currentPagePlaylists.map((p, idx) => `**${start + idx + 1}.** ${p.name}`).join('\n');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`playlistlist_prev_${page}`)
                    .setEmoji(emojis.prevPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId(`playlistlist_next_${page}`)
                    .setEmoji(emojis.nextPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages)
            );

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`## ${emojis.music} Your Playlists\n\n${list}\n\nPage ${page} of ${totalPages} | Total: ${playlists.length} playlists`);

            return {
                embeds: [embed],
                components: [buttons],
                fetchReply: true,
            };
        }

        const initialPage = 1;
        const messageOptions = await createPlaylistListEmbed(initialPage);
        const message = await interaction.editReply(messageOptions);

        const collector = message.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 5 * 60 * 1000,
        });

        collector.on('collect', async (buttonInteraction) => {
            const [prefix, action, currentPageStr] = buttonInteraction.customId.split('_');
            let currentPage = parseInt(currentPageStr, 10);

            if (action === 'next') {
                currentPage++;
            } else if (action === 'prev') {
                currentPage--;
            }

            const updatedMessageOptions = await createPlaylistListEmbed(currentPage);
            await buttonInteraction.update(updatedMessageOptions);
        });

        collector.on('end', async () => {
            if (message.editable) {
                const finalState = await createPlaylistListEmbed(1);
                finalState.components = [];
                await message.edit(finalState).catch(() => {});
            }
        });
    },
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
