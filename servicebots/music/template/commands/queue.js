const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { hexToDecimal } = require('../helpers/colorHelper');
const { formatDuration } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    name: 'queue',
    aliases: ['q'],
    description: 'Show the current song queue',

    async execute(message) {
        const { client, member, guild } = message;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return message.reply({ embeds: [embed] });
        }

        const player = client.poru.players.get(guild.id);
        
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No music is currently playing!`);
            return message.reply({ embeds: [embed] });
        }

        const createQueuePage = async (page = 1) => {
            const itemsPerPage = 5;
            const totalPages = Math.ceil(player.queue.length / itemsPerPage) || 1;
            page = Math.max(1, Math.min(page, totalPages));

            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentQueue = player.queue.slice(start, end);

            const nowPlaying = player.currentTrack;
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`queue_prev_${page}`)
                    .setEmoji(emojis.prevPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId(`queue_next_${page}`)
                    .setEmoji(emojis.nextPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages)
            );

            let description = '';
            
            if (nowPlaying) {
                let npTitle = nowPlaying.info.title || 'Unknown';
                npTitle = npTitle.replace(/[[\]()]/g, '');
                description += `**Now Playing:** [${npTitle}](${nowPlaying.info.uri}) \`${formatDuration(nowPlaying.info.length)}\`\n\n`;
            } else {
                description += `**Now Playing:** Loading...\n\n`;
            }
            
            if (currentQueue.length === 0) {
                description += '**No more tracks in queue**';
            } else {
                currentQueue.forEach((track, index) => {
                    if (!track || !track.info) {
                        description += `**${start + index + 1}.** Unknown Track\n`;
                    } else {
                        let title = track.info.title || 'Unknown Title';
                        title = title.replace(/[[\]()]/g, '');
                        const uri = track.info.uri || '#';
                        const length = track.info.length || 0;
                        description += `**${start + index + 1}.** [${title.length > 55 ? title.slice(0, 52) + '…' : title}](${uri}) \`${formatDuration(length)}\`\n`;
                    }
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setTitle(`${emojis.queue || '📋'} Queue`)
                .setDescription(description)
                .setFooter({ text: `Page ${page}/${totalPages} • ${player.queue.length} tracks in queue` });

            return { embeds: [embed], components: [buttons], fetchReply: true };
        };

        const response = await message.reply(await createQueuePage(1));

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) {
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
