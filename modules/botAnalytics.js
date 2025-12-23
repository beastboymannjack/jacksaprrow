const fs = require('fs');
const path = require('path');

const ANALYTICS_FILE = path.join(process.cwd(), 'dbs', 'bot_analytics.json');

class BotAnalytics {
    constructor() {
        this.data = this.loadAnalytics();
    }

    loadAnalytics() {
        try {
            if (fs.existsSync(ANALYTICS_FILE)) {
                return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
            }
        } catch (err) {
            console.error('[Analytics] Load error:', err.message);
        }
        return { bots: {} };
    }

    saveAnalytics() {
        try {
            fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(this.data, null, 2));
        } catch (err) {
            console.error('[Analytics] Save error:', err.message);
        }
    }

    /**
     * Track bot event (start, stop, crash, command, etc)
     */
    trackEvent(botName, eventType, metadata = {}) {
        if (!this.data.bots[botName]) {
            this.data.bots[botName] = {
                name: botName,
                events: [],
                stats: { starts: 0, stops: 0, crashes: 0, commands: 0, errors: 0 }
            };
        }

        const bot = this.data.bots[botName];
        bot.events.push({
            type: eventType,
            timestamp: new Date().toISOString(),
            metadata
        });

        // Keep last 1000 events per bot
        if (bot.events.length > 1000) {
            bot.events = bot.events.slice(-1000);
        }

        // Update stats
        if (bot.stats[eventType]) {
            bot.stats[eventType]++;
        }
        bot.lastEvent = eventType;
        bot.lastEventTime = new Date().toISOString();

        this.saveAnalytics();
        return bot;
    }

    /**
     * Get analytics for a bot
     */
    getAnalytics(botName) {
        return this.data.bots[botName] || null;
    }

    /**
     * Get all analytics
     */
    getAllAnalytics() {
        return Object.values(this.data.bots);
    }

    /**
     * Get stats summary
     */
    getStats(botName) {
        const bot = this.data.bots[botName];
        if (!bot) return null;

        const now = Date.now();
        const uptime = bot.stats.starts > 0 && bot.stats.stops > 0 
            ? ((bot.stats.starts - bot.stats.crashes) / bot.stats.starts * 100).toFixed(1)
            : 100;

        return {
            botName,
            totalStarts: bot.stats.starts,
            totalStops: bot.stats.stops,
            totalCrashes: bot.stats.crashes,
            totalCommands: bot.stats.commands,
            totalErrors: bot.stats.errors,
            healthPercentage: uptime,
            lastEvent: bot.lastEvent,
            lastEventTime: bot.lastEventTime,
            eventCount: bot.events.length
        };
    }

    /**
     * Get health percentage for all bots
     */
    getSystemHealth() {
        const bots = Object.values(this.data.bots);
        if (bots.length === 0) return 100;

        const totalHealth = bots.reduce((sum, bot) => {
            const uptime = bot.stats.starts > 0 && bot.stats.stops > 0 
                ? ((bot.stats.starts - bot.stats.crashes) / bot.stats.starts * 100)
                : 100;
            return sum + uptime;
        }, 0);

        return (totalHealth / bots.length).toFixed(1);
    }

    /**
     * Get recent events for a bot
     */
    getRecentEvents(botName, limit = 20) {
        const bot = this.data.bots[botName];
        if (!bot) return [];
        return bot.events.slice(-limit);
    }

    /**
     * Clear analytics for a bot
     */
    clearAnalytics(botName) {
        if (this.data.bots[botName]) {
            delete this.data.bots[botName];
            this.saveAnalytics();
            return true;
        }
        return false;
    }
}

module.exports = new BotAnalytics();
