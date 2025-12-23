const { recommendationCache } = require('./cache');

class RecommendationEngine {
    constructor() {
        this.artistWeights = new Map();
        this.genrePatterns = new Map();
        this.sessionHistory = new Map();
        this.vibeKeywords = {
            chill: ['chill', 'lofi', 'relax', 'calm', 'ambient', 'acoustic', 'soft'],
            energetic: ['hype', 'party', 'dance', 'edm', 'pump', 'workout', 'intense'],
            sad: ['sad', 'emotional', 'heartbreak', 'melancholy', 'blues', 'slow'],
            happy: ['happy', 'upbeat', 'feel good', 'positive', 'sunny', 'bright'],
            focus: ['focus', 'study', 'instrumental', 'concentrate', 'background'],
            romantic: ['love', 'romantic', 'ballad', 'slow dance', 'heart']
        };
    }

    extractArtistFromTitle(title) {
        if (!title) return null;
        const separators = [' - ', ' – ', ' | ', ' // ', ' : '];
        for (const sep of separators) {
            if (title.includes(sep)) {
                return title.split(sep)[0].trim();
            }
        }
        return null;
    }

    detectVibe(track) {
        const title = (track.info?.title || '').toLowerCase();
        const author = (track.info?.author || '').toLowerCase();
        const combined = `${title} ${author}`;
        
        for (const [vibe, keywords] of Object.entries(this.vibeKeywords)) {
            for (const keyword of keywords) {
                if (combined.includes(keyword)) {
                    return vibe;
                }
            }
        }
        return 'neutral';
    }

    cleanTrackTitle(title) {
        if (!title) return '';
        return title
            .replace(/\(.*?(official|lyric|video|audio|mv|hd|hq|4k|visualizer|remix).*?\)/gi, '')
            .replace(/\[.*?(official|lyric|video|audio|mv|hd|hq|4k|visualizer).*?\]/gi, '')
            .replace(/official\s*(music\s*)?video/gi, '')
            .replace(/\(feat\..*?\)/gi, '')
            .replace(/ft\..*?(?=\s|$)/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    generateSmartQueries(track, sessionData = {}) {
        const queries = [];
        const artist = track.info?.author || this.extractArtistFromTitle(track.info?.title);
        const cleanTitle = this.cleanTrackTitle(track.info?.title);
        const vibe = this.detectVibe(track);
        const { playedArtists = [], favoriteGenres = [] } = sessionData;

        if (track.info?.identifier) {
            queries.push({
                query: `https://music.youtube.com/watch?v=${track.info.identifier}&list=RD${track.info.identifier}`,
                priority: 1,
                type: 'youtube_radio'
            });
        }

        if (artist) {
            queries.push({
                query: `${artist} top songs`,
                priority: 2,
                type: 'artist_top'
            });
            queries.push({
                query: `${artist} best songs playlist`,
                priority: 3,
                type: 'artist_playlist'
            });
        }

        if (vibe !== 'neutral' && artist) {
            queries.push({
                query: `${vibe} ${artist} type beat`,
                priority: 4,
                type: 'vibe_match'
            });
        }

        if (cleanTitle && artist) {
            queries.push({
                query: `songs like ${cleanTitle} by ${artist}`,
                priority: 5,
                type: 'similar_song'
            });
        }

        if (artist) {
            queries.push({
                query: `artists similar to ${artist} songs`,
                priority: 6,
                type: 'similar_artist'
            });
        }

        if (playedArtists.length > 1) {
            const randomArtist = playedArtists[Math.floor(Math.random() * Math.min(playedArtists.length, 5))];
            if (randomArtist && randomArtist !== artist) {
                queries.push({
                    query: `${randomArtist} popular songs`,
                    priority: 7,
                    type: 'session_artist'
                });
            }
        }

        return queries.sort((a, b) => a.priority - b.priority);
    }

    calculateTrackScore(track, lastTrack, sessionData = {}) {
        let score = 100;
        const { playedIdentifiers = new Set(), playedArtists = [] } = sessionData;

        if (playedIdentifiers.has(track.info?.identifier)) {
            return -1000;
        }

        if (track.info?.isStream) {
            score -= 50;
        }

        const duration = track.info?.length || 0;
        if (duration < 60000) {
            score -= 80;
        } else if (duration < 120000) {
            score -= 30;
        } else if (duration > 600000) {
            score -= 20;
        }

        if (lastTrack && track.info?.author === lastTrack.info?.author) {
            score += 15;
        }

        const lastVibe = this.detectVibe(lastTrack);
        const trackVibe = this.detectVibe(track);
        if (lastVibe === trackVibe && lastVibe !== 'neutral') {
            score += 10;
        }

        if (playedArtists.includes(track.info?.author)) {
            score += 5;
        }

        const hasGoodMetadata = track.info?.author && track.info?.title && track.info?.artworkUrl;
        if (hasGoodMetadata) {
            score += 10;
        }

        return score;
    }

    async getSmartRecommendations(client, track, guildId, options = {}) {
        const {
            limit = 8,
            avoidIdentifiers = new Set(),
            playedArtists = [],
            preferredSource = 'ytmsearch'
        } = options;

        const cacheKey = `smart:${guildId}:${track.info?.identifier}`;
        const cached = recommendationCache.get(cacheKey);
        if (cached && cached.length > 0) {
            const filtered = cached.filter(t => !avoidIdentifiers.has(t.info?.identifier));
            if (filtered.length >= limit / 2) {
                return filtered.slice(0, limit);
            }
        }

        const sessionData = {
            playedIdentifiers: avoidIdentifiers,
            playedArtists
        };

        const queries = this.generateSmartQueries(track, sessionData);
        const allTracks = [];
        const seenIdentifiers = new Set(avoidIdentifiers);
        const seenTitles = new Set();

        for (const queryObj of queries) {
            if (allTracks.length >= limit * 3) break;

            try {
                const isDirectUrl = queryObj.query.includes('youtube.com') || queryObj.query.includes('music.youtube.com');
                const source = isDirectUrl ? undefined : preferredSource;

                const result = await client.poru.resolve({
                    query: queryObj.query,
                    source,
                    requester: track.info?.requester
                });

                if (result?.tracks) {
                    for (const t of result.tracks) {
                        const id = t.info?.identifier;
                        const normalizedTitle = this.cleanTrackTitle(t.info?.title).toLowerCase();

                        if (id && !seenIdentifiers.has(id) && !seenTitles.has(normalizedTitle)) {
                            const score = this.calculateTrackScore(t, track, sessionData);
                            if (score > 0) {
                                t._recommendationScore = score;
                                t._queryType = queryObj.type;
                                allTracks.push(t);
                                seenIdentifiers.add(id);
                                seenTitles.add(normalizedTitle);
                            }
                        }
                    }
                }
            } catch (error) {
            }
        }

        allTracks.sort((a, b) => (b._recommendationScore || 0) - (a._recommendationScore || 0));

        const finalTracks = allTracks.slice(0, limit * 2);
        
        if (finalTracks.length > 0) {
            recommendationCache.set(cacheKey, finalTracks);
        }

        return finalTracks.slice(0, limit);
    }

    async getArtistRadio(client, artistName, requester, options = {}) {
        const { limit = 10, avoidIdentifiers = new Set() } = options;
        
        const queries = [
            `${artistName} greatest hits`,
            `${artistName} popular songs`,
            `${artistName} mix`,
            `${artistName} playlist`,
            `${artistName} top tracks`
        ];
        
        const tracks = [];
        const seenIdentifiers = new Set(avoidIdentifiers);
        const seenTitles = new Set();
        
        for (const query of queries) {
            if (tracks.length >= limit) break;
            
            try {
                const result = await client.poru.resolve({
                    query,
                    source: 'ytmsearch',
                    requester
                });
                
                if (result?.tracks) {
                    for (const t of result.tracks) {
                        const id = t.info?.identifier;
                        const normalizedTitle = this.cleanTrackTitle(t.info?.title).toLowerCase();
                        
                        if (id && !seenIdentifiers.has(id) && !seenTitles.has(normalizedTitle)) {
                            if (!t.info.isStream && t.info.length > 60000) {
                                seenIdentifiers.add(id);
                                seenTitles.add(normalizedTitle);
                                tracks.push(t);
                                if (tracks.length >= limit) break;
                            }
                        }
                    }
                }
            } catch (error) {
            }
        }
        
        return tracks;
    }

    async getSimilarArtists(client, artistName, requester, options = {}) {
        const { limit = 5 } = options;
        
        const queries = [
            `artists similar to ${artistName}`,
            `${artistName} type music`,
            `if you like ${artistName}`
        ];
        
        const tracks = [];
        const seenArtists = new Set([artistName.toLowerCase()]);
        
        for (const query of queries) {
            if (tracks.length >= limit) break;
            
            try {
                const result = await client.poru.resolve({
                    query,
                    source: 'ytmsearch',
                    requester
                });
                
                if (result?.tracks) {
                    for (const t of result.tracks) {
                        const author = t.info?.author?.toLowerCase();
                        if (author && !seenArtists.has(author)) {
                            seenArtists.add(author);
                            tracks.push(t);
                            if (tracks.length >= limit) break;
                        }
                    }
                }
            } catch (error) {
            }
        }
        
        return tracks;
    }

    getSessionStats(guildId) {
        return this.sessionHistory.get(guildId) || {
            tracksPlayed: 0,
            artistCounts: new Map(),
            vibeCounts: new Map()
        };
    }

    updateSessionStats(guildId, track) {
        let stats = this.sessionHistory.get(guildId);
        if (!stats) {
            stats = {
                tracksPlayed: 0,
                artistCounts: new Map(),
                vibeCounts: new Map()
            };
            this.sessionHistory.set(guildId, stats);
        }

        stats.tracksPlayed++;

        const artist = track.info?.author;
        if (artist) {
            stats.artistCounts.set(artist, (stats.artistCounts.get(artist) || 0) + 1);
        }

        const vibe = this.detectVibe(track);
        stats.vibeCounts.set(vibe, (stats.vibeCounts.get(vibe) || 0) + 1);

        return stats;
    }

    clearSession(guildId) {
        this.sessionHistory.delete(guildId);
    }
}

const recommendationEngine = new RecommendationEngine();

module.exports = {
    RecommendationEngine,
    recommendationEngine
};
