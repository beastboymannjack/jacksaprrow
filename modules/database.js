const fs = require('fs');
const path = require('path');

const DBS_DIR = path.join(process.cwd(), 'dbs');
const LOCAL_BOTS_FILE = path.join(DBS_DIR, 'local_bots.json');
const LOGS_FILE = path.join(DBS_DIR, 'activity_logs.json');

function ensureDbsDir() {
    if (!fs.existsSync(DBS_DIR)) {
        fs.mkdirSync(DBS_DIR, { recursive: true });
    }
}

function loadData(file, defaultData = null) {
    try {
        ensureDbsDir();
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) {
        console.error('[Database] Load error:', e.message);
    }
    if (defaultData) return defaultData;
    if (file === LOCAL_BOTS_FILE) return { bots: [] };
    if (file === LOGS_FILE) return { logs: [] };
    return { items: [] };
}

function saveData(file, data) {
    try {
        ensureDbsDir();
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('[Database] Save error:', e.message);
        return false;
    }
}

async function initDatabase() {
    ensureDbsDir();
    if (!fs.existsSync(LOCAL_BOTS_FILE)) {
        saveData(LOCAL_BOTS_FILE, { bots: [] });
    }
    if (!fs.existsSync(LOGS_FILE)) {
        saveData(LOGS_FILE, { logs: [] });
    }
    console.log('[Database] JSON file storage initialized successfully');
}

async function addLocalBot({ name, botPath, botType, botId, ownerId, config }) {
    try {
        const data = loadData(LOCAL_BOTS_FILE);
        if (!data.bots) data.bots = [];
        
        const existingIndex = data.bots.findIndex(b => b.name === name);
        const botRecord = {
            id: existingIndex >= 0 ? data.bots[existingIndex].id : Date.now(),
            name,
            bot_path: botPath,
            bot_type: botType || 'System Bot',
            bot_id: botId,
            owner_id: ownerId,
            status: 'stopped',
            created_at: existingIndex >= 0 ? data.bots[existingIndex].created_at : new Date().toISOString(),
            updated_at: new Date().toISOString(),
            config: config || {}
        };
        
        if (existingIndex >= 0) {
            data.bots[existingIndex] = botRecord;
        } else {
            data.bots.push(botRecord);
        }
        
        saveData(LOCAL_BOTS_FILE, data);
        return botRecord;
    } catch (err) {
        console.error('[Database] Error adding local bot:', err);
        return null;
    }
}

async function updateLocalBotStatus(name, status) {
    try {
        const data = loadData(LOCAL_BOTS_FILE);
        if (!data.bots) data.bots = [];
        
        const botIndex = data.bots.findIndex(b => b.name === name);
        if (botIndex >= 0) {
            data.bots[botIndex].status = status;
            data.bots[botIndex].updated_at = new Date().toISOString();
            saveData(LOCAL_BOTS_FILE, data);
            return data.bots[botIndex];
        }
        return null;
    } catch (err) {
        console.error('[Database] Error updating bot status:', err);
        return null;
    }
}

async function getLocalBots() {
    try {
        const data = loadData(LOCAL_BOTS_FILE);
        if (!data.bots) return [];
        return data.bots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (err) {
        console.error('[Database] Error getting local bots:', err);
        return [];
    }
}

async function getLocalBotByName(name) {
    try {
        const data = loadData(LOCAL_BOTS_FILE);
        if (!data.bots) return null;
        return data.bots.find(b => b.name === name) || null;
    } catch (err) {
        console.error('[Database] Error getting bot by name:', err);
        return null;
    }
}

async function deleteLocalBot(name) {
    try {
        const data = loadData(LOCAL_BOTS_FILE);
        if (!data.bots) data.bots = [];
        data.bots = data.bots.filter(b => b.name !== name);
        saveData(LOCAL_BOTS_FILE, data);
        return true;
    } catch (err) {
        console.error('[Database] Error deleting local bot:', err);
        return false;
    }
}

async function addDeploymentLog({ botName, action, status, message, userId }) {
    try {
        const data = loadData(LOGS_FILE);
        if (!data.logs) data.logs = [];
        
        data.logs.unshift({
            id: Date.now(),
            bot_name: botName,
            action,
            status,
            message,
            user_id: userId,
            created_at: new Date().toISOString()
        });
        
        if (data.logs.length > 500) {
            data.logs = data.logs.slice(0, 500);
        }
        
        saveData(LOGS_FILE, data);
    } catch (err) {
        console.error('[Database] Error adding deployment log:', err);
    }
}

async function getDeploymentLogs(limit = 50) {
    try {
        const data = loadData(LOGS_FILE);
        if (!data.logs) return [];
        return data.logs.slice(0, limit);
    } catch (err) {
        console.error('[Database] Error getting deployment logs:', err);
        return [];
    }
}

// Invite tracking
const INVITES_FILE = path.join(DBS_DIR, 'invite_tracking.json');

async function trackBotCreationInvite(userId, botName, invitesRequired) {
    try {
        let data = loadData(INVITES_FILE, { creations: [] });
        if (!data.creations) data.creations = [];
        
        data.creations.push({
            userId,
            botName,
            invitesRequired,
            createdAt: new Date().toISOString()
        });
        
        saveData(INVITES_FILE, data);
        return true;
    } catch (err) {
        console.error('[Database] Error tracking bot creation invite:', err);
        return false;
    }
}

async function getUserBotCreations(userId) {
    try {
        const data = loadData(INVITES_FILE, { creations: [] });
        if (!data.creations) return [];
        return data.creations.filter(c => c.userId === userId);
    } catch (err) {
        console.error('[Database] Error getting user bot creations:', err);
        return [];
    }
}

module.exports = {
    initDatabase,
    addLocalBot,
    updateLocalBotStatus,
    getLocalBots,
    getLocalBotByName,
    deleteLocalBot,
    addDeploymentLog,
    getDeploymentLogs,
    trackBotCreationInvite,
    getUserBotCreations
};
