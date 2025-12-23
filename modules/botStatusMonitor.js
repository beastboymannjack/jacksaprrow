const fs = require('fs');
const path = require('path');
const database = require('./database');

const STATUS_FILE = path.join(process.cwd(), 'dbs', 'bot_status.json');

class BotStatusMonitor {
    constructor() {
        this.statuses = new Map();
        this.loadStatuses();
    }

    loadStatuses() {
        try {
            if (fs.existsSync(STATUS_FILE)) {
                const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
                if (data.bots) {
                    data.bots.forEach(bot => {
                        this.statuses.set(bot.name, bot);
                    });
                }
            }
        } catch (err) {
            console.error('[BotStatusMonitor] Error loading statuses:', err.message);
        }
    }

    saveStatuses() {
        try {
            const bots = Array.from(this.statuses.values());
            fs.writeFileSync(STATUS_FILE, JSON.stringify({ bots }, null, 2));
        } catch (err) {
            console.error('[BotStatusMonitor] Error saving statuses:', err.message);
        }
    }

    /**
     * Update bot status
     */
    updateStatus(botName, status, metadata = {}) {
        const botStatus = this.statuses.get(botName) || {
            name: botName,
            createdAt: new Date().toISOString(),
            statusHistory: []
        };

        const previousStatus = botStatus.status;
        botStatus.status = status;
        botStatus.lastUpdated = new Date().toISOString();
        botStatus.uptime = this.calculateUptime(botStatus);
        Object.assign(botStatus, metadata);

        // Track status changes
        botStatus.statusHistory = botStatus.statusHistory || [];
        botStatus.statusHistory.push({
            status: status,
            timestamp: new Date().toISOString(),
            from: previousStatus
        });
        if (botStatus.statusHistory.length > 100) {
            botStatus.statusHistory = botStatus.statusHistory.slice(-100);
        }

        this.statuses.set(botName, botStatus);
        this.saveStatuses();
        return botStatus;
    }

    /**
     * Get bot status
     */
    getStatus(botName) {
        return this.statuses.get(botName) || null;
    }

    /**
     * Get all bot statuses with filtering
     */
    getAllStatuses(filter = {}) {
        const bots = Array.from(this.statuses.values());
        
        if (filter.status) {
            return bots.filter(b => b.status === filter.status);
        }
        if (filter.ownerId) {
            return bots.filter(b => b.ownerId === filter.ownerId);
        }
        
        return bots;
    }

    /**
     * Calculate uptime from status history
     */
    calculateUptime(botStatus) {
        if (!botStatus.createdAt) return 'Unknown';
        
        const created = new Date(botStatus.createdAt);
        const now = new Date();
        const diff = now - created;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    /**
     * Get status statistics
     */
    getStatistics() {
        const allBots = Array.from(this.statuses.values());
        const running = allBots.filter(b => b.status === 'running').length;
        const stopped = allBots.filter(b => b.status === 'stopped').length;
        const crashed = allBots.filter(b => b.status === 'crashed').length;
        
        return {
            total: allBots.length,
            running,
            stopped,
            crashed,
            healthy: running / (allBots.length || 1) * 100,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Record error for a bot
     */
    recordError(botName, error, metadata = {}) {
        const botStatus = this.getStatus(botName) || {
            name: botName,
            createdAt: new Date().toISOString(),
            errors: []
        };

        botStatus.errors = botStatus.errors || [];
        botStatus.errors.push({
            message: error.message || error.toString(),
            timestamp: new Date().toISOString(),
            metadata
        });

        if (botStatus.errors.length > 50) {
            botStatus.errors = botStatus.errors.slice(-50);
        }

        this.statuses.set(botName, botStatus);
        this.saveStatuses();
        return botStatus;
    }

    /**
     * Get error history
     */
    getErrors(botName, limit = 10) {
        const botStatus = this.getStatus(botName);
        if (!botStatus || !botStatus.errors) return [];
        return botStatus.errors.slice(-limit);
    }
}

module.exports = new BotStatusMonitor();
