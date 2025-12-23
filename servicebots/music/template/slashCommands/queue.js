const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current song queue'),

    async execute(interaction) {
        const { client, member, guild } = interaction;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const player = client.poru.players.get(guild.id);
        
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No music is currently playing!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const createQueuePage = async (page = 1) => {
            const itemsPerPage = 10;
            const totalPages = Math.ceil(player.queue.length / itemsPerPage) || 1;
            page = Math.max(1, Math.min(page, totalPages));

            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentQueue = player.queue.slice(start, end);

            const nowPlaying = player.currentTrack;
            
            let description = '';
            
            if (nowPlaying) {
                let npTitle = nowPlaying.info.title || 'Unknown';
                npTitle = npTitle.replace(/[[\]()]/g, '');
                description += `**${emojis.nowplaying} Now Playing:**\n[${npTitle}](${nowPlaying.info.uri}) \`${formatDuration(nowPlaying.info.length)}\`\n\n`;
            }
            
            if (currentQueue.length === 0) {
                description += '**Queue is empty**';
            } else {
                description += '**Up Next:**\n';
                currentQueue.forEach((track, index) => {
                    if (!track || !track.info) {
                        description += `**${start + index + 1}.** Unknown Track\n`;
                    } else {
                        let title = track.info.title || 'Unknown Title';
                        title = title.replace(/[[\]()]/g, '');
                        const uri = track.info.uri || '#';
                        const length = track.info.length || 0;
                        const displayTitle = title.length > 45 ? title.slice(0, 42) + '...' : title;
                        description += `**${start + index + 1}.** [${displayTitle}](${uri}) \`${formatDuration(length)}\`\n`;
                    }
                });
            }
            
            description += `\n**Page ${page}/${totalPages}** | **${player.queue.length} tracks in queue**`;

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(description);
            
            if (nowPlaying?.info?.artworkUrl) {
                embed.setThumbnail(nowPlaying.info.artworkUrl);
            }

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`queue_prev_${page}`)
                    .setEmoji(emojis.prevPage || '◀️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId(`queue_next_${page}`)
                    .setEmoji(emojis.nextPage || '▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages)
            );

            return { embeds: [embed], components: [buttons], fetchReply: true };
        };

        const response = await interaction.reply(await createQueuePage(1));

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: `${emojis.error} Only the command user can navigate!`, ephemeral: true });
            }

            const customId = i.customId;
            const currentPage = parseInt(customId.split('_')[2]);
            let newPage = currentPage;

            if (customId.startsWith('queue_prev')) {
                newPage = currentPage - 1;
            } else if (customId.startsWith('queue_next')) {
                newPage = currentPage + 1;
            }

            await i.update(await createQueuePage(newPage));
        });

        collector.on('end', () => {
            response.edit({ components: [] }).catch(() => {});
        });
    },
};
