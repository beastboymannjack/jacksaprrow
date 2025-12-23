class QueueStateManager {
    constructor() {
        this.guildStates = new Map();
        this.maxHistorySize = 50;
        this.maxUndoStates = 10;
    }

    getGuildState(guildId) {
        if (!this.guildStates.has(guildId)) {
            this.guildStates.set(guildId, {
                history: [],
                undoStack: [],
                lastPlayed: null,
                playedTracks: new Set()
            });
        }
        return this.guildStates.get(guildId);
    }

    addToHistory(guildId, track) {
        const state = this.getGuildState(guildId);
        
        const historyEntry = {
            identifier: track.info?.identifier,
            title: track.info?.title,
            author: track.info?.author,
            uri: track.info?.uri,
            length: track.info?.length,
            artworkUrl: track.info?.artworkUrl,
            timestamp: Date.now(),
            requester: track.info?.requester?.id
        };
        
        state.history.unshift(historyEntry);
        
        if (state.history.length > this.maxHistorySize) {
            state.history = state.history.slice(0, this.maxHistorySize);
        }
        
        state.lastPlayed = historyEntry;
        state.playedTracks.add(track.info?.identifier);
    }

    getHistory(guildId, limit = 10) {
        const state = this.getGuildState(guildId);
        return state.history.slice(0, limit);
    }

    getLastPlayed(guildId) {
        const state = this.getGuildState(guildId);
        return state.lastPlayed;
    }

    saveQueueSnapshot(guildId, player) {
        const state = this.getGuildState(guildId);
        
        const snapshot = {
            currentTrack: player.currentTrack ? {
                identifier: player.currentTrack.info?.identifier,
                title: player.currentTrack.info?.title,
                author: player.currentTrack.info?.author,
                uri: player.currentTrack.info?.uri,
                length: player.currentTrack.info?.length,
                artworkUrl: player.currentTrack.info?.artworkUrl,
                requester: player.currentTrack.info?.requester
            } : null,
            queue: player.queue.map(track => ({
                identifier: track.info?.identifier,
                title: track.info?.title,
                author: track.info?.author,
                uri: track.info?.uri,
                length: track.info?.length,
                artworkUrl: track.info?.artworkUrl,
                requester: track.info?.requester
            })),
            position: player.position,
            timestamp: Date.now()
        };
        
        state.undoStack.push(snapshot);
        
        if (state.undoStack.length > this.maxUndoStates) {
            state.undoStack.shift();
        }
        
        return snapshot;
    }

    popUndoSnapshot(guildId) {
        const state = this.getGuildState(guildId);
        return state.undoStack.pop();
    }

    hasUndoSnapshot(guildId) {
        const state = this.getGuildState(guildId);
        return state.undoStack.length > 0;
    }

    getUndoCount(guildId) {
        const state = this.getGuildState(guildId);
        return state.undoStack.length;
    }

    wasRecentlyPlayed(guildId, identifier) {
        const state = this.getGuildState(guildId);
        return state.playedTracks.has(identifier);
    }

    clearGuildState(guildId) {
        this.guildStates.delete(guildId);
    }

    getPlayedArtists(guildId) {
        const state = this.getGuildState(guildId);
        const artists = new Map();
        
        for (const track of state.history) {
            if (track.author) {
                const count = artists.get(track.author) || 0;
                artists.set(track.author, count + 1);
            }
        }
        
        return Array.from(artists.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([artist]) => artist);
    }
}

const queueStateManager = new QueueStateManager();

module.exports = {
    QueueStateManager,
    queueStateManager
};
