const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.ticketsFile = path.join(this.dataDir, 'tickets.json');
        this.configFile = path.join(this.dataDir, 'serverConfig.json');
        this.staffStatsFile = path.join(this.dataDir, 'staffStats.json');
        this.userCooldownsFile = path.join(this.dataDir, 'userCooldowns.json');
        this.feedbackFile = path.join(this.dataDir, 'feedback.json');
        this.transcriptsFile = path.join(this.dataDir, 'transcripts.json');
        this.analyticsFile = path.join(this.dataDir, 'analytics.json');
        this.tagsFile = path.join(this.dataDir, 'tags.json');
        this.notesFile = path.join(this.dataDir, 'staffNotes.json');
        this.maintenanceFile = path.join(this.dataDir, 'maintenance.json');
        this.botInvitesFile = path.join(this.dataDir, 'botInvites.json');
        
        this.ensureDataDirectory();
        this.initializeFiles();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    initializeFiles() {
        const files = [
            { path: this.ticketsFile, default: {} },
            { path: this.configFile, default: {} },
            { path: this.staffStatsFile, default: {} },
            { path: this.userCooldownsFile, default: {} },
            { path: this.feedbackFile, default: [] },
            { path: this.transcriptsFile, default: {} },
            { path: this.analyticsFile, default: {} },
            { path: this.tagsFile, default: {} },
            { path: this.notesFile, default: {} },
            { path: this.maintenanceFile, default: { enabled: false, enabledBy: null, enabledAt: null } },
            { path: this.botInvitesFile, default: {} }
        ];

        files.forEach(file => {
            if (!fs.existsSync(file.path)) {
                fs.writeFileSync(file.path, JSON.stringify(file.default, null, 2));
            }
        });
    }

    readJSON(filePath) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            console.error(`Error reading ${filePath}:`, error);
            return null;
        }
    }

    writeJSON(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error writing ${filePath}:`, error);
            return false;
        }
    }

    getTicket(guildId, channelId) {
        const tickets = this.readJSON(this.ticketsFile);
        return tickets[`${guildId}_${channelId}`] || null;
    }

    createTicket(guildId, channelId, ticketData) {
        const tickets = this.readJSON(this.ticketsFile);
        tickets[`${guildId}_${channelId}`] = {
            ...ticketData,
            createdAt: Date.now(),
            status: 'open'
        };
        return this.writeJSON(this.ticketsFile, tickets);
    }

    updateTicket(guildId, channelId, updates) {
        const tickets = this.readJSON(this.ticketsFile);
        const key = `${guildId}_${channelId}`;
        if (tickets[key]) {
            tickets[key] = { ...tickets[key], ...updates };
            return this.writeJSON(this.ticketsFile, tickets);
        }
        return false;
    }

    closeTicket(guildId, channelId, closedBy) {
        return this.updateTicket(guildId, channelId, {
            status: 'closed',
            closedAt: Date.now(),
            closedBy
        });
    }

    getUserActiveTickets(guildId, userId) {
        const tickets = this.readJSON(this.ticketsFile);
        return Object.entries(tickets)
            .filter(([key, ticket]) => 
                key.startsWith(`${guildId}_`) && 
                ticket.userId === userId && 
                ticket.status === 'open'
            )
            .map(([key, ticket]) => ({ channelId: key.split('_')[1], ...ticket }));
    }

    getAllOpenTickets(guildId) {
        const tickets = this.readJSON(this.ticketsFile);
        return Object.entries(tickets)
            .filter(([key, ticket]) => 
                key.startsWith(`${guildId}_`) && 
                ticket.status === 'open'
            )
            .map(([key, ticket]) => ({ channelId: key.split('_')[1], ...ticket }));
    }

    getServerConfig(guildId) {
        const configs = this.readJSON(this.configFile);
        return configs[guildId] || {
            logChannel: null,
            staffRoles: [],
            categories: {},
            enabledCategories: [],
            customCategories: {},
            ticketCounter: 0,
            cooldownEnabled: true,
            panelMessageId: null,
            panelChannelId: null,
            panelImage: null,
            statusOnline: true,
            language: 'en',
            slaEnabled: true,
            slaTimeMinutes: 30,
            voiceTicketsEnabled: true,
            multiTicketsEnabled: true,
            maxTicketsPerUser: 3,
            staffAlertsEnabled: true,
            queueEnabled: true
        };
    }

    updateServerConfig(guildId, updates) {
        const configs = this.readJSON(this.configFile);
        configs[guildId] = { ...this.getServerConfig(guildId), ...updates };
        return this.writeJSON(this.configFile, configs);
    }

    incrementTicketCounter(guildId) {
        const config = this.getServerConfig(guildId);
        config.ticketCounter++;
        this.updateServerConfig(guildId, { ticketCounter: config.ticketCounter });
        return config.ticketCounter;
    }

    getStaffStats(guildId, userId) {
        const stats = this.readJSON(this.staffStatsFile);
        const key = `${guildId}_${userId}`;
        return stats[key] || {
            ticketsHandled: 0,
            totalResponseTime: 0,
            lastTicketClosed: null
        };
    }

    updateStaffStats(guildId, userId, updates) {
        const stats = this.readJSON(this.staffStatsFile);
        const key = `${guildId}_${userId}`;
        stats[key] = { ...this.getStaffStats(guildId, userId), ...updates };
        return this.writeJSON(this.staffStatsFile, stats);
    }

    incrementStaffTickets(guildId, userId, responseTime) {
        const stats = this.getStaffStats(guildId, userId);
        stats.ticketsHandled++;
        stats.totalResponseTime += responseTime;
        stats.lastTicketClosed = Date.now();
        this.updateStaffStats(guildId, userId, stats);
    }

    getTopStaff(guildId, limit = 10) {
        const stats = this.readJSON(this.staffStatsFile);
        return Object.entries(stats)
            .filter(([key]) => key.startsWith(`${guildId}_`))
            .map(([key, stat]) => ({ userId: key.split('_')[1], ...stat }))
            .sort((a, b) => b.ticketsHandled - a.ticketsHandled)
            .slice(0, limit);
    }

    setCooldown(guildId, userId) {
        const cooldowns = this.readJSON(this.userCooldownsFile);
        cooldowns[`${guildId}_${userId}`] = Date.now();
        return this.writeJSON(this.userCooldownsFile, cooldowns);
    }

    getCooldown(guildId, userId) {
        const cooldowns = this.readJSON(this.userCooldownsFile);
        return cooldowns[`${guildId}_${userId}`] || null;
    }

    addFeedback(guildId, userId, ticketType, rating, comment) {
        const feedback = this.readJSON(this.feedbackFile);
        feedback.push({
            guildId,
            userId,
            ticketType,
            rating,
            comment,
            timestamp: Date.now()
        });
        return this.writeJSON(this.feedbackFile, feedback);
    }

    getTicketStats(guildId) {
        const tickets = this.readJSON(this.ticketsFile);
        const guildTickets = Object.entries(tickets)
            .filter(([key]) => key.startsWith(`${guildId}_`))
            .map(([, ticket]) => ticket);

        const now = Date.now();
        const oneDayAgo = now - 86400000;

        const openTickets = guildTickets.filter(t => t.status === 'open').length;
        const closedToday = guildTickets.filter(t => 
            t.status === 'closed' && t.closedAt > oneDayAgo
        ).length;
        const totalTickets = guildTickets.length;

        const closedTickets = guildTickets.filter(t => t.status === 'closed' && t.closedAt);
        const avgCloseTime = closedTickets.length > 0
            ? closedTickets.reduce((sum, t) => sum + (t.closedAt - t.createdAt), 0) / closedTickets.length
            : 0;

        return {
            openTickets,
            closedToday,
            totalTickets,
            avgCloseTime
        };
    }

    addTag(guildId, channelId, tag) {
        const tags = this.readJSON(this.tagsFile);
        const key = `${guildId}_${channelId}`;
        if (!tags[key]) tags[key] = [];
        if (!tags[key].includes(tag)) {
            tags[key].push(tag);
            this.writeJSON(this.tagsFile, tags);
        }
        return tags[key];
    }

    removeTag(guildId, channelId, tag) {
        const tags = this.readJSON(this.tagsFile);
        const key = `${guildId}_${channelId}`;
        if (tags[key]) {
            tags[key] = tags[key].filter(t => t !== tag);
            this.writeJSON(this.tagsFile, tags);
        }
        return tags[key] || [];
    }

    getTags(guildId, channelId) {
        const tags = this.readJSON(this.tagsFile);
        return tags[`${guildId}_${channelId}`] || [];
    }

    addStaffNote(guildId, channelId, staffId, note) {
        const notes = this.readJSON(this.notesFile);
        const key = `${guildId}_${channelId}`;
        if (!notes[key]) notes[key] = [];
        notes[key].push({
            staffId,
            note,
            timestamp: Date.now()
        });
        return this.writeJSON(this.notesFile, notes);
    }

    getStaffNotes(guildId, channelId) {
        const notes = this.readJSON(this.notesFile);
        return notes[`${guildId}_${channelId}`] || [];
    }

    saveTranscript(guildId, channelId, messages) {
        const transcripts = this.readJSON(this.transcriptsFile);
        transcripts[`${guildId}_${channelId}`] = {
            messages,
            savedAt: Date.now()
        };
        return this.writeJSON(this.transcriptsFile, transcripts);
    }

    getTranscript(guildId, channelId) {
        const transcripts = this.readJSON(this.transcriptsFile);
        return transcripts[`${guildId}_${channelId}`] || null;
    }

    getUserTicketHistory(guildId, userId, limit = 10) {
        const tickets = this.readJSON(this.ticketsFile);
        return Object.entries(tickets)
            .filter(([key, ticket]) => 
                key.startsWith(`${guildId}_`) && ticket.userId === userId
            )
            .map(([key, ticket]) => ({ channelId: key.split('_')[1], ...ticket }))
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }

    searchTickets(guildId, filters = {}) {
        const tickets = this.readJSON(this.ticketsFile);
        let results = Object.entries(tickets)
            .filter(([key]) => key.startsWith(`${guildId}_`))
            .map(([key, ticket]) => ({ channelId: key.split('_')[1], ...ticket }));

        if (filters.userId) {
            results = results.filter(t => t.userId === filters.userId);
        }
        if (filters.status) {
            results = results.filter(t => t.status === filters.status);
        }
        if (filters.type) {
            results = results.filter(t => t.type === filters.type);
        }
        if (filters.claimed) {
            results = results.filter(t => t.claimed === filters.claimed);
        }
        if (filters.priority) {
            results = results.filter(t => t.priority === filters.priority);
        }
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            results = results.filter(t => 
                t.reason?.toLowerCase().includes(keyword) ||
                t.description?.toLowerCase().includes(keyword)
            );
        }
        if (filters.startDate) {
            results = results.filter(t => t.createdAt >= filters.startDate);
        }
        if (filters.endDate) {
            results = results.filter(t => t.createdAt <= filters.endDate);
        }

        return results.sort((a, b) => b.createdAt - a.createdAt);
    }

    getQueuePosition(guildId, channelId) {
        const openTickets = this.getAllOpenTickets(guildId);
        const unclaimedTickets = openTickets
            .filter(t => !t.claimed)
            .sort((a, b) => a.createdAt - b.createdAt);
        
        const position = unclaimedTickets.findIndex(t => t.channelId === channelId);
        return position >= 0 ? position + 1 : 0;
    }

    getAverageWaitTime(guildId) {
        const tickets = this.readJSON(this.ticketsFile);
        const closedTickets = Object.values(tickets)
            .filter(t => t.status === 'closed' && t.claimedAt && t.createdAt);
        
        if (closedTickets.length === 0) return 0;

        const totalWaitTime = closedTickets.reduce((sum, t) => {
            return sum + (t.claimedAt - t.createdAt);
        }, 0);

        return totalWaitTime / closedTickets.length;
    }

    getUnclaimedTicketsOlderThan(guildId, minutes) {
        const threshold = Date.now() - (minutes * 60000);
        const tickets = this.getAllOpenTickets(guildId);
        return tickets.filter(t => !t.claimed && t.createdAt < threshold);
    }

    logAnalytics(guildId, event, data) {
        const analytics = this.readJSON(this.analyticsFile);
        if (!analytics[guildId]) analytics[guildId] = [];
        
        analytics[guildId].push({
            event,
            data,
            timestamp: Date.now()
        });

        if (analytics[guildId].length > 10000) {
            analytics[guildId] = analytics[guildId].slice(-5000);
        }

        return this.writeJSON(this.analyticsFile, analytics);
    }

    getAnalytics(guildId, days = 30) {
        const analytics = this.readJSON(this.analyticsFile);
        const guildAnalytics = analytics[guildId] || [];
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        return guildAnalytics.filter(a => a.timestamp >= cutoff);
    }

    getTicketsByDateRange(guildId, startDate, endDate) {
        const tickets = this.readJSON(this.ticketsFile);
        return Object.entries(tickets)
            .filter(([key, ticket]) => 
                key.startsWith(`${guildId}_`) &&
                ticket.createdAt >= startDate &&
                ticket.createdAt <= endDate
            )
            .map(([key, ticket]) => ({ channelId: key.split('_')[1], ...ticket }));
    }

    getRatingStats(guildId) {
        const feedback = this.readJSON(this.feedbackFile);
        const guildFeedback = feedback.filter(f => f.guildId === guildId && f.rating);
        
        if (guildFeedback.length === 0) {
            return { avgRating: 0, totalRatings: 0, distribution: {} };
        }

        const totalRating = guildFeedback.reduce((sum, f) => sum + f.rating, 0);
        const distribution = guildFeedback.reduce((dist, f) => {
            dist[f.rating] = (dist[f.rating] || 0) + 1;
            return dist;
        }, {});

        return {
            avgRating: totalRating / guildFeedback.length,
            totalRatings: guildFeedback.length,
            distribution
        };
    }

    getMaintenanceMode() {
        const maintenance = this.readJSON(this.maintenanceFile);
        return maintenance || { enabled: false, enabledBy: null, enabledAt: null, messages: {} };
    }

    setMaintenanceMode(enabled, userId = null, messages = {}) {
        const currentData = this.getMaintenanceMode();
        const maintenance = {
            enabled,
            enabledBy: enabled ? userId : null,
            enabledAt: enabled ? Date.now() : null,
            messages: enabled ? messages : {}
        };
        return this.writeJSON(this.maintenanceFile, maintenance);
    }

    // Bot Invite Tracking Methods
    trackBotInvite(guildId, inviteData) {
        const invites = this.readJSON(this.botInvitesFile);
        invites[guildId] = {
            ...invites[guildId],
            ...inviteData,
            guildId,
            createdAt: invites[guildId]?.createdAt || Date.now(),
            lastReinviteAt: Date.now()
        };
        return this.writeJSON(this.botInvitesFile, invites);
    }

    getBotInvite(guildId) {
        const invites = this.readJSON(this.botInvitesFile);
        return invites[guildId] || null;
    }

    updateBotReinvite(guildId) {
        const invites = this.readJSON(this.botInvitesFile);
        if (invites[guildId]) {
            invites[guildId].lastReinviteAt = Date.now();
            return this.writeJSON(this.botInvitesFile, invites);
        }
        return false;
    }

    removeBotInvite(guildId) {
        const invites = this.readJSON(this.botInvitesFile);
        delete invites[guildId];
        return this.writeJSON(this.botInvitesFile, invites);
    }

    getExpiredBotInvites(daysThreshold = 3) {
        const invites = this.readJSON(this.botInvitesFile);
        const now = Date.now();
        const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;

        return Object.entries(invites)
            .filter(([guildId, data]) => {
                const daysSinceReinvite = (now - data.lastReinviteAt) / (24 * 60 * 60 * 1000);
                return daysSinceReinvite >= daysThreshold;
            })
            .map(([guildId, data]) => ({ guildId, ...data }));
    }

    getAllBotInvites() {
        return this.readJSON(this.botInvitesFile);
    }
}

module.exports = new Database();
