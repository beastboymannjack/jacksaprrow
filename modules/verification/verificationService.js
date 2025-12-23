const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const mainconfig = require("../../mainconfig.js");

const DBS_DIR = path.join(process.cwd(), 'dbs');
const VERIFICATION_FILE = path.join(DBS_DIR, 'verifications.json');
const APPEALS_FILE = path.join(DBS_DIR, 'appeals.json');

class VerificationService {
    constructor(client) {
        this.client = client;
        this.ensureFiles();
    }

    ensureFiles() {
        if (!fs.existsSync(DBS_DIR)) {
            fs.mkdirSync(DBS_DIR, { recursive: true });
        }
        if (!fs.existsSync(VERIFICATION_FILE)) {
            fs.writeFileSync(VERIFICATION_FILE, JSON.stringify({ verifications: [], stats: {} }, null, 2));
        }
        if (!fs.existsSync(APPEALS_FILE)) {
            fs.writeFileSync(APPEALS_FILE, JSON.stringify({ appeals: [] }, null, 2));
        }
    }

    loadVerifications() {
        try {
            return JSON.parse(fs.readFileSync(VERIFICATION_FILE, 'utf8'));
        } catch (e) {
            return { verifications: [], stats: {} };
        }
    }

    saveVerifications(data) {
        fs.writeFileSync(VERIFICATION_FILE, JSON.stringify(data, null, 2));
    }

    loadAppeals() {
        try {
            return JSON.parse(fs.readFileSync(APPEALS_FILE, 'utf8'));
        } catch (e) {
            return { appeals: [] };
        }
    }

    saveAppeals(data) {
        fs.writeFileSync(APPEALS_FILE, JSON.stringify(data, null, 2));
    }

    getConfig() {
        return mainconfig.YouTubeVerification || {
            VerificationChannelID: "",
            CodeAccessRoleID: "",
            LoggingChannelID: "",
            ChannelName: "deadloom",
            CooldownHours: 24,
            MaxFailuresBeforeAppeal: 3,
            AppealCooldownDays: 7
        };
    }

    hasStaffRole(member) {
        const staffRoles = [
            mainconfig.ServerRoles?.FounderId,
            mainconfig.ServerRoles?.OwnerRoleId,
            mainconfig.ServerRoles?.CoOwnerRoleId,
            mainconfig.ServerRoles?.AdminRoleId,
            mainconfig.ServerRoles?.ModRoleId,
            mainconfig.ServerRoles?.ChiefSupporterRoleId,
            mainconfig.ServerRoles?.SupporterRoleId
        ].filter(Boolean);

        return staffRoles.some(roleId => member.roles.cache.has(roleId)) || 
               member.permissions.has("Administrator");
    }

    async addVerification(userId, status, imageUrl, reviewerId = null, notes = "") {
        const data = this.loadVerifications();
        const verification = {
            id: Date.now().toString(),
            userId,
            status,
            imageUrl,
            reviewerId,
            notes,
            timestamp: new Date().toISOString(),
            channelName: this.getConfig().ChannelName
        };
        data.verifications.push(verification);

        if (!data.stats[userId]) {
            data.stats[userId] = { total: 0, approved: 0, denied: 0, pending: 0 };
        }
        data.stats[userId].total++;
        if (status === 'approved') data.stats[userId].approved++;
        if (status === 'denied') data.stats[userId].denied++;
        if (status === 'pending') data.stats[userId].pending++;

        this.saveVerifications(data);
        return verification;
    }

    async updateVerification(verificationId, status, reviewerId, notes = "") {
        const data = this.loadVerifications();
        const index = data.verifications.findIndex(v => v.id === verificationId);
        if (index === -1) return null;

        const oldStatus = data.verifications[index].status;
        const userId = data.verifications[index].userId;

        data.verifications[index].status = status;
        data.verifications[index].reviewerId = reviewerId;
        data.verifications[index].notes = notes;
        data.verifications[index].reviewedAt = new Date().toISOString();

        if (data.stats[userId]) {
            if (oldStatus === 'pending') data.stats[userId].pending--;
            if (status === 'approved') data.stats[userId].approved++;
            if (status === 'denied') data.stats[userId].denied++;
        }

        this.saveVerifications(data);
        return data.verifications[index];
    }

    getUserVerifications(userId) {
        const data = this.loadVerifications();
        return data.verifications.filter(v => v.userId === userId);
    }

    getUserStats(userId) {
        const data = this.loadVerifications();
        return data.stats[userId] || { total: 0, approved: 0, denied: 0, pending: 0 };
    }

    getAllVerifications(limit = 50) {
        const data = this.loadVerifications();
        return data.verifications.slice(-limit).reverse();
    }

    getPendingVerifications() {
        const data = this.loadVerifications();
        return data.verifications.filter(v => v.status === 'pending');
    }

    getFailedCount(userId) {
        const data = this.loadVerifications();
        return data.verifications.filter(v => v.userId === userId && v.status === 'denied').length;
    }

    canAppeal(userId) {
        const config = this.getConfig();
        const failedCount = this.getFailedCount(userId);
        
        if (failedCount < config.MaxFailuresBeforeAppeal) {
            return { canAppeal: false, reason: `You need ${config.MaxFailuresBeforeAppeal} failed verifications to appeal. Current: ${failedCount}` };
        }

        const appeals = this.loadAppeals();
        const userAppeals = appeals.appeals.filter(a => a.userId === userId);
        const lastAppeal = userAppeals[userAppeals.length - 1];

        if (lastAppeal) {
            const lastAppealDate = new Date(lastAppeal.timestamp);
            const cooldownEnd = new Date(lastAppealDate.getTime() + (config.AppealCooldownDays * 24 * 60 * 60 * 1000));
            if (new Date() < cooldownEnd) {
                const daysLeft = Math.ceil((cooldownEnd - new Date()) / (24 * 60 * 60 * 1000));
                return { canAppeal: false, reason: `Appeal cooldown active. Try again in ${daysLeft} day(s).` };
            }
        }

        return { canAppeal: true, reason: null };
    }

    async createAppeal(userId, reason, imageUrl) {
        const appeals = this.loadAppeals();
        const appeal = {
            id: Date.now().toString(),
            userId,
            reason,
            imageUrl,
            status: 'pending',
            timestamp: new Date().toISOString(),
            reviewerId: null,
            reviewNotes: null,
            reviewedAt: null
        };
        appeals.appeals.push(appeal);
        this.saveAppeals(appeals);
        return appeal;
    }

    async updateAppeal(appealId, status, reviewerId, notes = "") {
        const appeals = this.loadAppeals();
        const index = appeals.appeals.findIndex(a => a.id === appealId);
        if (index === -1) return null;

        appeals.appeals[index].status = status;
        appeals.appeals[index].reviewerId = reviewerId;
        appeals.appeals[index].reviewNotes = notes;
        appeals.appeals[index].reviewedAt = new Date().toISOString();

        this.saveAppeals(appeals);
        return appeals.appeals[index];
    }

    getUserAppeals(userId) {
        const appeals = this.loadAppeals();
        return appeals.appeals.filter(a => a.userId === userId);
    }

    getPendingAppeals() {
        const appeals = this.loadAppeals();
        return appeals.appeals.filter(a => a.status === 'pending');
    }

    getAllAppeals(limit = 50) {
        const appeals = this.loadAppeals();
        return appeals.appeals.slice(-limit).reverse();
    }

    isOnCooldown(userId) {
        const config = this.getConfig();
        const userVerifications = this.getUserVerifications(userId);
        const lastVerification = userVerifications[userVerifications.length - 1];

        if (!lastVerification) return { onCooldown: false };

        const lastTime = new Date(lastVerification.timestamp);
        const cooldownEnd = new Date(lastTime.getTime() + (config.CooldownHours * 60 * 60 * 1000));

        if (new Date() < cooldownEnd) {
            const hoursLeft = Math.ceil((cooldownEnd - new Date()) / (60 * 60 * 1000));
            return { onCooldown: true, hoursLeft };
        }

        return { onCooldown: false };
    }

    isAlreadyVerified(userId, member = null) {
        const config = this.getConfig();
        
        if (member && config.CodeAccessRoleID) {
            if (!member.roles.cache.has(config.CodeAccessRoleID)) {
                return false;
            }
        }
        
        const data = this.loadVerifications();
        return data.verifications.some(v => v.userId === userId && v.status === 'approved');
    }

    revokeVerification(userId, revokerId = null, reason = '') {
        const data = this.loadVerifications();
        let revokedCount = 0;
        
        data.verifications.forEach((v, index) => {
            if (v.userId === userId && v.status === 'approved') {
                data.verifications[index].status = 'revoked';
                data.verifications[index].revokedAt = new Date().toISOString();
                data.verifications[index].revokedBy = revokerId;
                data.verifications[index].revokeReason = reason;
                revokedCount++;
            }
        });

        if (data.stats[userId] && revokedCount > 0) {
            data.stats[userId].approved = Math.max(0, data.stats[userId].approved - revokedCount);
        }

        this.saveVerifications(data);
        return revokedCount > 0;
    }

    clearUserVerifications(userId) {
        const data = this.loadVerifications();
        
        data.verifications = data.verifications.filter(v => v.userId !== userId);
        
        if (data.stats[userId]) {
            delete data.stats[userId];
        }

        this.saveVerifications(data);
        return true;
    }

    async analyzeScreenshot(imageUrl) {
        const config = this.getConfig();
        const channelName = config.ChannelName.toLowerCase();

        return {
            detected: true,
            confidence: 'manual_review',
            channelName: channelName,
            note: 'Screenshot submitted for manual staff review'
        };
    }

    generateVerificationEmbed(verification, user) {
        const statusColors = {
            'pending': '#FFA500',
            'approved': '#00FF00',
            'denied': '#FF0000'
        };

        const statusEmojis = {
            'pending': '⏳',
            'approved': '✅',
            'denied': '❌'
        };

        return new EmbedBuilder()
            .setColor(statusColors[verification.status] || '#5865F2')
            .setTitle(`${statusEmojis[verification.status]} Verification ${verification.status.toUpperCase()}`)
            .setThumbnail(user?.displayAvatarURL({ dynamic: true }) || null)
            .addFields(
                { name: '👤 User', value: `<@${verification.userId}>`, inline: true },
                { name: '📊 Status', value: verification.status.toUpperCase(), inline: true },
                { name: '📺 Channel', value: verification.channelName || 'deadloom', inline: true }
            )
            .setImage(verification.imageUrl)
            .setTimestamp(new Date(verification.timestamp))
            .setFooter({ text: `Verification ID: ${verification.id}` });
    }

    generateAppealEmbed(appeal, user) {
        const statusColors = {
            'pending': '#FFA500',
            'approved': '#00FF00',
            'denied': '#FF0000'
        };

        return new EmbedBuilder()
            .setColor(statusColors[appeal.status] || '#5865F2')
            .setTitle(`📋 Appeal ${appeal.status.toUpperCase()}`)
            .setThumbnail(user?.displayAvatarURL({ dynamic: true }) || null)
            .addFields(
                { name: '👤 User', value: `<@${appeal.userId}>`, inline: true },
                { name: '📊 Status', value: appeal.status.toUpperCase(), inline: true },
                { name: '📝 Reason', value: appeal.reason || 'No reason provided', inline: false }
            )
            .setImage(appeal.imageUrl)
            .setTimestamp(new Date(appeal.timestamp))
            .setFooter({ text: `Appeal ID: ${appeal.id}` });
    }

    generateStatsEmbed(userId, user) {
        const stats = this.getUserStats(userId);
        const verifications = this.getUserVerifications(userId);
        const appeals = this.getUserAppeals(userId);
        const isVerified = this.isAlreadyVerified(userId);

        return new EmbedBuilder()
            .setColor(isVerified ? '#00FF00' : '#FF6B6B')
            .setTitle(`📊 Verification Stats for ${user?.tag || 'User'}`)
            .setThumbnail(user?.displayAvatarURL({ dynamic: true }) || null)
            .addFields(
                { name: '✅ Status', value: isVerified ? '**VERIFIED**' : '**NOT VERIFIED**', inline: true },
                { name: '📋 Total Submissions', value: stats.total.toString(), inline: true },
                { name: '✓ Approved', value: stats.approved.toString(), inline: true },
                { name: '✗ Denied', value: stats.denied.toString(), inline: true },
                { name: '⏳ Pending', value: stats.pending.toString(), inline: true },
                { name: '📝 Appeals', value: appeals.length.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'YouTube Subscription Verification System' });
    }
}

module.exports = VerificationService;
