const express = require('express');
const botStatusMonitor = require('../botStatusMonitor');
const database = require('../database');

const router = express.Router();

router.get('/all', async (req, res) => {
    try {
        const { ownerId, status } = req.query;
        const filter = {};
        if (ownerId) filter.ownerId = ownerId;
        if (status) filter.status = status;
        
        const bots = botStatusMonitor.getAllStatuses(filter);
        const stats = botStatusMonitor.getStatistics();
        
        res.json({ success: true, statistics: stats, bots: bots.map(bot => ({
            name: bot.name,
            status: bot.status || 'unknown',
            template: bot.template || 'Unknown',
            ownerId: bot.ownerId,
            createdAt: bot.createdAt,
            lastUpdated: bot.lastUpdated,
            uptime: bot.uptime,
            errorCount: bot.errors?.length || 0,
            location: bot.location || 'primary'
        }))});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:botName', async (req, res) => {
    try {
        const botStatus = botStatusMonitor.getStatus(req.params.botName);
        if (!botStatus) return res.status(404).json({ error: 'Bot not found' });
        
        const errors = botStatusMonitor.getErrors(req.params.botName, 5);
        const history = botStatus.statusHistory?.slice(-10) || [];
        
        res.json({ success: true, bot: {
            name: botStatus.name,
            status: botStatus.status || 'unknown',
            template: botStatus.template,
            ownerId: botStatus.ownerId,
            createdAt: botStatus.createdAt,
            lastUpdated: botStatus.lastUpdated,
            uptime: botStatus.uptime,
            errors, statusHistory: history
        }});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:botName', express.json(), async (req, res) => {
    try {
        const { status, metadata } = req.body;
        if (!status) return res.status(400).json({ error: 'Status required' });
        const updated = botStatusMonitor.updateStatus(req.params.botName, status, metadata);
        res.json({ success: true, bot: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/system/statistics', async (req, res) => {
    try {
        const stats = botStatusMonitor.getStatistics();
        const allBots = await database.getLocalBots();
        res.json({ success: true, statistics: { ...stats, totalBots: allBots.length, deployedBots: stats.total }});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
