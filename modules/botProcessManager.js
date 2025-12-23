const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const runningBots = new Map();
const BOT_DATA_FILE = path.join(process.cwd(), 'dbs', 'hosted_bots.json');

const ALLOWED_BOT_DIRS = [];

const remoteLogConfig = {
    enabled: !!process.env.REMOTE_LOG_URL,
    url: process.env.REMOTE_LOG_URL || '',
    apiKey: process.env.REMOTE_LOG_API_KEY || '',
    batchSize: 10,
    flushInterval: 5000
};

let logBuffer = [];
let flushTimer = null;

const healthStats = {
    totalStarted: 0,
    totalStopped: 0,
    totalCrashes: 0,
    lastError: null,
    startTime: Date.now()
};

function getRemoteBaseUrl() {
    const url = remoteLogConfig.url || '';
    return url.replace(/\/api\/logs\/?$/, '').replace(/\/+$/, '');
}

function sendLogsToRemote(logs) {
    if (!remoteLogConfig.enabled || !remoteLogConfig.url) return;
    
    try {
        const baseUrl = getRemoteBaseUrl();
        const urlObj = new URL(baseUrl);
        const isHttps = urlObj.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const payload = JSON.stringify({
            logs: logs,
            source: 'main-replit',
            timestamp: new Date().toISOString()
        });
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: '/api/logs',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'X-API-Key': remoteLogConfig.apiKey
            }
        };
        
        const req = httpModule.request(options, (res) => {
            if (res.statusCode === 404) {
                // Endpoint not available on secondary server - silently ignore
            } else if (res.statusCode !== 200 && res.statusCode !== 201) {
                console.error(`[RemoteLog] Failed to send logs: HTTP ${res.statusCode}`);
            }
        });
        
        req.on('error', (err) => {
            // Silently ignore connection errors for non-critical log sending
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
        });
        
        req.write(payload);
        req.end();
    } catch (err) {
        console.error(`[RemoteLog] Error sending logs: ${err.message}`);
    }
}

function queueRemoteLog(botKey, message, level = 'info') {
    const logEntry = {
        botKey,
        message,
        level,
        timestamp: new Date().toISOString()
    };
    
    logBuffer.push(logEntry);
    
    if (logBuffer.length >= remoteLogConfig.batchSize) {
        flushLogs();
    } else if (!flushTimer) {
        flushTimer = setTimeout(flushLogs, remoteLogConfig.flushInterval);
    }
}

function flushLogs() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    
    if (logBuffer.length === 0) return;
    
    const logsToSend = [...logBuffer];
    logBuffer = [];
    
    sendLogsToRemote(logsToSend);
}

function logBotOutput(botKey, message, level = 'info') {
    if (remoteLogConfig.enabled) {
        queueRemoteLog(botKey, message, level);
    } else {
        if (level === 'error') {
            console.error(`[${botKey}] ERROR: ${message}`);
        } else {
            console.log(`[${botKey}] ${message}`);
        }
    }
}

function isValidBotPath(botPath) {
    if (!botPath || typeof botPath !== 'string') return false;
    const resolvedPath = path.resolve(botPath);
    const isInAllowedPath = ALLOWED_BOT_DIRS.some(base => resolvedPath.startsWith(base));
    const isNotTemplate = !resolvedPath.includes('/template');
    return isInAllowedPath && isNotTemplate && fs.existsSync(resolvedPath);
}

function loadBotData() {
    try {
        if (fs.existsSync(BOT_DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(BOT_DATA_FILE, 'utf8'));
            if (!data.bots) data.bots = [];
            return data;
        }
    } catch (e) {
        console.error('[BotManager] Failed to load bot data:', e.message);
        healthStats.lastError = { type: 'load', message: e.message, time: Date.now() };
    }
    return { bots: [] };
}

function saveBotData(data) {
    try {
        const dir = path.dirname(BOT_DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(BOT_DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('[BotManager] Failed to save bot data:', e.message);
        healthStats.lastError = { type: 'save', message: e.message, time: Date.now() };
        return false;
    }
}

function getBotKey(botPath) {
    return path.basename(botPath);
}

function installDependencies(botPath) {
    return new Promise((resolve, reject) => {
        const packageJsonPath = path.join(botPath, 'package.json');
        const nodeModulesPath = path.join(botPath, 'node_modules');
        
        if (!fs.existsSync(packageJsonPath)) {
            console.log(`[BotManager] No package.json found, skipping npm install`);
            return resolve({ success: true, skipped: true });
        }

        if (fs.existsSync(nodeModulesPath)) {
            console.log(`[BotManager] node_modules already exists, skipping npm install`);
            return resolve({ success: true, skipped: true });
        }

        console.log(`[BotManager] Installing dependencies for ${getBotKey(botPath)}...`);
        
        const npmProcess = spawn('npm', ['install', '--no-fund', '--no-audit'], {
            cwd: botPath,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true
        });

        let stdout = '';
        let stderr = '';

        npmProcess.stdout.on('data', (data) => {
            const msg = data.toString().trim();
            stdout += msg + '\n';
            if (msg) console.log(`[npm] ${msg}`);
        });

        npmProcess.stderr.on('data', (data) => {
            const msg = data.toString().trim();
            stderr += msg + '\n';
            if (msg && !msg.includes('npm WARN') && !msg.includes('deprecated')) {
                console.log(`[npm] ${msg}`);
            }
        });

        npmProcess.on('error', (err) => {
            console.error(`[BotManager] npm install spawn error:`, err);
            reject(new Error(`npm install failed to start: ${err.message}`));
        });

        npmProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`[BotManager] Dependencies installed successfully`);
                resolve({ success: true, stdout, stderr });
            } else {
                console.error(`[BotManager] npm install failed with exit code ${code}`);
                reject(new Error(`npm install failed (exit code ${code}): ${stderr.substring(0, 500)}`));
            }
        });

        setTimeout(() => {
            if (!npmProcess.killed) {
                npmProcess.kill('SIGTERM');
                reject(new Error('npm install timed out after 5 minutes'));
            }
        }, 300000);
    });
}

function notifyBotCreated(botKey, botInfo) {
    if (!remoteLogConfig.enabled || !remoteLogConfig.url) return;
    
    try {
        const baseUrl = getRemoteBaseUrl();
        const urlObj = new URL(baseUrl);
        const isHttps = urlObj.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const payload = JSON.stringify({
            event: 'bot_created',
            botKey,
            botInfo,
            source: 'main-replit',
            timestamp: new Date().toISOString()
        });
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: '/api/bot-events',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'X-API-Key': remoteLogConfig.apiKey
            }
        };
        
        const req = httpModule.request(options, (res) => {
            if (res.statusCode === 404) {
                // Endpoint not available on secondary server - silently ignore
            } else if (res.statusCode !== 200 && res.statusCode !== 201) {
                console.error(`[RemoteLog] Failed to notify bot creation: HTTP ${res.statusCode}`);
            }
        });
        
        req.on('error', (err) => {
            // Silently ignore connection errors for non-critical notifications
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
        });
        
        req.write(payload);
        req.end();
    } catch (err) {
        // Silently ignore errors for non-critical notifications
    }
}

function startBot(botPath, skipInstall = false) {
    return new Promise(async (resolve, reject) => {
        if (!isValidBotPath(botPath)) {
            const err = new Error('Invalid or unauthorized bot path');
            healthStats.lastError = { type: 'start', message: err.message, path: botPath, time: Date.now() };
            return reject(err);
        }

        const botKey = getBotKey(botPath);
        
        if (runningBots.has(botKey)) {
            const existing = runningBots.get(botKey);
            if (existing.process && !existing.process.killed && existing.status === 'running') {
                return reject(new Error('Bot is already running'));
            }
            runningBots.delete(botKey);
        }

        const indexPath = path.join(botPath, 'index.js');
        if (!fs.existsSync(indexPath)) {
            const err = new Error(`Bot entry file not found: ${indexPath}`);
            healthStats.lastError = { type: 'start', message: err.message, path: botPath, time: Date.now() };
            return reject(err);
        }

        if (!skipInstall) {
            try {
                await installDependencies(botPath);
            } catch (err) {
                console.error(`[BotManager] Failed to install dependencies:`, err);
                healthStats.lastError = { type: 'install', message: err.message, path: botPath, time: Date.now() };
                return reject(new Error(`Failed to install dependencies: ${err.message}`));
            }
        }

        console.log(`[BotManager] Starting bot: ${botKey}`);
        
        const botProcess = spawn('node', ['index.js'], {
            cwd: botPath,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false,
            env: { ...process.env, NODE_ENV: 'production' }
        });

        let startupOutput = '';
        let hasExited = false;
        let exitCode = null;
        let resolved = false;

        botProcess.stdout.on('data', (data) => {
            const output = data.toString();
            startupOutput += output;
            logBotOutput(botKey, output.trim(), 'info');
        });

        botProcess.stderr.on('data', (data) => {
            const output = data.toString();
            startupOutput += output;
            logBotOutput(botKey, output.trim(), 'error');
        });

        botProcess.on('error', (err) => {
            console.error(`[BotManager] Failed to start ${botKey}:`, err);
            healthStats.lastError = { type: 'spawn', message: err.message, path: botPath, time: Date.now() };
            runningBots.delete(botKey);
            if (!resolved) {
                resolved = true;
                reject(err);
            }
        });

        botProcess.on('exit', (code, signal) => {
            hasExited = true;
            exitCode = code;
            console.log(`[BotManager] Bot ${botKey} exited with code ${code}, signal ${signal}`);
            logBotOutput(botKey, `Bot exited with code ${code}, signal ${signal}`, code !== 0 ? 'error' : 'info');
            
            const botData = runningBots.get(botKey);
            if (botData) {
                botData.status = 'stopped';
                botData.exitCode = code;
                botData.stoppedAt = Date.now();
            }
            if (code !== 0) {
                healthStats.totalCrashes++;
                healthStats.lastError = { type: 'crash', code, signal, path: botPath, time: Date.now() };
            }
            healthStats.totalStopped++;
            if (!resolved && code !== 0) {
                resolved = true;
                runningBots.delete(botKey);
                reject(new Error(`Bot crashed on startup (exit code ${code}): ${startupOutput.substring(0, 500)}`));
            }
        });

        runningBots.set(botKey, {
            process: botProcess,
            path: botPath,
            status: 'starting',
            startedAt: Date.now(),
            pid: botProcess.pid,
            restarts: 0
        });

        setTimeout(() => {
            if (resolved) return;
            resolved = true;
            
            if (hasExited) {
                runningBots.delete(botKey);
                reject(new Error(`Bot exited during startup (code ${exitCode}): ${startupOutput.substring(0, 500)}`));
            } else if (botProcess.pid && !botProcess.killed) {
                const botData = runningBots.get(botKey);
                if (botData) {
                    botData.status = 'running';
                }
                
                healthStats.totalStarted++;
                
                const data = loadBotData();
                const existingIndex = data.bots.findIndex(b => b.path === botPath);
                const botInfo = {
                    name: botKey,
                    path: botPath,
                    startedAt: Date.now(),
                    type: botPath.includes('ticket') ? 'Ticket Bot' : 'System Bot'
                };
                if (existingIndex >= 0) {
                    data.bots[existingIndex] = botInfo;
                } else {
                    data.bots.push(botInfo);
                }
                saveBotData(data);
                
                notifyBotCreated(botKey, botInfo);
                
                resolve({
                    success: true,
                    botKey,
                    pid: botProcess.pid,
                    message: `Bot ${botKey} started successfully`
                });
            } else {
                runningBots.delete(botKey);
                reject(new Error(`Bot failed to start: ${startupOutput.substring(0, 500)}`));
            }
        }, 8000);
    });
}

function stopBot(botPath) {
    return new Promise((resolve, reject) => {
        const botKey = getBotKey(botPath);
        const botData = runningBots.get(botKey);

        if (!botData || !botData.process) {
            return reject(new Error('Bot is not running'));
        }

        if (botData.process.killed || botData.status === 'stopped') {
            runningBots.delete(botKey);
            return reject(new Error('Bot is already stopped'));
        }

        console.log(`[BotManager] Stopping bot: ${botKey}`);
        logBotOutput(botKey, 'Bot stopping...', 'info');

        try {
            botData.process.kill('SIGTERM');
            
            setTimeout(() => {
                if (botData.process && !botData.process.killed) {
                    botData.process.kill('SIGKILL');
                }
            }, 5000);

            botData.status = 'stopped';
            botData.stoppedAt = Date.now();
            resolve({
                success: true,
                botKey,
                message: `Bot ${botKey} stopped successfully`
            });
        } catch (err) {
            healthStats.lastError = { type: 'stop', message: err.message, path: botPath, time: Date.now() };
            reject(err);
        }
    });
}

function restartBot(botPath) {
    return new Promise(async (resolve, reject) => {
        const botKey = getBotKey(botPath);
        
        try {
            try {
                await stopBot(botPath);
            } catch (e) {
            }
            
            await new Promise(r => setTimeout(r, 2000));
            
            const result = await startBot(botPath, true);
            
            const botData = runningBots.get(botKey);
            if (botData) {
                botData.restarts = (botData.restarts || 0) + 1;
            }
            
            resolve({
                success: true,
                botKey,
                message: `Bot ${botKey} restarted successfully`,
                pid: result.pid
            });
        } catch (err) {
            healthStats.lastError = { type: 'restart', message: err.message, path: botPath, time: Date.now() };
            reject(err);
        }
    });
}

function deleteBot(botPath) {
    return new Promise(async (resolve, reject) => {
        if (!isValidBotPath(botPath)) {
            return reject(new Error('Invalid or unauthorized bot path'));
        }

        const botKey = getBotKey(botPath);
        
        try {
            try {
                await stopBot(botPath);
            } catch (e) {
            }
            
            await new Promise(r => setTimeout(r, 1000));
            
            if (fs.existsSync(botPath)) {
                fs.rmSync(botPath, { recursive: true, force: true });
            }

            const data = loadBotData();
            data.bots = data.bots.filter(b => b.path !== botPath);
            saveBotData(data);

            runningBots.delete(botKey);

            resolve({
                success: true,
                botKey,
                message: `Bot ${botKey} deleted successfully`
            });
        } catch (err) {
            healthStats.lastError = { type: 'delete', message: err.message, path: botPath, time: Date.now() };
            reject(err);
        }
    });
}

function getBotStatus(botPath) {
    const botKey = getBotKey(botPath);
    const botData = runningBots.get(botKey);

    if (!botData) {
        return { status: 'not_found', running: false };
    }

    const isRunning = botData.process && !botData.process.killed && botData.status === 'running';
    
    return {
        status: botData.status,
        running: isRunning,
        pid: botData.pid,
        startedAt: botData.startedAt,
        stoppedAt: botData.stoppedAt,
        restarts: botData.restarts || 0,
        path: botData.path,
        uptime: isRunning ? Date.now() - botData.startedAt : 0
    };
}

function getAllRunningBots() {
    const bots = [];
    runningBots.forEach((data, key) => {
        bots.push({
            name: key,
            ...getBotStatus(data.path)
        });
    });
    return bots;
}

function getAllHostedBots() {
    const data = loadBotData();
    return data.bots.map(bot => {
        const status = getBotStatus(bot.path);
        return {
            ...bot,
            ...status,
            exists: fs.existsSync(bot.path)
        };
    });
}

function getHostedBotStats() {
    const bots = getAllHostedBots();
    const running = bots.filter(b => b.running);
    const memUsage = process.memoryUsage();
    
    return {
        total: bots.length,
        running: running.length,
        stopped: bots.length - running.length,
        health: {
            ...healthStats,
            uptime: Date.now() - healthStats.startTime
        },
        system: {
            memoryUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024)
        },
        bots: bots.map(b => ({
            name: b.name,
            type: b.type,
            running: b.running,
            pid: b.pid,
            uptime: b.uptime,
            restarts: b.restarts || 0
        }))
    };
}

function stopAllBots() {
    const promises = [];
    runningBots.forEach((data, key) => {
        if (data.process && !data.process.killed) {
            promises.push(stopBot(data.path).catch(e => console.error(`Failed to stop ${key}:`, e)));
        }
    });
    return Promise.all(promises);
}

function autoStartBots(client = null) {
    const data = loadBotData();
    const validBots = data.bots.filter(bot => fs.existsSync(bot.path));
    
    console.log(`[BotManager] Auto-starting ${validBots.length} saved bots...`);
    
    if (validBots.length === 0) {
        console.log('[BotManager] No bots to auto-start');
        return Promise.resolve([]);
    }
    
    const startPromises = validBots.map((bot, index) => {
        return new Promise((resolve) => {
            setTimeout(async () => {
                // Skip expired bots
                if (client && client.bots) {
                    const expCheck = checkBotExpiration(client, bot.botId);
                    if (expCheck.expired) {
                        console.log(`[BotManager] Skipping expired bot: ${bot.name}`);
                        resolve({ name: bot.name, success: false, skipped: true, reason: 'expired' });
                        return;
                    }
                }
                
                try {
                    await startBot(bot.path, true);
                    console.log(`[BotManager] Auto-started: ${bot.name}`);
                    resolve({ name: bot.name, success: true });
                } catch (e) {
                    console.error(`[BotManager] Failed to auto-start ${bot.name}:`, e.message);
                    resolve({ name: bot.name, success: false, error: e.message });
                }
            }, index * 3000);
        });
    });
    
    return Promise.all(startPromises);
}

function getRemoteLogConfig() {
    return {
        enabled: remoteLogConfig.enabled,
        url: remoteLogConfig.url ? remoteLogConfig.url.replace(/\/api.*$/, '') : '',
        hasApiKey: !!remoteLogConfig.apiKey
    };
}

function setRemoteLogConfig(url, apiKey) {
    remoteLogConfig.enabled = !!url;
    remoteLogConfig.url = url || '';
    remoteLogConfig.apiKey = apiKey || '';
    console.log(`[BotManager] Remote logging ${remoteLogConfig.enabled ? 'enabled' : 'disabled'}`);
    return getRemoteLogConfig();
}

process.on('exit', () => {
    flushLogs();
    runningBots.forEach((data, key) => {
        if (data.process && !data.process.killed) {
            try {
                data.process.kill('SIGKILL');
            } catch (e) {}
        }
    });
});

process.on('SIGINT', async () => {
    console.log('[BotManager] Shutting down all bots...');
    flushLogs();
    await stopAllBots();
    process.exit(0);
});

if (remoteLogConfig.enabled) {
    console.log(`[BotManager] Remote logging enabled to: ${remoteLogConfig.url}`.cyan);
} else {
    console.log('[BotManager] Remote logging disabled (set REMOTE_LOG_URL to enable)'.yellow);
}

function isBotRunning(botkey) {
    return runningBots.has(botkey);
}

function checkBotExpiration(client, botId) {
    if (!client || !client.bots) return { expired: false };
    
    const botData = client.bots.get(botId);
    if (!botData || !botData.expirationDate) {
        return { expired: false, unlimited: true };
    }

    const expirationTime = new Date(botData.expirationDate).getTime();
    const now = Date.now();
    const remaining = expirationTime - now;

    if (remaining <= 0) {
        return { expired: true, expirationDate: botData.expirationDate };
    }

    return { expired: false, remaining };
}

module.exports = {
    startBot,
    stopBot,
    restartBot,
    deleteBot,
    getBotStatus,
    getAllRunningBots,
    getAllHostedBots,
    getHostedBotStats,
    stopAllBots,
    autoStartBots,
    installDependencies,
    isBotRunning,
    checkBotExpiration,
    runningBots,
    healthStats,
    getRemoteLogConfig,
    setRemoteLogConfig,
    notifyBotCreated,
    flushLogs
};
