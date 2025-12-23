const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../helpers/musicHelpers');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or add it to the queue')
        .addStringOption(option =>
            option.setName('search')
                .setDescription('Song title or URL')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    
    async autocomplete(interaction) {
        const { client } = interaction;
        const focusedValue = interaction.options.getFocused();

        if (focusedValue.toLowerCase().includes('youtube')) {
            const truncatedUrl = focusedValue.length > 60 ? focusedValue.slice(0, 57) + '...' : focusedValue;
            return interaction.respond([{ 
                name: `Play Youtube: ${truncatedUrl}`, 
                value: focusedValue 
            }]);
        } else if (/^https?:\/\//.test(focusedValue)) {
            const truncatedUrl = focusedValue.length > 70 ? focusedValue.slice(0, 67) + '...' : focusedValue;
            return interaction.respond([{ 
                name: `Play from URL: ${truncatedUrl}`, 
                value: focusedValue 
            }]);
        }

        if (!client._musicAutocompleteCache) client._musicAutocompleteCache = new Map();
        const searchCache = client._musicAutocompleteCache;

        if (searchCache.has(focusedValue)) {
            return interaction.respond(searchCache.get(focusedValue));
        }

        if (!focusedValue || focusedValue.trim().length === 0) {
            return interaction.respond([]);
        }

        if (!client.poru || typeof client.poru.resolve !== 'function') {
            return interaction.respond([]);
        }

        try {
            let source = config.MUSIC.DEFAULT_PLATFORM || 'ytsearch';
            const res = await client.poru.resolve({ query: focusedValue, source: source, requester: interaction.user });
            if (!res || !res.tracks || !Array.isArray(res.tracks) || res.tracks.length === 0) {
                return interaction.respond([]);
            }
            const choices = res.tracks.slice(0, config.MUSIC.AUTOCOMPLETE_LIMIT).map((choice) => ({
                name: `${choice.info.title.length > 85 ? choice.info.title.slice(0, 82) + '…' : choice.info.title} [${formatDuration(choice.info.length)}]`,
                value: choice.info.uri,
            }));
            searchCache.set(focusedValue, choices);
            return interaction.respond(choices);
        } catch (e) {
            return interaction.respond([]);
        }
    },

    async execute(interaction) {
        const { client, member, guild, options, channel } = interaction;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel to play music!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.deferReply();
        const query = options.getString('search');

        let res;
        try {
            res = await client.poru.resolve({ query, requester: interaction.user });
        } catch (e) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Failed to search: ${e?.message || 'Unknown error'}`);
            return interaction.editReply({ embeds: [embed] });
        }

        if (res.loadType === 'PLAYLIST_LOADED') {
            if (!res || !Array.isArray(res.tracks) || res.tracks.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} No results found or invalid playlist.`);
                return interaction.editReply({ embeds: [embed] });
            }

            const player = client.poru.createConnection({
                guildId: guild.id,
                voiceChannel: member.voice.channel.id,
                textChannel: channel.id,
                deaf: true,
                mute: false,
            });

            if (player.autoplayEnabled === undefined) player.autoplayEnabled = true;

            for (const track of res.tracks) {
                track.info.requester = interaction.user;
                player.queue.add(track);
            }

            if (!player.isPlaying && player.isConnected) player.play();

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.music} **Playlist ${res.playlistInfo?.name || 'Playlist'}**\nAdded **${res.tracks.length}** tracks to the queue!`);
            
            return interaction.editReply({ embeds: [embed] });
        }

        if (res.loadType === 'search') {
            const filteredTracks = res.tracks.filter((track) => !track.info.isStream && track.info.length > 70000);
            if (!filteredTracks.length) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} No results found (filtered out shorts).`);
                return interaction.editReply({ embeds: [embed] });
            }
            res.tracks = filteredTracks;
        }

        if (res.loadType === 'error') {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Failed to load: ${res.exception?.message || 'Unknown error'}`);
            return interaction.editReply({ embeds: [embed] });
        }

        if (res.loadType === 'empty') {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No results found.`);
            return interaction.editReply({ embeds: [embed] });
        }

        const player = client.poru.createConnection({
            guildId: guild.id,
            voiceChannel: member.voice.channel.id,
            textChannel: channel.id,
            deaf: true,
            mute: false,
        });

        if (player.autoplayEnabled === undefined) player.autoplayEnabled = true;

        if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') {
            for (const track of res.tracks) {
                track.info.requester = interaction.user;
                player.queue.add(track);
            }

            if (!player.isPlaying && player.isConnected) player.play();

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.music} **Playlist ${res.playlistInfo?.name || 'Playlist'}**\nAdded **${res.tracks.length}** tracks to the queue!`);

            return interaction.editReply({ embeds: [embed] });
        } else {
            const track = res.tracks[0];
            track.info.requester = interaction.user;
            player.queue.add(track);

            if (!player.isPlaying && player.isConnected) player.play();

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.success} Added **[${track.info.title}](${track.info.uri})** to the queue!`);

            return interaction.editReply({ embeds: [embed] });
        }
    },
};
