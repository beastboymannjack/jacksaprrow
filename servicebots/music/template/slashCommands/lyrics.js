const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const emojis = require('../emojis.json');
const Genius = require('genius-lyrics');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Show the lyrics of the currently playing song'),
    
    async execute(interaction) {
        const { client, member, guild } = interaction;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });
        }

        const player = client.poru.players.get(guild.id);
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No music is currently playing!`);
            return interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const track = player.currentTrack;
        if (!track) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No track is currently playing!`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        let artist, titleForSearch;
        const separators = ['-', '–', '|'];
        let potentialSplit = null;
        const originalTitle = track.info.title || '';

        for (const sep of separators) {
            if (originalTitle.includes(sep)) {
                potentialSplit = originalTitle.split(sep);
                break;
            }
        }

        if (potentialSplit && potentialSplit.length >= 2) {
            artist = potentialSplit[0].trim();
            titleForSearch = potentialSplit.slice(1).join(' ').trim();
        } else {
            artist = track.info.author || '';
            titleForSearch = originalTitle;
        }

        const cleanUpRegex = /official|lyric|video|audio|mv|hd|hq|ft|feat/gi;
        artist = artist.replace(cleanUpRegex, '').trim();
        titleForSearch = titleForSearch.replace(cleanUpRegex, '').trim();
        titleForSearch = titleForSearch.replace(/\(.*?\)|\[.*?\]/g, '').trim();

        let lyrics = null;
        let foundRecord = null;
        let embedArtist = artist;
        let embedTitle = titleForSearch;

        try {
            const params = new URLSearchParams();
            if (titleForSearch) {
                params.set('track_name', titleForSearch);
            } else if (originalTitle) {
                params.set('q', originalTitle);
            }

            if (artist) params.set('artist_name', artist);

            const headers = {
                'User-Agent': 'deadloom-Music Bot v1.0',
            };

            const lrclibUrl = `https://lrclib.net/api/search?${params.toString()}`;
            const response = await fetch(lrclibUrl, { headers });
            
            if (response.status === 200) {
                const list = await response.json();
                if (Array.isArray(list) && list.length > 0) {
                    foundRecord = list.find(record => {
                        return (
                            record.trackName &&
                            record.artistName &&
                            record.trackName.toLowerCase().includes(titleForSearch.toLowerCase()) &&
                            record.artistName.toLowerCase().includes(artist.toLowerCase())
                        );
                    }) || list[0];

                    if (foundRecord && (foundRecord.plainLyrics || foundRecord.syncedLyrics)) {
                        lyrics = foundRecord.plainLyrics || foundRecord.syncedLyrics;
                    }
                }
            }
        } catch (e) {
        }

        if (!lyrics && artist && titleForSearch) {
            try {
                const lyricsOvhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(titleForSearch)}`;
                const response = await fetch(lyricsOvhUrl);
                
                if (response.status === 200) {
                    const data = await response.json();
                    if (data && data.lyrics) {
                        lyrics = data.lyrics;
                        foundRecord = { source: 'lyrics.ovh' };
                    }
                }
            } catch (e) {
            }
        }

        if (!lyrics && config.GENIUS && config.GENIUS.API_KEY) {
            try {
                const searchQuery = `${artist} ${titleForSearch}`.trim();
                
                if (searchQuery.length > 0) {
                    const geniusClient = new Genius.Client(config.GENIUS.API_KEY);
                    const searches = await geniusClient.songs.search(searchQuery);
                    
                    if (searches && searches.length > 0) {
                        const song = searches[0];
                        lyrics = await song.lyrics();
                        
                        if (lyrics) {
                            embedArtist = song.artist.name;
                            embedTitle = song.title;
                            foundRecord = { source: 'genius' };
                        }
                    }
                }
            } catch (e) {
            }
        }

        if (!lyrics) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Could not find lyrics for this song.`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        const trimmedLyrics = lyrics.length > 3900 ? lyrics.substring(0, 3897) + '...' : lyrics;

        if (foundRecord && foundRecord.source !== 'genius') {
            embedArtist = foundRecord.artistName || embedArtist;
            embedTitle = foundRecord.trackName || embedTitle;
        }

        const lyricsSource = foundRecord?.source === 'genius' ? 'genius.com' : foundRecord?.source === 'lyrics.ovh' ? 'lyrics.ovh' : 'lrclib.net';
        
        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setTitle(`${emojis.lyrics} ${embedArtist} - ${embedTitle}`)
            .setURL(track.info.uri)
            .setDescription(trimmedLyrics)
            .setFooter({ text: `Source: ${lyricsSource}` });

        return interaction.editReply({ 
            embeds: [embed] 
        });
    },
};
