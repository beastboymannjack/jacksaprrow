const config = require('../config');

class StatusManager {
    constructor(client) {
        this.client = client;
        this.activePlayers = new Map();
    }

    async setDefaultStatus() {
        try {
            await this.client.user.setActivity('🎵 Music • /help', { 
                type: 3 // LISTENING
            });
        } catch (error) {
            console.error('Error setting default status:', error);
        }
    }

    async setPlayingStatus(trackTitle, artist) {
        try {
            const cleanTitle = trackTitle.length > 40 ? trackTitle.substring(0, 37) + '...' : trackTitle;
            const cleanArtist = artist && artist.length > 15 ? artist.substring(0, 12) + '...' : artist;
            
            const statusText = artist ? `${cleanTitle} • ${cleanArtist}` : cleanTitle;
            
            await this.client.user.setActivity(statusText, { 
                type: 2 // LISTENING
            });
        } catch (error) {
            console.error('Error setting playing status:', error);
        }
    }

    async updateStatus(player, track = null) {
        if (track) {
            const title = track.info?.title || 'Unknown Track';
            const artist = track.info?.author || 'Unknown Artist';
            this.activePlayers.set(player.guildId, true);
            await this.setPlayingStatus(title, artist);
        } else {
            this.activePlayers.delete(player.guildId);
            // Only set default if no other players are active
            if (this.activePlayers.size === 0) {
                await this.setDefaultStatus();
            }
        }
    }

    isPlayerActive() {
        return this.activePlayers.size > 0;
    }
}

module.exports = StatusManager;
