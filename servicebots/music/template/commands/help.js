const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const emojis = require('../emojis.json');

const categories = {
    playback: {
        name: 'Music PlayBack',
        emoji: emojis.play || '▶️',
        commands: [
            { name: 'play', description: 'Play a song or add it to the queue' },
            { name: 'pause', description: 'Pause the currently playing song' },
            { name: 'resume', description: 'Resume the paused song' },
            { name: 'skip', description: 'Skip the current song' },
            { name: 'back', description: 'Play the previous song' },
            { name: 'stop', description: 'Stop music and clear the queue' },
            { name: 'disconnect', description: 'Disconnect the bot from voice channel' },
            { name: 'nowplaying', description: 'Show the currently playing song (alias: np)' },
            { name: 'forward', description: 'Skip forward in the current song' },
            { name: 'backward', description: 'Skip backward in the current song' }
        ]
    },
    queue: {
        name: 'Queue Management',
        emoji: emojis.queue || '📋',
        commands: [
            { name: 'queue', description: 'Show the current song queue' },
            { name: 'shuffle', description: 'Shuffle the queue order' },
            { name: 'clear', description: 'Clear the current queue' },
            { name: 'remove', description: 'Remove a song from queue' },
            { name: 'move', description: 'Move a track to a different position' },
            { name: 'queuehistory', description: 'View recently played tracks' },
            { name: 'undoqueue', description: 'Restore previous queue state' }
        ]
    },
    smart: {
        name: 'Smart Features',
        emoji: emojis.autoplay || '✨',
        commands: [
            { name: 'autoplay', description: 'Enable or disable autoplay' },
            { name: 'radio <artist>', description: 'Start an artist radio station' },
            { name: 'mood <type>', description: 'Play mood-based music (chill, energetic, happy, sad, focus, sleep, romantic, angry)' },
            { name: 'lyrics', description: 'Show the lyrics of the current song' }
        ]
    },
    favorites: {
        name: 'Favourites',
        emoji: emojis.favorite || '❤️',
        commands: [
            { name: 'fav add', description: 'Add a song to your favorites' },
            { name: 'fav list', description: 'Show your favorite songs' },
            { name: 'fav play', description: 'Play all songs from your favorites' },
            { name: 'fav remove', description: 'Remove a song from your favorites' }
        ]
    },
    playlists: {
        name: 'Playlists',
        emoji: emojis.playlist || '📁',
        commands: [
            { name: 'pl create', description: 'Create a new empty playlist' },
            { name: 'pl save', description: 'Save the current queue as a playlist' },
            { name: 'pl load', description: 'Clear the queue and load a playlist' },
            { name: 'pl append', description: 'Add songs from a playlist to the queue' },
            { name: 'pl list', description: 'Show all of your saved playlists' },
            { name: 'pl delete', description: 'Delete one of your playlists' },
            { name: 'pl rename', description: 'Rename one of your playlists' },
            { name: 'pl share', description: 'Share a playlist with others' },
            { name: 'pl import', description: 'Import playlist from share code or Spotify' }
        ]
    },
    settings: {
        name: 'Settings & Filters',
        emoji: emojis.filter || '⚙️',
        commands: [
            { name: 'filter', description: 'Apply audio filter (equalizer)' },
            { name: 'loop', description: 'Set repeat mode' },
            { name: 'volume', description: 'Set music volume' },
            { name: 'seek', description: 'Seek to a specific time in the song' },
            { name: 'djmode', description: 'Configure DJ vote mode' }
        ]
    },
    info: {
        name: 'Information',
        emoji: emojis.info || 'ℹ️',
        commands: [
            { name: 'help', description: 'Show this help menu' },
            { name: 'ping', description: 'Check the bot\'s latency' },
            { name: 'stats', description: 'Show bot statistics' },
            { name: 'about', description: 'About deadloom' }
        ]
    }
};

function createHelpEmbed(categoryKey = null) {
    const embed = new EmbedBuilder().setColor(0x00d4aa);

    if (!categoryKey) {
        const categoryList = Object.values(categories).map(cat => 
            `${cat.emoji} **${cat.name}** — ${cat.commands.length} commands`
        ).join('\n');
        
        embed
            .setTitle(`${emojis.music || '🎵'} deadloom Music Help`)
            .setDescription(`Your high-quality music companion for Discord.\nSelect a category from the menu below.\n\n${categoryList}`)
            .setFooter({ text: 'Quick Start: ,play <song name> | Also supports /commands' });
    } else {
        const category = categories[categoryKey];
        if (!category) return embed;

        const commandList = category.commands.map(cmd => 
            `\`,${cmd.name}\`\n↳ ${cmd.description}`
        ).join('\n\n');
        
        embed
            .setTitle(`${category.emoji} ${category.name}`)
            .setDescription(commandList);
    }

    return embed;
}

function createSelectMenu(currentCategory = null) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category');

    selectMenu.addOptions({
        label: '🏠 Home',
        description: 'Return to main help page',
        value: 'home',
        default: currentCategory === null
    });

    for (const [key, category] of Object.entries(categories)) {
        selectMenu.addOptions({
            label: category.name,
            description: `${category.commands.length} commands`,
            value: key,
            default: currentCategory === key
        });
    }

    return new ActionRowBuilder().addComponents(selectMenu);
}

function createQuickLinks() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/8wfT8SfB5Z'),
        new ButtonBuilder()
            .setLabel('Vote')
            .setStyle(ButtonStyle.Link)
            .setURL('https://top.gg')
    );
}

module.exports = {
    name: 'help',
    aliases: ['h', 'commands', 'cmds'],
    description: 'Show all available commands',

    async execute(message, args) {
        const categoryArg = args[0]?.toLowerCase();
        
        let initialCategory = null;
        if (categoryArg && categories[categoryArg]) {
            initialCategory = categoryArg;
        }
        
        const embed = createHelpEmbed(initialCategory);
        const selectMenuRow = createSelectMenu(initialCategory);
        const quickLinks = createQuickLinks();

        const reply = await message.reply({
            embeds: [embed],
            components: [selectMenuRow, quickLinks],
            fetchReply: true
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000
        });

        collector.on('collect', async (selectInteraction) => {
            if (selectInteraction.user.id !== message.author.id) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error || '❌'} Only the command user can use this menu!`);
                return selectInteraction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true
                });
            }

            const selectedCategory = selectInteraction.values[0];
            const newEmbed = createHelpEmbed(selectedCategory === 'home' ? null : selectedCategory);
            const newSelectMenu = createSelectMenu(selectedCategory === 'home' ? null : selectedCategory);
            const newQuickLinks = createQuickLinks();

            await selectInteraction.update({
                embeds: [newEmbed],
                components: [newSelectMenu, newQuickLinks]
            });
        });

        collector.on('end', () => {
            const finalEmbed = createHelpEmbed();
            finalEmbed.setFooter({ text: 'Menu expired. Use ,help again to browse commands.' });
            reply.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
        });
    }
};
