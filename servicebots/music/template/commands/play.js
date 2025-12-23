const { EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../helpers/musicHelpers');
const { hexToDecimal } = require('../helpers/colorHelper');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    name: 'play',
    aliases: ['p'],
    description: 'Play a song or add it to the queue',
    
    async execute(message, args) {
        const { client, member, guild, channel } = message;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel to play music!`);
            return message.reply({ 
                embeds: [embed]
            });
        }

        if (!args || args.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please provide a song title or URL!`);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const query = args.join(' ');

        if (query.toLowerCase().includes('spotify') && (!config.SPOTIFY?.CLIENT_ID || !config.SPOTIFY?.CLIENT_SECRET)) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Spotify is not configured. Please use YouTube links or song names instead.`);
            return message.reply({ 
                embeds: [embed]
            });
        }

        const searchEmbed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.music} Searching for **${query}**...`);
        const loadingMsg = await message.reply({ 
            embeds: [searchEmbed]
        });

        let res;
        try {
            res = await client.poru.resolve({ query, requester: message.author });
        } catch (e) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Failed to search: ${e?.message || 'Unknown error'}`);
            return loadingMsg.edit({ 
                embeds: [embed]
            });
        }

        const isSpotifyPlaylist = /^https?:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+/i.test(query.trim());
        if (isSpotifyPlaylist) {
            if (!res || res.loadType !== 'PLAYLIST_LOADED' || !Array.isArray(res.tracks) || res.tracks.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} No results found or invalid playlist.`);
                return loadingMsg.edit({ 
                    embeds: [embed]
                });
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
                track.info.requester = message.author;
                player.queue.add(track);
            }

            if (!player.isPlaying && player.isConnected) player.play();

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setTitle(`${emojis.music} Playlist ${res.playlistInfo?.name || 'Spotify Playlist'}`)
                .setDescription(`Added **${res.tracks.length}** tracks to the queue!`);
            return loadingMsg.edit({ 
                embeds: [embed]
            });
        }

        if (res.loadType === 'search') {
            const filteredTracks = res.tracks.filter((track) => !track.info.isStream && track.info.length > 70000);
            if (!filteredTracks.length) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} No results found (filtered out shorts).`);
                return loadingMsg.edit({ 
                    embeds: [embed]
                });
            }
            res.tracks = filteredTracks;
        }

        if (res.loadType === 'error') {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Failed to load: ${res.exception?.message || 'Unknown error'}`);
            return loadingMsg.edit({ 
                embeds: [embed]
            });
        }

        if (res.loadType === 'empty') {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No results found.`);
            return loadingMsg.edit({ 
                embeds: [embed]
            });
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
                track.info.requester = message.author;
                player.queue.add(track);
            }

            if (!player.isPlaying && player.isConnected) player.play();

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setTitle(`${emojis.music} Playlist ${res.playlistInfo?.name || 'Playlist'}`)
                .setDescription(`Added **${res.tracks.length}** tracks to the queue!`);
            return loadingMsg.edit({ 
                embeds: [embed]
            });
        } else {
            const track = res.tracks[0];
            track.info.requester = message.author;
            player.queue.add(track);

            if (!player.isPlaying && player.isConnected) player.play();

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.success} Added **[${track.info.title}](${track.info.uri})** to the queue!`);
            return loadingMsg.edit({ 
                embeds: [embed]
            });
        }
    },
};
