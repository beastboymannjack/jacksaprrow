const { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ComponentType, AttachmentBuilder } = require('discord.js');
const { hexToDecimal } = require('../helpers/colorHelper');
const { MusicCard } = require('../helpers/MusicCard');
const Favorite = require('../../database/models/Favorite');
const { queueStateManager } = require('./queueState');
const { recommendationEngine } = require('../utils/recommendations');
const config = require('../config');
const emojis = require('../emojis.json');


const musicCard = new MusicCard();

function setupMusicEvents(client) {
    client.poru.on('trackStart', async (player, track) => {
        const channel = client.channels.cache.get(player.textChannel);
        if (!channel) return;

        // Update bot status to show now playing
        try {
            await client.statusManager.updateStatus(player, track);
        } catch (e) {}

        player._lastPlayedTrack = track;
        
        queueStateManager.addToHistory(player.guildId, track);
        
        if (!player._autoplayHistory) {
            player._autoplayHistory = new Set();
        }
        if (track.info?.identifier) {
            player._autoplayHistory.add(track.info.identifier);
        }

        if (player.nowPlayingMessage && player.nowPlayingMessage.deletable) {
            try {
                await player.nowPlayingMessage.delete().catch(() => {});
            } catch (e) {}
            player.nowPlayingMessage = null;
        }

        if (player.updateInterval) clearInterval(player.updateInterval);

        if (player.buttonCollector) {
            try {
                player.buttonCollector.stop('newTrack');
            } catch (e) {}
            player.buttonCollector = null;
        }

        if (!track || !track.info) return;
        
        const trackTitle = (track.info.title || 'Unknown Track').length > 50 ? (track.info.title || 'Unknown Track').substring(0, 47) + '...' : (track.info.title || 'Unknown Track');
        const nowPlayingText = `-# ◈ **NOW STREAMING**\n### [${trackTitle}](${track.info.uri || 'https://discord.com'})\n-# by ${track.info.author || 'Unknown Artist'}`;

        function getFirstControlButtonRow(isPaused, disabled = false) {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_pause_resume')
                    .setEmoji(isPaused ? emojis.play : emojis.pause)
                    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji(emojis.skip)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setEmoji(emojis.stop)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setEmoji(emojis.loop)
                    .setStyle(player.loop && player.loop !== 'NONE' ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_autoplay')
                    .setEmoji(emojis.autoplay)
                    .setStyle(player.autoplayEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );
        }

        function getSecondControlButtonRow(disabled = false) {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_lyrics')
                    .setEmoji(emojis.lyrics)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setEmoji(emojis.queue)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji(emojis.shuffle)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_filter')
                    .setEmoji(emojis.filter)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_favorite_add')
                    .setEmoji(emojis.favorite)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled)
            );
        }

        let firstControlButtonRow = getFirstControlButtonRow(false, false);
        let secondControlButtonRow = getSecondControlButtonRow(false);

        const container = new ContainerBuilder();
        let musicCardAttachment = null;

        
        if (config.MUSIC.ARTWORK_STYLE === 'MusicCard') {
            
            try {
                let isLiked = false;
                try {
                    const trackIdentifier = track.info?.identifier || track.identifier;
                    if (trackIdentifier && track.info.requester?.id) {
                        const favorite = await Favorite.findOne({
                            where: {
                                userId: track.info.requester.id,
                                identifier: trackIdentifier
                            }
                        });
                        isLiked = !!favorite;
                    }
                } catch (err) {}

                const guild = channel.guild;
                const guildIcon = guild?.iconURL({ extension: 'png', size: 128 });

                const imageBuffer = await musicCard.generateNowPlayingCard({
                    track: track,
                    position: player.position || 0,
                    isLiked: isLiked,
                    guildName: guild?.name || 'Discord Server',
                    guildIcon: guildIcon,
                    player: player
                });

                
                musicCardAttachment = new AttachmentBuilder(imageBuffer, { name: 'nowplaying.png' });

                
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL('attachment://nowplaying.png')])
                );
            } catch (error) {
                console.error('Error generating MusicCard:', error);
            }
        } else {
            
            if (track.info.artworkUrl || track.info.image) {
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL(track.info.artworkUrl || track.info.image)])
                );
            }
        }

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(nowPlayingText));

        container
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(firstControlButtonRow)
            .addActionRowComponents(secondControlButtonRow)
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

        try {
            const messageOptions = {
                components: [container],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
            };

            
            if (musicCardAttachment) {
                messageOptions.files = [musicCardAttachment];
            }

            const message = await channel.send(messageOptions);
            player.nowPlayingMessage = message;

            const filter = (i) => i.isButton() && i.message.id === message.id && i.guildId === player.guildId && i.customId.startsWith('music_');
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
            });
            player.buttonCollector = collector;

            collector.on('collect', async (interaction) => {
                if (!interaction.member.voice.channelId || interaction.member.voice.channelId !== player.voiceChannel) {
                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} You must be in the same voice channel as the bot!`));
                    return interaction.reply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                        ephemeral: true 
                    });
                }

                try {
                    switch (interaction.customId) {
                        case 'music_pause_resume': {
                            player.pause(!player.isPaused);
                            const state = player.isPaused ? `${emojis.pause} Music paused.` : `${emojis.resume} Music resumed.`;
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(state));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_skip': {
                            if (!player.currentTrack) {
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} Nothing to skip!`));
                                return interaction.reply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                    ephemeral: true 
                                });
                            }
                            player.skip();
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.skip} Skipped the current track.`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_stop': {
                            player.queue.clear();
                            player.destroy();
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.stop} Stopped music and cleared the queue.`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_loop': {
                            if (player.loop === 'NONE' || !player.loop) {
                                player.setLoop('TRACK');
                                var msg = `${emojis.loopTrack} Loop track enabled.`;
                            } else if (player.loop === 'TRACK') {
                                player.setLoop('QUEUE');
                                var msg = `${emojis.loop} Queue repeat enabled.`;
                            } else {
                                player.setLoop('NONE');
                                var msg = `${emojis.error} Loop disabled.`;
                            }
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(msg));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_autoplay': {
                            player.autoplayEnabled = !player.autoplayEnabled;
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.autoplay} Autoplay ${player.autoplayEnabled ? 'enabled' : 'disabled'}.`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            
                            break;
                        }
                        case 'music_lyrics': {
                            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                            
                            try {
                                if (!player.currentTrack) {
                                    const container = new ContainerBuilder()
                                        .addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(`${emojis.error} No track is currently playing!`)
                                        );
                                    return interaction.editReply({ 
                                        components: [container], 
                                        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                                    });
                                }

                                const track = player.currentTrack;
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
                                console.error('LRCLIB API request failed:', e);
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
                                    console.error('Lyrics.ovh API request failed:', e);
                                }
                            }

                            if (!lyrics && config.GENIUS && config.GENIUS.API_KEY) {
                                try {
                                    const Genius = require('genius-lyrics');
                                    const searchQuery = `${artist} ${titleForSearch}`.trim();
                                    
                                    if (searchQuery.length > 0) {
                                        const geniusClient = new Genius.Client(config.GENIUS.API_KEY);
                                        const searches = await geniusClient.songs.search(searchQuery);
                                        
                                        if (searches && searches.length > 0) {
                                            const song = searches[0];
                                            const songLyrics = await song.lyrics();
                                            
                                            if (songLyrics) {
                                                lyrics = songLyrics;
                                                embedArtist = song.artist.name;
                                                embedTitle = song.title;
                                                foundRecord = { source: 'genius' };
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.error('Genius API failed:', e.message);
                                }
                            }

                            if (!lyrics) {
                                try {
                                    const container = new ContainerBuilder()
                                        .addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(`${emojis.error} Could not find lyrics for this song.`)
                                        );
                                    return await interaction.editReply({ 
                                        components: [container], 
                                        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                                    });
                                } catch (editError) {
                                    console.error('Failed to send lyrics not found message:', editError);
                                }
                            }

                            const trimmedLyrics = lyrics.length > 3900 ? lyrics.substring(0, 3897) + '...' : lyrics;

                            if (foundRecord && foundRecord.source !== 'genius') {
                                embedArtist = foundRecord.artistName || embedArtist;
                                embedTitle = foundRecord.trackName || embedTitle;
                            }

                            const lyricsSource = foundRecord?.source === 'genius' ? 'genius.com' : foundRecord?.source === 'lyrics.ovh' ? 'lyrics.ovh' : 'lrclib.net';
                            
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(`## ${emojis.lyrics} ${embedArtist} - ${embedTitle}`)
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(`[View on YouTube](${track.info.uri})`)
                                )
                                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(trimmedLyrics)
                                )
                                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(`Source: ${lyricsSource}`)
                                );

                            return interaction.editReply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                            });
                            } catch (lyricsError) {
                                console.error('Error in lyrics button handler:', lyricsError);
                                try {
                                    const errorContainer = new ContainerBuilder()
                                        .addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(`${emojis.error} An error occurred while fetching lyrics.`)
                                        );
                                    await interaction.editReply({ 
                                        components: [errorContainer], 
                                        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                                    });
                                } catch (finalError) {
                                    console.error('Failed to send error message:', finalError);
                                }
                            }
                            break;
                        }
                        case 'music_queue': {
                            const currentPlayer = client.poru.players.get(interaction.guildId);
                            if (!currentPlayer || !currentPlayer.currentTrack) {
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} No music is currently playing!`));
                                return interaction.reply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                    ephemeral: true 
                                });
                            }
                            
                            const command = client.commands.get('queue');
                            if (command) {
                                await command.execute(interaction);
                            }
                            break;
                        }
                        case 'music_shuffle': {
                            if (player.queue.length === 0) {
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} The queue is empty!`));
                                return interaction.reply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                    ephemeral: true 
                                });
                            }
                            player.queue.shuffle();
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.shuffle} Queue shuffled.`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_filter': {
                            const filterCommand = client.commands.get('filter');
                            if (filterCommand) {
                                await filterCommand.execute(interaction);
                            }
                            break;
                        }
                        case 'music_favorite_add': {
                            const favoriteAddCommand = client.commands.get('favoriteadd');
                            if (favoriteAddCommand) {
                                await favoriteAddCommand.execute(interaction);
                            }
                            break;
                        }
                    }
                } catch (error) {
                    console.error('Button interaction error:', error);
                }
            });

            
            player.updateInterval = setInterval(async () => {
                    if (!player.currentTrack || !player.nowPlayingMessage?.editable) {
                        clearInterval(player.updateInterval);
                        return;
                    }

                    const updatedFirstControlButtonRow = getFirstControlButtonRow(player.isPaused, false);
                    const updatedSecondControlButtonRow = getSecondControlButtonRow(false);

                    const updatedContainer = new ContainerBuilder();

                    let updatedMusicCardAttachment = null;

                    
                    if (config.MUSIC.ARTWORK_STYLE === 'MusicCard') {
                        
                        try {
                            let isLiked = false;
                            try {
                                const trackIdentifier = track.info?.identifier || track.identifier;
                                if (trackIdentifier && track.info.requester?.id) {
                                    const favorite = await Favorite.findOne({
                                        where: {
                                            userId: track.info.requester.id,
                                            identifier: trackIdentifier
                                        }
                                    });
                                    isLiked = !!favorite;
                                }
                            } catch (err) {}

                            const guild = channel.guild;
                            const guildIcon = guild?.iconURL({ extension: 'png', size: 128 });

                            const imageBuffer = await musicCard.generateNowPlayingCard({
                                track: track,
                                position: player.position || 0,
                                isLiked: isLiked,
                                guildName: guild?.name || 'Discord Server',
                                guildIcon: guildIcon,
                                player: player
                            });

                            
                            updatedMusicCardAttachment = new AttachmentBuilder(imageBuffer, { name: 'nowplaying.png' });

                            updatedContainer.addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL('attachment://nowplaying.png')])
                            );
                        } catch (error) {
                            console.error('Error updating MusicCard:', error);
                        }
                    } else {
                        
                        if (track.info.artworkUrl || track.info.image) {
                            updatedContainer.addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL(track.info.artworkUrl || track.info.image)])
                            );
                        }
                    }
                    updatedContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(nowPlayingText));

                    updatedContainer
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addActionRowComponents(updatedFirstControlButtonRow)
                        .addActionRowComponents(updatedSecondControlButtonRow)
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

                    try {
                        const editOptions = {
                            components: [updatedContainer],
                            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
                        };

                        
                        if (updatedMusicCardAttachment) {
                            editOptions.files = [updatedMusicCardAttachment];
                        }

                        await player.nowPlayingMessage.edit(editOptions);
                    } catch (e) {
                        clearInterval(player.updateInterval);
                    }
                }, 5000);
        } catch (e) {
            console.error('Error sending now playing message:', e);
        }
    });

    client.poru.on('trackEnd', async (player, track, data) => {
        if (player.updateInterval) clearInterval(player.updateInterval);
        
        // Update status when track ends if no more tracks
        if (!player.currentTrack) {
            try {
                await client.statusManager.updateStatus(player, null);
            } catch (e) {}
        }
    });

    client.poru.on('queueEnd', async (player) => {
        if (player.updateInterval) clearInterval(player.updateInterval);
        
        // Update status when queue ends
        try {
            await client.statusManager.updateStatus(player, null);
        } catch (e) {}
        
        if (!player.autoplayEnabled) {
            const channel = client.channels.cache.get(player.textChannel);
            if (channel) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emojis.music} Queue finished! Enable autoplay with \`/autoplay\` to keep the music going.`)
                    );
                await channel.send({ 
                    components: [container], 
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                }).catch(() => {});
            }
            return;
        }

        const lastTrack = player._lastPlayedTrack || player.currentTrack;
        if (!lastTrack || !lastTrack.info) return;

        try {
            const channel = client.channels.cache.get(player.textChannel);
            if (!channel) return;

            if (!player._autoplayHistory) {
                player._autoplayHistory = new Set();
            }
            if (!player._playedArtists) {
                player._playedArtists = [];
            }
            if (!player._autoplayCount) {
                player._autoplayCount = 0;
            }

            const trackArtist = lastTrack.info.author;
            if (trackArtist && !player._playedArtists.includes(trackArtist)) {
                player._playedArtists.push(trackArtist);
                if (player._playedArtists.length > 20) {
                    player._playedArtists.shift();
                }
            }

            recommendationEngine.updateSessionStats(player.guildId, lastTrack);

            const smartTracks = await recommendationEngine.getSmartRecommendations(
                client,
                lastTrack,
                player.guildId,
                {
                    limit: 8,
                    avoidIdentifiers: player._autoplayHistory,
                    playedArtists: player._playedArtists
                }
            );

            if (!smartTracks || smartTracks.length === 0) {
                const fallbackQueries = [
                    `${lastTrack.info.author || ''} songs`,
                    `popular music ${new Date().getFullYear()}`,
                    'trending music'
                ];

                let fallbackTracks = [];
                for (const query of fallbackQueries) {
                    if (fallbackTracks.length > 0) break;
                    try {
                        const result = await client.poru.resolve({
                            query,
                            source: 'ytmsearch',
                            requester: lastTrack.info.requester
                        });
                        if (result?.tracks?.length > 0) {
                            fallbackTracks = result.tracks.filter(t => 
                                !player._autoplayHistory.has(t.info?.identifier) &&
                                !t.info?.isStream &&
                                t.info?.length > 60000
                            ).slice(0, 5);
                        }
                    } catch (e) {}
                }

                if (fallbackTracks.length === 0) {
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `${emojis.autoplay} Couldn't find more tracks right now. Use \`/play\` to keep the vibe going!`
                            )
                        );
                    await channel.send({ 
                        components: [container], 
                        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                    }).catch(() => {});
                    return;
                }

                smartTracks.push(...fallbackTracks);
            }

            const tracksToAdd = player._autoplayCount < 3 ? 
                Math.min(smartTracks.length, 5) : 
                Math.min(smartTracks.length, 3);

            const selectedTracks = smartTracks.slice(0, tracksToAdd);

            for (const track of selectedTracks) {
                player.queue.add(track);
                if (track.info?.identifier) {
                    player._autoplayHistory.add(track.info.identifier);
                }
            }

            if (player._autoplayHistory.size > 100) {
                const historyArray = Array.from(player._autoplayHistory);
                player._autoplayHistory = new Set(historyArray.slice(-50));
            }

            player._autoplayCount++;

            const upNext = selectedTracks[0];
            const vibeMessages = [
                `Keeping the vibe going`,
                `Found some gems for you`,
                `Your music journey continues`,
                `Curated just for your session`,
                `The beat goes on`
            ];
            const randomVibe = vibeMessages[Math.floor(Math.random() * vibeMessages.length)];

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emojis.autoplay} **${randomVibe}**\n\n` +
                        `-# Autoplaying based on your listening activity\n` +
                        `-# Added ${selectedTracks.length} track${selectedTracks.length > 1 ? 's' : ''}\n` +
                        `-# Up next: **${upNext?.info?.title?.substring(0, 50) || 'Unknown'}**${upNext?.info?.title?.length > 50 ? '...' : ''}`
                    )
                );
            await channel.send({ 
                components: [container], 
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
            }).catch(() => {});

            if (player.isConnected && !player.isPlaying) {
                await new Promise(resolve => setTimeout(resolve, 100));
                try {
                    player.play();
                } catch (err) {
                    console.error('[Autoplay] Error starting playback:', err);
                }
            }

        } catch (error) {
            console.error('[Autoplay] Error:', error);
            const channel = client.channels.cache.get(player.textChannel);
            if (channel) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emojis.autoplay} Had a small hiccup. Trying again...`)
                    );
                await channel.send({ 
                    components: [container], 
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                }).catch(() => {});

                try {
                    const lastTrack = player._lastPlayedTrack;
                    if (lastTrack?.info?.author) {
                        const result = await client.poru.resolve({
                            query: `${lastTrack.info.author} popular songs`,
                            source: 'ytmsearch',
                            requester: lastTrack.info.requester
                        });
                        if (result?.tracks?.[0]) {
                            player.queue.add(result.tracks[0]);
                            if (player.isConnected && !player.isPlaying) {
                                player.play();
                            }
                        }
                    }
                } catch (e) {}
            }
        }
    });

    client.poru.on('playerDestroy', async (player) => {
        // Update bot status when player is destroyed
        try {
            await client.statusManager.updateStatus(player, null);
        } catch (e) {}
        
        if (player.updateInterval) clearInterval(player.updateInterval);
        if (player.buttonCollector) {
            try {
                player.buttonCollector.stop();
            } catch (e) {}
        }
        if (player._autoplayHistory) {
            player._autoplayHistory.clear();
        }
        if (player._playedArtists) {
            player._playedArtists = [];
        }
        recommendationEngine.clearSession(player.guildId);
    });
}

module.exports = { setupMusicEvents };

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
