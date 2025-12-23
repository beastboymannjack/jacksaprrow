const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const emojis = require('../emojis.json');

const categories = {
    playback: {
        name: 'Playback',
        emoji: emojis.play || '▶️',
        description: 'Control music playback',
        commands: [
            { name: 'play', usage: '/play <song>', description: 'Play a song or add to queue' },
            { name: 'pause', usage: '/pause', description: 'Pause the current track' },
            { name: 'resume', usage: '/resume', description: 'Resume playback' },
            { name: 'skip', usage: '/skip', description: 'Skip to the next track' },
            { name: 'back', usage: '/back', description: 'Play the previous track' },
            { name: 'stop', usage: '/stop', description: 'Stop and clear queue' },
            { name: 'seek', usage: '/seek <time>', description: 'Jump to a specific time' },
            { name: 'forward', usage: '/forward <seconds>', description: 'Skip forward in track' },
            { name: 'backward', usage: '/backward <seconds>', description: 'Skip backward in track' },
            { name: 'nowplaying', usage: '/nowplaying', description: 'Show current track info' }
        ]
    },
    queue: {
        name: 'Queue',
        emoji: emojis.queue || '📋',
        description: 'Manage your music queue',
        commands: [
            { name: 'queue', usage: '/queue', description: 'View the song queue' },
            { name: 'shuffle', usage: '/shuffle', description: 'Randomize queue order' },
            { name: 'clear', usage: '/clear', description: 'Clear all queued songs' },
            { name: 'remove', usage: '/remove <position>', description: 'Remove a specific track' },
            { name: 'move', usage: '/move <from> <to>', description: 'Reorder queue tracks' },
            { name: 'queuehistory', usage: '/queuehistory', description: 'View recently played' },
            { name: 'undoqueue', usage: '/undoqueue', description: 'Restore previous queue' }
        ]
    },
    smart: {
        name: 'Smart Features',
        emoji: emojis.autoplay || '✨',
        description: 'AI-powered music discovery',
        commands: [
            { name: 'autoplay', usage: '/autoplay', description: 'Auto-play similar songs' },
            { name: 'radio', usage: '/radio <artist>', description: 'Start an artist radio' },
            { name: 'mood', usage: '/mood <type>', description: 'Play mood-based music' },
            { name: 'lyrics', usage: '/lyrics', description: 'Get current song lyrics' }
        ]
    },
    playlists: {
        name: 'Playlists',
        emoji: emojis.playlist || '📁',
        description: 'Save and manage playlists',
        commands: [
            { name: 'playlist-create', usage: '/playlist-create <name>', description: 'Create a playlist' },
            { name: 'playlist-save', usage: '/playlist-save <name>', description: 'Save queue as playlist' },
            { name: 'playlist-load', usage: '/playlist-load <name>', description: 'Load a playlist' },
            { name: 'playlist-list', usage: '/playlist-list', description: 'View your playlists' },
            { name: 'playlist-delete', usage: '/playlist-delete <name>', description: 'Delete a playlist' }
        ]
    },
    favorites: {
        name: 'Favorites',
        emoji: emojis.favorite || '❤️',
        description: 'Your favorite tracks',
        commands: [
            { name: 'favorite-add', usage: '/favorite-add', description: 'Add current to favorites' },
            { name: 'favorite-list', usage: '/favorite-list', description: 'View favorites' },
            { name: 'favorite-play', usage: '/favorite-play', description: 'Play all favorites' },
            { name: 'favorite-remove', usage: '/favorite-remove', description: 'Remove from favorites' }
        ]
    },
    settings: {
        name: 'Settings',
        emoji: emojis.filter || '⚙️',
        description: 'Configure bot behavior',
        commands: [
            { name: 'volume', usage: '/volume <0-100>', description: 'Adjust volume level' },
            { name: 'loop', usage: '/loop <mode>', description: 'Set repeat mode' },
            { name: 'filter', usage: '/filter <type>', description: 'Apply audio filters' },
            { name: 'djmode', usage: '/djmode <action>', description: 'Configure vote skipping' },
            { name: 'disconnect', usage: '/disconnect', description: 'Leave voice channel' }
        ]
    },
    info: {
        name: 'Info',
        emoji: emojis.info || 'ℹ️',
        description: 'Bot information',
        commands: [
            { name: 'help', usage: '/help', description: 'Show this help menu' },
            { name: 'ping', usage: '/ping', description: 'Check bot latency' },
            { name: 'stats', usage: '/stats', description: 'View bot statistics' },
            { name: 'about', usage: '/about', description: 'About deadloom' }
        ]
    }
};

function createMainHelp() {
    let categoryOverview = '';
    for (const [key, cat] of Object.entries(categories)) {
        categoryOverview += `${cat.emoji} **${cat.name}** — ${cat.description}\n`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x00d4aa)
        .setTitle(`${emojis.music || '🎵'} deadloom Music Bot`)
        .setDescription(`Your high-quality music companion for Discord.\nUse the menu below to explore commands.\n\n${categoryOverview.trim()}`)
        .addFields({
            name: 'Quick Start',
            value: `Use \`/play <song name>\` to start playing music!\n**Prefix:** You can also use \`,\` prefix (e.g., \`,play song\`)`
        });
    
    return embed;
}

function createCategoryHelp(categoryKey) {
    const category = categories[categoryKey];
    if (!category) return createMainHelp();
    
    const commandList = category.commands.map(cmd => 
        `\`${cmd.usage}\`\n↳ ${cmd.description}`
    ).join('\n\n');
    
    const embed = new EmbedBuilder()
        .setColor(0x00d4aa)
        .setTitle(`${category.emoji} ${category.name} Commands`)
        .setDescription(`${category.description}\n\n${commandList}`);
    
    return embed;
}

function createSelectMenu(currentCategory = null) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('Select a category...');

    selectMenu.addOptions({
        label: '🏠 Home',
        description: 'Return to main menu',
        value: 'home',
        default: currentCategory === null
    });

    for (const [key, category] of Object.entries(categories)) {
        selectMenu.addOptions({
            label: `${category.name}`,
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
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Jump to a specific category')
                .setRequired(false)
                .addChoices(
                    ...Object.entries(categories).map(([key, cat]) => ({
                        name: cat.name,
                        value: key
                    }))
                )),

    async execute(interaction) {
        const initialCategory = interaction.options.getString('category');
        
        const embed = initialCategory 
            ? createCategoryHelp(initialCategory) 
            : createMainHelp();
        
        const selectMenu = createSelectMenu(initialCategory);
        const quickLinks = createQuickLinks();

        const message = await interaction.reply({
            embeds: [embed],
            components: [selectMenu, quickLinks],
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000
        });

        collector.on('collect', async (selectInteraction) => {
            if (selectInteraction.user.id !== interaction.user.id) {
                const errorEmbed = new EmbedBuilder().setColor(0xff6b6b).setDescription(`${emojis.error || '❌'} Only the command user can use this menu!`);
                return selectInteraction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true
                });
            }

            const selected = selectInteraction.values[0];
            const newEmbed = selected === 'home' 
                ? createMainHelp() 
                : createCategoryHelp(selected);
            
            const newSelectMenu = createSelectMenu(selected === 'home' ? null : selected);
            const newQuickLinks = createQuickLinks();

            await selectInteraction.update({
                embeds: [newEmbed],
                components: [newSelectMenu, newQuickLinks]
            });
        });

        collector.on('end', () => {
            const finalEmbed = createMainHelp();
            finalEmbed.setFooter({ text: 'Menu expired. Use /help again to browse commands.' });
            message.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
        });
    }
};
