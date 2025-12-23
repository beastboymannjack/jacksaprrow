const cron = require('cron');
const botController = require('./botController');
const botStatusMonitor = require('./botStatusMonitor');
const botAnalytics = require('./botAnalytics');
const database = require('./database');

class HealthChecker {
    constructor() {
        this.job = null;
        this.isRunning = false;
        this.checkInterval = 5 * 60 * 1000; // 5 minutes
        this.lastCheck = null;
        this.checks = [];
    }

    /**
     * Start health checks
     */
    start(intervalMinutes = 5) {
        if (this.isRunning) {
            console.warn('[HealthChecker] Already running');
            return;
        }

        this.isRunning = true;
        this.checkInterval = intervalMinutes * 60 * 1000;

        // Run check immediately
        this.performHealthCheck();

        // Schedule recurring checks using cron
        const cronPattern = `*/${intervalMinutes} * * * *`;
        this.job = cron.schedule(cronPattern, () => {
            this.performHealthCheck();
        });

        console.log(`[HealthChecker] Started with ${intervalMinutes} minute interval`);
    }

    /**
     * Stop health checks
     */
    stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
        }
        this.isRunning = false;
        console.log('[HealthChecker] Stopped');
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
        try {
            this.lastCheck = Date.now();
            const crashed = await botController.checkCrashedBots();
            const allBots = await database.getLocalBots();

            const checkResult = {
                timestamp: new Date().toISOString(),
                totalBots: allBots.length,
                crashedBots: crashed.length,
                autoRestarts: 0
            };

            // Auto-restart crashed bots
            for (const botName of crashed) {
                const bot = allBots.find(b => b.name === botName);
                if (bot && bot.autoRestart !== false) {
                    const result = await botController.startBot(botName, bot);
                    if (result.success) {
                        checkResult.autoRestarts++;
                        botAnalytics.trackEvent(botName, 'auto_restart', { 
                            reason: 'crash_detection'
                        });
                    }
                }
            }

            this.recordCheck(checkResult);
            console.log(`[HealthChecker] Check complete: ${crashed.length} crashed, ${checkResult.autoRestarts} restarted`);
        } catch (err) {
            console.error('[HealthChecker] Error:', err.message);
            this.recordCheck({ timestamp: new Date().toISOString(), error: err.message });
        }
    }

    /**
     * Record check result
     */
    recordCheck(result) {
        this.checks.push(result);
        if (this.checks.length > 1000) {
            this.checks = this.checks.slice(-1000);
        }
    }

    /**
     * Get check history
     */
    getHistory(limit = 20) {
        return this.checks.slice(-limit);
    }

    /**
     * Get health status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheck: this.lastCheck,
            checkCount: this.checks.length,
            lastResult: this.checks[this.checks.length - 1] || null
        };
    }
}

module.exports = new HealthChecker();
