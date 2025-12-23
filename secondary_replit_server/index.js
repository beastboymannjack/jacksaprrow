const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.REMOTE_LOG_API_KEY;

if (!API_KEY) {
    console.error('ERROR: REMOTE_LOG_API_KEY environment variable is required!');
    console.error('Please set it in the Secrets tab of your Replit.');
    process.exit(1);
}

const LOG_FILE = path.join(process.cwd(), 'logs', 'remote_bot_logs.json');
const EVENT_FILE = path.join(process.cwd(), 'logs', 'bot_events.json');
const BOTS_BASE_DIR = path.join(process.cwd(), 'bots');
const MAX_LOGS = 1000;

const runningBots = new Map();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function ensureLogDir() {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function ensureBotsDir(botType = 'ticket') {
    const botsDir = path.join(BOTS_BASE_DIR, botType);
    if (!fs.existsSync(botsDir)) {
        fs.mkdirSync(botsDir, { recursive: true });
    }
    return botsDir;
}

function findBotPath(botKey) {
    if (!fs.existsSync(BOTS_BASE_DIR)) return null;
    const botTypes = fs.readdirSync(BOTS_BASE_DIR).filter(f => {
        const fullPath = path.join(BOTS_BASE_DIR, f);
        return fs.statSync(fullPath).isDirectory();
    });
    for (const botType of botTypes) {
        const botPath = path.join(BOTS_BASE_DIR, botType, botKey);
        if (fs.existsSync(botPath) && fs.statSync(botPath).isDirectory()) {
            return { botPath, botType };
        }
    }
    return null;
}

function loadLogs() {
    ensureLogDir();
    try {
        if (fs.existsSync(LOG_FILE)) {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[RemoteServer] Failed to load logs:', e.message);
    }
    return { logs: [] };
}

function saveLogs(data) {
    ensureLogDir();
    try {
        if (data.logs.length > MAX_LOGS) {
            data.logs = data.logs.slice(-MAX_LOGS);
        }
        fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('[RemoteServer] Failed to save logs:', e.message);
        return false;
    }
}

function loadEvents() {
    ensureLogDir();
    try {
        if (fs.existsSync(EVENT_FILE)) {
            return JSON.parse(fs.readFileSync(EVENT_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[RemoteServer] Failed to load events:', e.message);
    }
    return { events: [] };
}

function saveEvents(data) {
    ensureLogDir();
    try {
        if (data.events.length > MAX_LOGS) {
            data.events = data.events.slice(-MAX_LOGS);
        }
        fs.writeFileSync(EVENT_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('[RemoteServer] Failed to save events:', e.message);
        return false;
    }
}

function getBotStatus(botKey) {
    const found = findBotPath(botKey);
    const botPath = found ? found.botPath : null;
    const isRunning = runningBots.has(botKey);
    const botInfo = runningBots.get(botKey) || {};
    
    return {
        name: botKey,
        path: botPath,
        exists: !!found,
        running: isRunning,
        pid: botInfo.pid || null,
        startedAt: botInfo.startedAt || null,
        uptime: botInfo.startedAt ? Date.now() - new Date(botInfo.startedAt).getTime() : 0,
        botType: found ? found.botType : null
    };
}

function loadBotConfig(botPath) {
    const configLocations = [
        path.join(botPath, 'config.json'),
        path.join(botPath, 'botconfig', 'config.json')
    ];
    
    for (const configPath of configLocations) {
        if (fs.existsSync(configPath)) {
            try {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) {}
        }
    }
    return {};
}

function startBotProcess(botKey) {
    return new Promise((resolve, reject) => {
        const found = findBotPath(botKey);
        
        if (!found) {
            return reject(new Error(`Bot folder not found: ${botKey}`));
        }
        
        const botPath = found.botPath;
        
        let startFile = 'index.js';
        const clusterPath = path.join(botPath, 'cluster.js');
        if (fs.existsSync(clusterPath)) {
            startFile = 'cluster.js';
        }
        
        const startFilePath = path.join(botPath, startFile);
        if (!fs.existsSync(startFilePath)) {
            return reject(new Error(`No ${startFile} found in ${botKey}`));
        }
        
        if (runningBots.has(botKey)) {
            return reject(new Error(`Bot ${botKey} is already running`));
        }
        
        console.log(`[BotManager] Starting bot: ${botKey} with ${startFile}`);
        
        const botConfig = loadBotConfig(botPath);
        const mongoURI = (botConfig.mongooseConnectionString && botConfig.mongooseConnectionString.trim() !== '') 
            ? botConfig.mongooseConnectionString 
            : (process.env.MONGODB_URI || '');
        const botEnv = {
            ...process.env,
            NODE_ENV: 'production',
            token: botConfig.token || '',
            mongooseConnectionString: mongoURI,
            BOT_PREFIX: botConfig.prefix || '!'
        };
        
        if (mongoURI) {
            console.log(`[BotManager] Bot ${botKey} using MongoDB connection`);
        } else {
            console.log(`[BotManager] Bot ${botKey} running without MongoDB`);
        }
        
        const botProcess = spawn('node', [startFile], {
            cwd: botPath,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false,
            env: botEnv
        });
        
        runningBots.set(botKey, {
            process: botProcess,
            pid: botProcess.pid,
            startedAt: new Date().toISOString(),
            restarts: 0,
            botType: found.botType
        });
        
        botProcess.stdout.on('data', (data) => {
            console.log(`[${botKey}] ${data.toString().trim()}`);
        });
        
        botProcess.stderr.on('data', (data) => {
            console.error(`[${botKey}] ERROR: ${data.toString().trim()}`);
        });
        
        botProcess.on('exit', (code, signal) => {
            console.log(`[${botKey}] Process exited with code ${code}, signal ${signal}`);
            runningBots.delete(botKey);
        });
        
        botProcess.on('error', (err) => {
            console.error(`[${botKey}] Process error:`, err.message);
            runningBots.delete(botKey);
        });
        
        setTimeout(() => {
            if (runningBots.has(botKey)) {
                resolve({ success: true, pid: botProcess.pid, botKey, startFile });
            } else {
                reject(new Error(`Bot ${botKey} failed to start`));
            }
        }, 2000);
    });
}

function stopBotProcess(botKey) {
    return new Promise((resolve, reject) => {
        const botInfo = runningBots.get(botKey);
        
        if (!botInfo) {
            return reject(new Error(`Bot ${botKey} is not running`));
        }
        
        console.log(`[BotManager] Stopping bot: ${botKey}`);
        
        try {
            botInfo.process.kill('SIGTERM');
            
            setTimeout(() => {
                if (runningBots.has(botKey)) {
                    try {
                        botInfo.process.kill('SIGKILL');
                    } catch (e) {}
                }
                runningBots.delete(botKey);
                resolve({ success: true, botKey });
            }, 3000);
        } catch (err) {
            runningBots.delete(botKey);
            resolve({ success: true, botKey, note: 'Process may have already exited' });
        }
    });
}

function installDependencies(botPath) {
    return new Promise((resolve, reject) => {
        const packageJsonPath = path.join(botPath, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            return resolve({ success: true, skipped: true, message: 'No package.json found' });
        }
        
        console.log(`[BotManager] Installing dependencies in ${botPath}`);
        
        exec('npm install --production', { 
            cwd: botPath, 
            timeout: 120000,
            maxBuffer: 10 * 1024 * 1024
        }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[BotManager] npm install error:`, error.message);
                return reject(error);
            }
            console.log(`[BotManager] npm install completed`);
            resolve({ success: true, stdout, stderr });
        });
    });
}

function writeFilesRecursively(basePath, files) {
    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(basePath, filePath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        if (typeof content === 'object' && content !== null && !Buffer.isBuffer(content)) {
            if (content.__binary && content.data) {
                const buffer = Buffer.from(content.data, 'base64');
                fs.writeFileSync(fullPath, buffer);
            } else {
                fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
            }
        } else {
            fs.writeFileSync(fullPath, content);
        }
    }
}

const checkApiKey = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) {
        console.log(`[Auth] Unauthorized request from ${req.ip} - provided key: ${key ? key.substring(0, 10) + '...' : 'none'}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

app.get('/', (req, res) => {
    res.json({
        name: 'Secondary Replit Bot Hosting Server',
        status: 'running',
        version: '1.0.0',
        endpoints: [
            'GET  /api/health - Health check',
            'POST /api/deploy-bot - Deploy a new bot',
            'GET  /api/bots - List all bots',
            'POST /api/bots/:botKey/start - Start a bot',
            'POST /api/bots/:botKey/stop - Stop a bot',
            'POST /api/bots/:botKey/restart - Restart a bot',
            'DELETE /api/bots/:botKey - Delete a bot'
        ],
        runningBots: runningBots.size,
        uptime: process.uptime()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        runningBots: runningBots.size
    });
});

app.post('/api/deploy-bot', checkApiKey, async (req, res) => {
    try {
        const { botName, botType = 'ticket', files, config } = req.body;
        
        if (!botName || !files) {
            return res.status(400).json({ error: 'Missing botName or files' });
        }
        
        const safeBotName = botName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const botsDir = ensureBotsDir(botType);
        const botPath = path.join(botsDir, safeBotName);
        
        if (fs.existsSync(botPath)) {
            return res.status(400).json({ error: `Bot ${safeBotName} already exists` });
        }
        
        fs.mkdirSync(botPath, { recursive: true });
        
        console.log(`[Deploy] Creating ${botType} bot: ${safeBotName}`);
        
        writeFilesRecursively(botPath, files);
        
        if (config) {
            const configLocations = [
                path.join(botPath, 'config.json'),
                path.join(botPath, 'botconfig', 'config.json')
            ];
            
            for (const configPath of configLocations) {
                const configDir = path.dirname(configPath);
                if (!fs.existsSync(configDir)) {
                    fs.mkdirSync(configDir, { recursive: true });
                }
                
                let existingConfig = {};
                if (fs.existsSync(configPath)) {
                    try {
                        existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    } catch (e) {}
                }
                
                const mergedConfig = { ...existingConfig, ...config, botType };
                
                if (config.token) mergedConfig.token = config.token;
                if (config.mongooseConnectionString) mergedConfig.mongooseConnectionString = config.mongooseConnectionString;
                if (config.prefix) mergedConfig.prefix = config.prefix;
                
                fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 3));
                console.log(`[Deploy] Updated config at: ${configPath}`);
            }
        }
        
        console.log(`[Deploy] Installing dependencies for: ${safeBotName}`);
        await installDependencies(botPath);
        
        console.log(`[Deploy] Starting bot: ${safeBotName}`);
        const startResult = await startBotProcess(safeBotName);
        
        res.json({ 
            success: true, 
            message: `Bot ${safeBotName} deployed and started`,
            botKey: safeBotName,
            botType,
            pid: startResult.pid
        });
        
    } catch (err) {
        console.error('[Deploy] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bots', checkApiKey, (req, res) => {
    try {
        const bots = [];
        
        if (!fs.existsSync(BOTS_BASE_DIR)) {
            return res.json({ bots: [], total: 0 });
        }
        
        const botTypes = fs.readdirSync(BOTS_BASE_DIR).filter(f => {
            const fullPath = path.join(BOTS_BASE_DIR, f);
            return fs.statSync(fullPath).isDirectory();
        });
        
        for (const botType of botTypes) {
            const typeDir = path.join(BOTS_BASE_DIR, botType);
            const botFolders = fs.readdirSync(typeDir).filter(f => {
                const fullPath = path.join(typeDir, f);
                return fs.statSync(fullPath).isDirectory() && f !== 'template';
            });
            
            for (const botKey of botFolders) {
                const status = getBotStatus(botKey);
                bots.push({
                    ...status,
                    type: botType,
                    location: 'secondary'
                });
            }
        }
        
        res.json({ bots, total: bots.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bots/:botKey/status', checkApiKey, (req, res) => {
    try {
        const { botKey } = req.params;
        const status = getBotStatus(botKey);
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bots/:botKey/start', checkApiKey, async (req, res) => {
    try {
        const { botKey } = req.params;
        const result = await startBotProcess(botKey);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bots/:botKey/stop', checkApiKey, async (req, res) => {
    try {
        const { botKey } = req.params;
        const result = await stopBotProcess(botKey);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bots/:botKey/restart', checkApiKey, async (req, res) => {
    try {
        const { botKey } = req.params;
        
        if (runningBots.has(botKey)) {
            await stopBotProcess(botKey);
            await new Promise(r => setTimeout(r, 2000));
        }
        
        const result = await startBotProcess(botKey);
        res.json({ ...result, restarted: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bots/:botKey', checkApiKey, async (req, res) => {
    try {
        const { botKey } = req.params;
        const found = findBotPath(botKey);
        
        if (!found) {
            console.log(`[BotManager] Delete request: Bot ${botKey} not found`);
            return res.status(404).json({ error: `Bot ${botKey} not found` });
        }
        
        if (runningBots.has(botKey)) {
            console.log(`[BotManager] Stopping bot: ${botKey} before deletion`);
            await stopBotProcess(botKey);
            await new Promise(r => setTimeout(r, 3000));
        }
        
        const botPath = found.botPath;
        console.log(`[BotManager] Attempting to delete bot at: ${botPath}`);
        
        if (fs.existsSync(botPath)) {
            fs.rmSync(botPath, { recursive: true, force: true });
            await new Promise(r => setTimeout(r, 500));
            
            if (fs.existsSync(botPath)) {
                console.error(`[BotManager] FAILED: Bot directory still exists after deletion attempt: ${botPath}`);
                return res.status(500).json({ error: `Failed to completely delete bot directory. Directory still exists after deletion attempt.` });
            }
        }
        
        console.log(`[BotManager] Successfully deleted bot: ${botKey}`);
        res.json({ success: true, message: `Bot ${botKey} deleted successfully` });
    } catch (err) {
        console.error(`[BotManager] Delete error for ${req.params.botKey}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bots/:botKey/expiration', checkApiKey, async (req, res) => {
    try {
        const { botKey } = req.params;
        const { expirationDate, expirationDays, expirationSetBy } = req.body;
        const found = findBotPath(botKey);
        
        if (!found) {
            return res.status(404).json({ error: `Bot ${botKey} not found` });
        }
        
        const metadataPath = path.join(found.botPath, 'expiration.json');
        const metadata = {
            expirationDate,
            expirationDays,
            expirationSetAt: new Date().toISOString(),
            expirationSetBy: expirationSetBy || 'system'
        };
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`[Expiration] Updated expiration for ${botKey}: ${expirationDays} days`);
        
        res.json({ success: true, message: `Expiration updated for ${botKey}`, metadata });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bots/:botKey/expiration', checkApiKey, (req, res) => {
    try {
        const { botKey } = req.params;
        const found = findBotPath(botKey);
        
        if (!found) {
            return res.status(404).json({ error: `Bot ${botKey} not found` });
        }
        
        const metadataPath = path.join(found.botPath, 'expiration.json');
        
        if (!fs.existsSync(metadataPath)) {
            return res.json({ success: true, hasExpiration: false });
        }
        
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const expirationTime = new Date(metadata.expirationDate).getTime();
        const remaining = expirationTime - Date.now();
        
        res.json({ 
            success: true, 
            hasExpiration: true,
            ...metadata,
            isExpired: remaining <= 0,
            remainingMs: remaining,
            remainingDays: Math.floor(remaining / (1000 * 60 * 60 * 24))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', checkApiKey, (req, res) => {
    const { logs, source, timestamp } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
        return res.status(400).json({ error: 'Invalid logs format' });
    }
    
    const data = loadLogs();
    
    logs.forEach(log => {
        data.logs.push({
            ...log,
            source: source || 'unknown',
            receivedAt: new Date().toISOString()
        });
        
        const logLine = `[${log.timestamp}] [${log.botKey}] ${log.level.toUpperCase()}: ${log.message}`;
        if (log.level === 'error') {
            console.error(logLine);
        } else {
            console.log(logLine);
        }
    });
    
    saveLogs(data);
    
    res.json({ 
        success: true, 
        message: `Received ${logs.length} logs`,
        totalLogs: data.logs.length
    });
});

app.get('/api/logs', checkApiKey, (req, res) => {
    const data = loadLogs();
    const { botKey, level, limit = 100 } = req.query;
    
    let filteredLogs = data.logs;
    
    if (botKey) {
        filteredLogs = filteredLogs.filter(l => l.botKey === botKey);
    }
    if (level) {
        filteredLogs = filteredLogs.filter(l => l.level === level);
    }
    
    filteredLogs = filteredLogs.slice(-parseInt(limit));
    
    res.json({ logs: filteredLogs, total: data.logs.length });
});

app.post('/api/message', checkApiKey, (req, res) => {
    const { message, from } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    const timestamp = new Date().toISOString();
    console.log('');
    console.log('='.repeat(60));
    console.log(`  MESSAGE FROM: ${from || 'Main Replit'}`);
    console.log('='.repeat(60));
    console.log(`  ${message}`);
    console.log('='.repeat(60));
    console.log(`  Received at: ${timestamp}`);
    console.log('='.repeat(60));
    console.log('');
    
    res.json({ success: true, message: 'Message displayed on console', timestamp });
});

app.post('/api/update-template', checkApiKey, async (req, res) => {
    try {
        const { botType = 'ticket', files, instructions } = req.body;
        
        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }
        
        const templatePath = path.join(BOTS_BASE_DIR, botType, 'template');
        
        fs.mkdirSync(templatePath, { recursive: true });
        
        console.log('');
        console.log('='.repeat(60));
        console.log(`  TEMPLATE UPDATE RECEIVED: ${botType}`);
        console.log('='.repeat(60));
        console.log(`  Files: ${Object.keys(files).length}`);
        if (instructions) {
            console.log(`  Instructions: ${instructions}`);
        }
        console.log('='.repeat(60));
        
        writeFilesRecursively(templatePath, files);
        
        console.log(`[Template] Updated ${Object.keys(files).length} files in ${botType}/template`);
        console.log(`[Template] Installing dependencies...`);
        
        try {
            await installDependencies(templatePath);
            console.log(`[Template] Dependencies installed successfully`);
        } catch (depErr) {
            console.log(`[Template] Note: ${depErr.message}`);
        }
        
        console.log('='.repeat(60));
        console.log(`  Template update complete!`);
        console.log('='.repeat(60));
        console.log('');
        
        res.json({ 
            success: true, 
            message: `Template ${botType} updated with ${Object.keys(files).length} files`,
            templatePath,
            filesUpdated: Object.keys(files)
        });
        
    } catch (err) {
        console.error('[Template Update] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Internal server error' });
});

ensureBotsDir();
ensureLogDir();

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('  Secondary Replit Bot Hosting Server');
    console.log('='.repeat(60));
    console.log(`  Server running on port ${PORT}`);
    console.log(`  API Key: ${API_KEY.substring(0, 15)}...`);
    console.log(`  Bots directory: ${BOTS_BASE_DIR}`);
    console.log('='.repeat(60));
    console.log('  Ready to receive bot deployments!');
    console.log('='.repeat(60));
});
