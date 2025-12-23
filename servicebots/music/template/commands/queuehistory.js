const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../helpers/musicHelpers');
const { queueStateManager } = require('../music/queueState');
const emojis = require('../emojis.json');

module.exports = {
    name: 'queuehistory',
    aliases: ['qh', 'history'],
    description: 'Show the history of recently played tracks',

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

        const formatTimeAgo = (timestamp) => {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            if (seconds < 60) return `${seconds}s ago`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        };

        const createHistoryPage = async (page = 1) => {
            const fullHistory = queueStateManager.getHistory(guild.id, 50);
            const itemsPerPage = 5;
            const totalPages = Math.ceil(fullHistory.length / itemsPerPage) || 1;
            page = Math.max(1, Math.min(page, totalPages));

            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentHistory = fullHistory.slice(start, end);

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`history_prev_${page}`)
                    .setEmoji(emojis.prevPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId(`history_next_${page}`)
                    .setEmoji(emojis.nextPage)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages)
            );

            let historyList = '';
            if (currentHistory.length === 0) {
                historyList = '**No tracks in history yet**';
            } else {
                historyList = currentHistory.map((track, index) => {
                    if (!track) {
                        return `**${start + index + 1}.** Unknown Track`;
                    }
                    let title = track.title || 'Unknown Title';
                    title = title.replace(/[[\]()]/g, '');
                    const uri = track.uri || '#';
                    const length = track.length || 0;
                    const timeAgo = formatTimeAgo(track.timestamp);
                    return `**${start + index + 1}.** [${title.length > 45 ? title.slice(0, 42) + '…' : title}](${uri})\n${emojis.duration} \`${formatDuration(length)}\` • ${emojis.back} \`${timeAgo}\``;
                }).join('\n\n');
            }

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.queue} **Queue History**\n\n${historyList}\n\n**Page ${page}/${totalPages}** • **${fullHistory.length} tracks in history**`);

            return { embeds: [embed], components: [buttons], fetchReply: true };
        };

        const response = await message.reply(await createHistoryPage(1));

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: `${emojis.error} Only the command user can navigate!`, ephemeral: true });
            }

            const customId = i.customId;
            const currentPage = parseInt(customId.split('_')[2]);
            let newPage = currentPage;

            if (customId.startsWith('history_prev')) {
                newPage = currentPage - 1;
            } else if (customId.startsWith('history_next')) {
                newPage = currentPage + 1;
            }

            await i.update(await createHistoryPage(newPage));
        });

        collector.on('end', () => {
            response.edit({ components: [] }).catch(() => {});
        });
    },
};
