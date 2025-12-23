const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../helpers/musicHelpers');
const Favorite = require('../../database/models/Favorite');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('favoritelist')
        .setDescription('Show your favorite songs'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const userId = interaction.user.id;

        const favorites = await Favorite.findAll({
            where: { userId },
            order: [['createdAt', 'ASC']],
        });

        if (!favorites || favorites.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You don't have any favorite songs yet!`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(favorites.length / itemsPerPage) || 1;

        async function createFavoriteListEmbed(page = 1) {
            page = Math.max(1, Math.min(page, totalPages));
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentPageFavorites = favorites.slice(start, end);

            const list = currentPageFavorites.map((f, idx) => 
                `**${start + idx + 1}.** [${f.title}](${f.uri}) - \`${formatDuration(f.length)}\``
            ).join('\n');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`favoritelist_prev_${page}`)
                    .setEmoji(emojis.prevPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId(`favoritelist_next_${page}`)
                    .setEmoji(emojis.nextPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages)
            );

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setTitle(`${emojis.favorite} Your Favorite Songs`)
                .setDescription(list)
                .setFooter({ text: `Page ${page} of ${totalPages} | Total: ${favorites.length} songs` });

            return {
                embeds: [embed],
                components: [buttons],
                fetchReply: true,
            };
        }

        const initialPage = 1;
        const messageOptions = await createFavoriteListEmbed(initialPage);
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

            const updatedMessageOptions = await createFavoriteListEmbed(currentPage);
            await buttonInteraction.update(updatedMessageOptions);
        });

        collector.on('end', async () => {
            if (message.editable) {
                const finalState = await createFavoriteListEmbed(1);
                finalState.components = [];
                await message.edit(finalState).catch(() => {});
            }
        });
    },
};
