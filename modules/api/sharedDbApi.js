const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = function(app, client) {
    const API_KEY = process.env.SHARED_DB_API_KEY || 'your-secret-key-12345';
    const DB_FILE = path.join(process.cwd(), 'dbs', 'shared_db.json');

    const checkApiKey = (req, res, next) => {
        const key = req.headers['x-api-key'];
        if (key !== API_KEY) {
            console.log(`[SharedDB API] Unauthorized request - Invalid API key`);
            return res.status(401).json({ error: 'Unauthorized', message: 'Invalid API key' });
        }
        next();
    };

    const loadDB = () => {
        try {
            if (fs.existsSync(DB_FILE)) {
                return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            }
        } catch (err) {
            console.error('[SharedDB API] Failed to load DB:', err.message);
        }
        return { bots: {}, replits: {}, stats: { totalRequests: 0, lastAccess: null } };
    };

    const saveDB = (data) => {
        try {
            const dir = path.dirname(DB_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
            return true;
        } catch (err) {
            console.error('[SharedDB API] Failed to save DB:', err.message);
            return false;
        }
    };

    app.get('/api/health', (req, res) => {
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            botReady: client && client.user ? true : false
        });
    });

    app.get('/api/bots/:botId', checkApiKey, (req, res) => {
        const db = loadDB();
        const bot = db.bots[req.params.botId];
        
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        res.json(bot);
    });

    app.post('/api/bots/:botId', checkApiKey, (req, res) => {
        const db = loadDB();
        db.bots[req.params.botId] = {
            ...db.bots[req.params.botId],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        db.stats.totalRequests++;
        db.stats.lastAccess = new Date().toISOString();
        
        if (saveDB(db)) {
            console.log(`[SharedDB API] Bot ${req.params.botId} updated`);
            res.json({ success: true, bot: db.bots[req.params.botId] });
        } else {
            res.status(500).json({ error: 'Failed to save bot' });
        }
    });

    app.delete('/api/bots/:botId', checkApiKey, (req, res) => {
        const db = loadDB();
        
        if (!db.bots[req.params.botId]) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        delete db.bots[req.params.botId];
        
        if (saveDB(db)) {
            console.log(`[SharedDB API] Bot ${req.params.botId} deleted`);
            res.json({ success: true, message: 'Bot deleted' });
        } else {
            res.status(500).json({ error: 'Failed to delete bot' });
        }
    });

    app.get('/api/bots', checkApiKey, (req, res) => {
        const db = loadDB();
        res.json(db.bots);
    });

    app.get('/api/replits/:replitId', checkApiKey, (req, res) => {
        const db = loadDB();
        const replit = db.replits[req.params.replitId] || { 
            id: req.params.replitId,
            status: 'unknown',
            bots_running: 0
        };
        res.json(replit);
    });

    app.post('/api/replits/:replitId/status', checkApiKey, (req, res) => {
        const db = loadDB();
        const replitId = req.params.replitId;
        
        db.replits[replitId] = {
            ...db.replits[replitId],
            ...req.body,
            id: replitId,
            lastHeartbeat: new Date().toISOString()
        };
        
        db.stats.totalRequests++;
        db.stats.lastAccess = new Date().toISOString();
        
        if (saveDB(db)) {
            console.log(`[SharedDB API] Replit ${replitId} status updated: ${req.body.status || 'unknown'}, ${req.body.bots_running || 0} bots`);
            res.json({ success: true, replit: db.replits[replitId] });
        } else {
            res.status(500).json({ error: 'Failed to update replit' });
        }
    });

    app.get('/api/replits', checkApiKey, (req, res) => {
        const db = loadDB();
        res.json(db.replits);
    });

    app.get('/api/stats', checkApiKey, (req, res) => {
        const db = loadDB();
        const botsCount = Object.keys(db.bots).length;
        const replitsCount = Object.keys(db.replits).length;
        const onlineReplits = Object.values(db.replits).filter(r => r.status === 'online').length;
        const runningBots = Object.values(db.bots).filter(b => b.status === 'running').length;
        
        res.json({
            bots: {
                total: botsCount,
                running: runningBots,
                stopped: botsCount - runningBots
            },
            replits: {
                total: replitsCount,
                online: onlineReplits,
                offline: replitsCount - onlineReplits
            },
            stats: db.stats
        });
    });

    app.post('/api/bots/:botId/assign', checkApiKey, (req, res) => {
        const db = loadDB();
        const { replitId } = req.body;
        
        if (!replitId) {
            return res.status(400).json({ error: 'replitId is required' });
        }

        const onlineReplits = Object.entries(db.replits)
            .filter(([id, r]) => r.status === 'online')
            .sort((a, b) => (a[1].bots_running || 0) - (b[1].bots_running || 0));
        
        let targetReplit = replitId;
        if (replitId === 'auto' && onlineReplits.length > 0) {
            targetReplit = onlineReplits[0][0];
        }
        
        db.bots[req.params.botId] = {
            ...db.bots[req.params.botId],
            ...req.body,
            replit: targetReplit,
            status: 'pending',
            assignedAt: new Date().toISOString()
        };
        
        if (saveDB(db)) {
            console.log(`[SharedDB API] Bot ${req.params.botId} assigned to ${targetReplit}`);
            res.json({ success: true, bot: db.bots[req.params.botId], assignedTo: targetReplit });
        } else {
            res.status(500).json({ error: 'Failed to assign bot' });
        }
    });

    console.log('[SharedDB API] Shared Database API endpoints loaded'.green);
    console.log(`[SharedDB API] API Key configured: ${API_KEY.substring(0, 5)}...`.cyan);
};
