const { spawn } = require('child_process');
const path = require('path');
const botStatusMonitor = require('./botStatusMonitor');
const database = require('./database');

class BotController {
    constructor() {
        this.processes = new Map();
    }

    /**
     * Start a bot process
     * @param {string} botName - Name of the bot
     * @param {Object} botData - Bot data from database
     * @returns {Promise<{success: boolean, message: string, pid?: number}>}
     */
    async startBot(botName, botData) {
        try {
            if (this.processes.has(botName)) {
                return { success: false, message: 'Bot is already running' };
            }

            const botPath = botData.bot_path || botData.botPath;
            if (!botPath) {
                return { success: false, message: 'Bot path not found' };
            }

            const process = spawn('node', [botPath], {
                cwd: path.dirname(botPath),
                detached: true,
                stdio: 'ignore'
            });

            this.processes.set(botName, {
                pid: process.pid,
                startTime: Date.now(),
                process: process
            });

            // Update status
            botStatusMonitor.updateStatus(botName, 'running', {
                pid: process.pid,
                startedAt: new Date().toISOString()
            });

            // Track in database
            await database.updateLocalBotStatus(botName, 'running');

            return {
                success: true,
                message: `Bot started successfully`,
                pid: process.pid
            };
        } catch (err) {
            botStatusMonitor.recordError(botName, err, { action: 'start' });
            return { success: false, message: `Failed to start bot: ${err.message}` };
        }
    }

    /**
     * Stop a bot process
     * @param {string} botName - Name of the bot
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async stopBot(botName) {
        try {
            const processData = this.processes.get(botName);
            
            if (!processData) {
                // Process not tracked in memory, update status anyway
                botStatusMonitor.updateStatus(botName, 'stopped');
                await database.updateLocalBotStatus(botName, 'stopped');
                return { success: true, message: 'Bot marked as stopped' };
            }

            // Kill process group
            try {
                process.kill(-processData.pid);
            } catch (err) {
                // Process already dead, that's fine
            }

            this.processes.delete(botName);

            // Update status
            botStatusMonitor.updateStatus(botName, 'stopped', {
                stoppedAt: new Date().toISOString()
            });

            await database.updateLocalBotStatus(botName, 'stopped');

            return {
                success: true,
                message: 'Bot stopped successfully'
            };
        } catch (err) {
            botStatusMonitor.recordError(botName, err, { action: 'stop' });
            return { success: false, message: `Failed to stop bot: ${err.message}` };
        }
    }

    /**
     * Restart a bot process
     * @param {string} botName - Name of the bot
     * @param {Object} botData - Bot data from database
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async restartBot(botName, botData) {
        try {
            await this.stopBot(botName);
            
            // Wait a moment for clean shutdown
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const result = await this.startBot(botName, botData);
            
            if (result.success) {
                botStatusMonitor.updateStatus(botName, 'running', {
                    restartedAt: new Date().toISOString()
                });
            }

            return {
                success: result.success,
                message: `Bot ${result.success ? 'restarted' : 'restart failed'}: ${result.message}`
            };
        } catch (err) {
            botStatusMonitor.recordError(botName, err, { action: 'restart' });
            return { success: false, message: `Failed to restart bot: ${err.message}` };
        }
    }

    /**
     * Get bot control status
     * @param {string} botName - Name of the bot
     * @returns {Object}
     */
    getControlStatus(botName) {
        const processData = this.processes.get(botName);
        const statusData = botStatusMonitor.getStatus(botName);

        return {
            botName,
            isRunning: !!processData,
            pid: processData?.pid || null,
            startTime: processData?.startTime || null,
            status: statusData?.status || 'unknown',
            uptime: statusData?.uptime || 'unknown',
            lastUpdated: statusData?.lastUpdated || null
        };
    }

    /**
     * Check and mark crashed bots
     * @returns {Promise<string[]>} - List of crashed bot names
     */
    async checkCrashedBots() {
        const crashed = [];

        for (const [botName, processData] of this.processes.entries()) {
            try {
                // Try to get process info - if it fails, process is dead
                process.kill(processData.pid, 0);
            } catch (err) {
                // Process is dead
                crashed.push(botName);
                botStatusMonitor.updateStatus(botName, 'crashed', {
                    crashedAt: new Date().toISOString()
                });
                this.processes.delete(botName);
            }
        }

        return crashed;
    }

    /**
     * Get all running bots
     * @returns {Object[]}
     */
    getAllRunningBots() {
        return Array.from(this.processes.entries()).map(([name, data]) => ({
            name,
            pid: data.pid,
            uptime: Date.now() - data.startTime
        }));
    }
}

module.exports = new BotController();
