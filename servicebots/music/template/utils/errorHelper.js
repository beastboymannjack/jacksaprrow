const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

const errorMessages = {
    NO_VOICE_CHANNEL: {
        title: 'Not in a voice channel',
        description: 'You need to be in a voice channel to use this command.',
        suggestion: 'Join a voice channel and try again.'
    },
    DIFFERENT_VOICE_CHANNEL: {
        title: 'Different voice channel',
        description: 'You must be in the same voice channel as the bot.',
        suggestion: 'Join the channel where the bot is playing.'
    },
    NO_PLAYER: {
        title: 'No music playing',
        description: 'There is no music currently playing.',
        suggestion: 'Use `/play` to start playing music.'
    },
    NO_TRACKS: {
        title: 'No results found',
        description: 'Could not find any tracks matching your search.',
        suggestion: 'Try a different search term or check the spelling.'
    },
    LOAD_FAILED: {
        title: 'Failed to load track',
        description: 'Could not load the requested track.',
        suggestion: 'The track might be unavailable. Try a different source.'
    },
    NO_PERMISSION: {
        title: 'No permission',
        description: 'You do not have permission to use this command.',
        suggestion: 'Only the track requester or admins can control playback.'
    },
    QUEUE_EMPTY: {
        title: 'Queue is empty',
        description: 'There are no tracks in the queue.',
        suggestion: 'Use `/play` to add songs to the queue.'
    },
    LAVALINK_ERROR: {
        title: 'Connection error',
        description: 'Could not connect to the music server.',
        suggestion: 'Please try again in a few moments.'
    },
    SPOTIFY_NOT_CONFIGURED: {
        title: 'Spotify not available',
        description: 'Spotify integration is not configured.',
        suggestion: 'Contact the bot owner to enable Spotify support.'
    },
    INVALID_TIME_FORMAT: {
        title: 'Invalid time format',
        description: 'The time format you provided is not valid.',
        suggestion: 'Use formats like: 1:30, 2:45:00, or 90 (seconds).'
    },
    SEEK_OUT_OF_BOUNDS: {
        title: 'Invalid seek position',
        description: 'Cannot seek to that position in the track.',
        suggestion: 'The position must be within the track duration.'
    },
    PLAYLIST_NOT_FOUND: {
        title: 'Playlist not found',
        description: 'Could not find a playlist with that name.',
        suggestion: 'Check the playlist name or create a new one.'
    },
    PLAYLIST_LIMIT_REACHED: {
        title: 'Playlist limit reached',
        description: 'You have reached the maximum number of playlists.',
        suggestion: 'Delete an existing playlist to create a new one.'
    },
    RATE_LIMITED: {
        title: 'Too many requests',
        description: 'You are making requests too quickly.',
        suggestion: 'Please wait a moment before trying again.'
    }
};

const searchFallbackOrder = ['ytsearch', 'ytmsearch', 'scsearch'];

function createErrorResponse(errorType, customMessage = null, emoji = null) {
    const error = errorMessages[errorType] || {
        title: 'Error',
        description: customMessage || 'An unexpected error occurred.',
        suggestion: 'Please try again later.'
    };
    
    const errorEmoji = emoji || '❌';
    
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${errorEmoji} **${error.title}**`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(error.description)
        );
    
    if (error.suggestion) {
        container
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`💡 **Tip:** ${error.suggestion}`)
            );
    }
    
    return {
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
    };
}

function createSuccessResponse(message, emoji = '✅') {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${emoji} ${message}`)
        );
    
    return {
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
    };
}

async function trySearchWithFallback(poru, query, requester, primarySource = 'ytsearch') {
    const errors = [];
    
    const sources = [primarySource, ...searchFallbackOrder.filter(s => s !== primarySource)];
    
    for (const source of sources) {
        try {
            const result = await poru.resolve({
                query,
                source,
                requester
            });
            
            if (result && result.tracks && result.tracks.length > 0) {
                return {
                    success: true,
                    result,
                    source,
                    fallbackUsed: source !== primarySource
                };
            }
        } catch (error) {
            errors.push({ source, error: error.message });
        }
    }
    
    return {
        success: false,
        errors,
        message: 'Could not find tracks from any source.'
    };
}

function parseTimeString(timeStr) {
    if (!timeStr) return null;
    
    timeStr = timeStr.trim();
    
    if (/^\d+$/.test(timeStr)) {
        return parseInt(timeStr) * 1000;
    }
    
    const colonParts = timeStr.split(':');
    if (colonParts.length === 2) {
        const [mins, secs] = colonParts.map(Number);
        if (!isNaN(mins) && !isNaN(secs)) {
            return (mins * 60 + secs) * 1000;
        }
    }
    
    if (colonParts.length === 3) {
        const [hours, mins, secs] = colonParts.map(Number);
        if (!isNaN(hours) && !isNaN(mins) && !isNaN(secs)) {
            return (hours * 3600 + mins * 60 + secs) * 1000;
        }
    }
    
    return null;
}

function formatError(error) {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error?.message) return error.message;
    return 'Unknown error';
}

module.exports = {
    errorMessages,
    createErrorResponse,
    createSuccessResponse,
    trySearchWithFallback,
    parseTimeString,
    formatError,
    searchFallbackOrder
};
