const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const { LOA_TYPES, LOA_STATUS, CELEBRATION_EMOJIS, EXCITEMENT_PHRASES } = require('../constants/staff.js');
const mainconfig = require("../../mainconfig.js");

class LOAService {
    constructor(client) {
        this.client = client;
    }

    generateRequestId() {
        return `LOA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    getRandomCelebration() {
        return CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
    }

    getRandomExcitement() {
        return EXCITEMENT_PHRASES[Math.floor(Math.random() * EXCITEMENT_PHRASES.length)];
    }

    parseDate(input) {
        const now = new Date();
        
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
            return new Date(input);
        }
        
        const shortMatch = input.match(/^(\d+)\s*(d|day|days|w|week|weeks|m|month|months|h|hour|hours)$/i);
        if (shortMatch) {
            const amount = parseInt(shortMatch[1]);
            const unit = shortMatch[2].toLowerCase();
            const date = new Date(now);
            if (unit === 'd' || unit.startsWith('day')) date.setDate(date.getDate() + amount);
            else if (unit === 'w' || unit.startsWith('week')) date.setDate(date.getDate() + (amount * 7));
            else if (unit === 'm' || unit.startsWith('month')) date.setMonth(date.getMonth() + amount);
            else if (unit === 'h' || unit.startsWith('hour')) date.setHours(date.getHours() + amount);
            return date;
        }
        
        const relativeMatch = input.match(/^in\s+(\d+)\s*(d|day|days|w|week|weeks|m|month|months)$/i);
        if (relativeMatch) {
            const amount = parseInt(relativeMatch[1]);
            const unit = relativeMatch[2].toLowerCase();
            const date = new Date(now);
            if (unit === 'd' || unit.startsWith('day')) date.setDate(date.getDate() + amount);
            else if (unit === 'w' || unit.startsWith('week')) date.setDate(date.getDate() + (amount * 7));
            else if (unit === 'm' || unit.startsWith('month')) date.setMonth(date.getMonth() + amount);
            return date;
        }
        
        const nextDayMatch = input.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i);
        if (nextDayMatch) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = days.indexOf(nextDayMatch[1].toLowerCase());
            const currentDay = now.getDay();
            let daysUntil = targetDay - currentDay;
            if (daysUntil <= 0) daysUntil += 7;
            const date = new Date(now);
            date.setDate(date.getDate() + daysUntil);
            return date;
        }
        
        const parsed = new Date(input);
        if (!isNaN(parsed.getTime())) return parsed;
        
        return null;
    }

    getLOAType(typeInput) {
        const normalizedInput = typeInput.toUpperCase();
        if (LOA_TYPES[normalizedInput]) {
            return { key: normalizedInput, ...LOA_TYPES[normalizedInput] };
        }
        for (const [key, value] of Object.entries(LOA_TYPES)) {
            if (value.name.toUpperCase() === normalizedInput || 
                value.name.toUpperCase().includes(normalizedInput)) {
                return { key, ...value };
            }
        }
        return null;
    }

    getStaffRolesToRemove() {
        return [
            mainconfig.ServerRoles?.SupporterRoleId,
            mainconfig.ServerRoles?.BotCreatorRoleId,
            mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
            mainconfig.ServerRoles?.NewSupporterRoleId
        ].filter(Boolean);
    }

    hasLeadPermission(member) {
        const leadRoles = [
            mainconfig.ServerRoles?.FounderId,
            mainconfig.ServerRoles?.OwnerRoleId,
            mainconfig.ServerRoles?.CoOwnerRoleId,
            mainconfig.ServerRoles?.AdminRoleId,
            mainconfig.ServerRoles?.ChiefHumanResources,
            mainconfig.ServerRoles?.HumanResources,
            mainconfig.ServerRoles?.ChiefSupporterRoleId,
            mainconfig.ServerRoles?.ChiefBotCreatorRoleId
        ].filter(Boolean);
        
        return leadRoles.some(roleId => member.roles.cache.has(roleId)) || 
               member.permissions.has(PermissionFlagsBits.Administrator);
    }

    hasStaffRole(member) {
        const staffRoles = [
            mainconfig.ServerRoles?.SupporterRoleId,
            mainconfig.ServerRoles?.BotCreatorRoleId,
            mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
            mainconfig.ServerRoles?.FounderId,
            mainconfig.ServerRoles?.NewSupporterRoleId
        ].filter(Boolean);
        
        return staffRoles.some(roleId => member.roles.cache.has(roleId)) || 
               member.permissions.has(PermissionFlagsBits.Administrator);
    }

    async createRequest(userId, guildId, loaType, endDate, reason, member, emergencyContact = null) {
        const requestId = this.generateRequestId();
        const typeInfo = this.getLOAType(loaType);
        
        if (!typeInfo) {
            return { success: false, error: 'Invalid LOA type' };
        }

        const durationDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
        if (durationDays > typeInfo.maxDays) {
            return { 
                success: false, 
                error: `${typeInfo.emoji} **${typeInfo.name}** has a maximum duration of **${typeInfo.maxDays} days**!\nYou requested ${durationDays} days.` 
            };
        }

        const originalRoles = member.roles.cache
            .filter(r => r.id !== guildId)
            .map(r => r.id);

        const request = {
            requestId,
            userId,
            guildId,
            type: typeInfo.key,
            typeName: typeInfo.name,
            typeEmoji: typeInfo.emoji,
            typeColor: typeInfo.color,
            startDate: new Date(),
            endDate,
            reason: reason || 'No reason provided',
            status: 'PENDING',
            originalRoles,
            removedRoles: [],
            coverageUser: null,
            emergencyContact,
            approvedBy: null,
            deniedBy: null,
            denyReason: null,
            extensionPending: false,
            extensionEndDate: null,
            createdAt: new Date(),
            timeline: [{ action: 'requested', date: new Date(), by: userId }]
        };

        this.client.loa.set(requestId, request);
        
        // Send notification to LOA channel
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (guild && mainconfig.LOAManagement.LOANotificationEnabled) {
                const loaChannelId = mainconfig.LOAManagement.LOAChannelID;
                const loaChannel = await guild.channels.fetch(loaChannelId).catch(() => null);
                
                if (loaChannel && loaChannel.isTextBased()) {
                    const ownerIds = mainconfig.OwnerInformation?.OwnerID || [];
                    const ownerMentions = ownerIds.map(id => `<@${id}>`).join(' ');
                    
                    const notificationEmbed = new EmbedBuilder()
                        .setColor(typeInfo.color || '#5865F2')
                        .setTitle(`${typeInfo.emoji} New LOA Request Submitted`)
                        .setDescription(`A new ${typeInfo.name} request has been submitted and is awaiting review.`)
                        .addFields(
                            { name: '👤 Staff Member', value: `<@${userId}> (${member.user.tag})`, inline: true },
                            { name: '📋 Request ID', value: `\`${requestId}\``, inline: true },
                            { name: `${typeInfo.emoji} Type`, value: typeInfo.name, inline: true },
                            { name: '📅 Duration', value: `${durationDays} day(s)`, inline: true },
                            { name: '🗓️ Returns', value: moment(endDate).format('MMMM Do, YYYY'), inline: true },
                            { name: '⏰ Date Range', value: `${moment().format('MMM Do')} → ${moment(endDate).format('MMM Do, YYYY')}`, inline: false },
                            { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
                        )
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: 'Use /loa pending to review requests' })
                        .setTimestamp();
                    
                    if (emergencyContact) {
                        notificationEmbed.addFields({ name: '🆘 Emergency Contact', value: emergencyContact, inline: false });
                    }
                    
                    const actionRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`loa_approve_${requestId}`)
                            .setLabel('✅ Approve')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅'),
                        new ButtonBuilder()
                            .setCustomId(`loa_reject_${requestId}`)
                            .setLabel('❌ Reject')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                    );
                    
                    const content = ownerMentions ? `📌 **LOA Request Pending Review**\n${ownerMentions}` : '📌 **LOA Request Pending Review**';
                    
                    await loaChannel.send({ content, embeds: [notificationEmbed], components: [actionRow] }).catch(err => {
                        console.error(`[LOA] Failed to send notification to LOA channel: ${err.message}`);
                    });
                }
            }
        } catch (err) {
            console.error(`[LOA] Error sending notification: ${err.message}`);
        }
        
        return { success: true, request };
    }

    async approveRequest(requestId, approverId, guild) {
        const request = this.client.loa.get(requestId);
        
        if (!request) {
            return { success: false, error: 'Request not found!' };
        }

        if (request.status !== 'PENDING') {
            return { success: false, error: `This request is already **${request.status}**!` };
        }

        const member = await guild.members.fetch(request.userId).catch(() => null);
        const removedRoles = [];

        if (member) {
            const staffRolesToRemove = this.getStaffRolesToRemove();
            for (const roleId of staffRolesToRemove) {
                if (member.roles.cache.has(roleId)) {
                    try {
                        await member.roles.remove(roleId);
                        removedRoles.push(roleId);
                    } catch (e) {
                        console.log(`Could not remove role ${roleId}: ${e.message}`);
                    }
                }
            }
        }

        request.status = 'APPROVED';
        request.approvedBy = approverId;
        request.removedRoles = removedRoles;
        request.approvedAt = new Date();
        request.timeline.push({ action: 'approved', date: new Date(), by: approverId });

        this.client.loa.set(requestId, request);

        if (member) {
            try {
                await member.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle(`${this.getRandomCelebration()} LOA APPROVED! ${this.getRandomCelebration()}`)
                        .setDescription(`**AMAZING NEWS!** Your leave of absence has been approved! 🎉\n\n${request.typeEmoji} **Type:** ${request.typeName}\n📅 **Until:** ${moment(request.endDate).format('MMMM Do, YYYY')}\n📝 **Reason:** ${request.reason}\n\nYour staff roles have been temporarily removed and will be restored when you return!\n\n**Enjoy your time off!** 🌴✨`)
                        .setFooter({ text: `Request ID: ${requestId}` })
                        .setTimestamp()
                    ]
                });
            } catch (e) {
                console.log(`Could not DM user: ${e.message}`);
            }
        }

        return { success: true, request };
    }

    async denyRequest(requestId, denierId, reason) {
        const request = this.client.loa.get(requestId);
        
        if (!request) {
            return { success: false, error: 'Request not found!' };
        }

        if (request.status !== 'PENDING') {
            return { success: false, error: `This request is already **${request.status}**!` };
        }

        request.status = 'DENIED';
        request.deniedBy = denierId;
        request.denyReason = reason || 'No reason provided';
        request.deniedAt = new Date();
        request.timeline.push({ action: 'denied', date: new Date(), by: denierId, reason: request.denyReason });

        this.client.loa.set(requestId, request);

        const guild = this.client.guilds.cache.get(request.guildId);
        const member = guild ? await guild.members.fetch(request.userId).catch(() => null) : null;

        if (member) {
            try {
                await member.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ LOA Request Denied")
                        .setDescription(`Unfortunately, your leave of absence request has been denied.\n\n${request.typeEmoji} **Type:** ${request.typeName}\n📅 **Requested Until:** ${moment(request.endDate).format('MMMM Do, YYYY')}\n\n**Denial Reason:** ${request.denyReason}\n\nPlease reach out to your manager if you have questions! 💬`)
                        .setFooter({ text: `Request ID: ${requestId}` })
                        .setTimestamp()
                    ]
                });
            } catch (e) {
                console.log(`Could not DM user: ${e.message}`);
            }
        }

        return { success: true, request };
    }

    async assignCoverage(requestId, coverUserId, guild) {
        const request = this.client.loa.get(requestId);
        
        if (!request) {
            return { success: false, error: 'Request not found!' };
        }

        if (request.status !== 'APPROVED') {
            return { success: false, error: 'Can only assign coverage to approved LOAs!' };
        }

        request.coverageUser = coverUserId;
        request.timeline.push({ action: 'coverage_assigned', date: new Date(), coverUser: coverUserId });
        this.client.loa.set(requestId, request);

        const coverMember = await guild.members.fetch(coverUserId).catch(() => null);
        const loaMember = await guild.members.fetch(request.userId).catch(() => null);

        if (coverMember) {
            try {
                await coverMember.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle("📋 Coverage Assignment!")
                        .setDescription(`You've been assigned to cover for **${loaMember?.user.username || 'a team member'}** during their leave of absence!\n\n${request.typeEmoji} **LOA Type:** ${request.typeName}\n📅 **Until:** ${moment(request.endDate).format('MMMM Do, YYYY')}\n⏰ **Returns:** ${moment(request.endDate).fromNow()}\n\n**Thank you for stepping up!** 🌟`)
                        .setFooter({ text: `Request ID: ${requestId}` })
                        .setTimestamp()
                    ]
                });
            } catch (e) {
                console.log(`Could not DM cover user: ${e.message}`);
            }
        }

        return { success: true, request };
    }

    async endLOA(requestId, endedBy, guild) {
        const request = this.client.loa.get(requestId);
        
        if (!request) {
            return { success: false, error: 'Request not found!' };
        }

        if (request.status !== 'APPROVED') {
            return { success: false, error: 'Can only end approved LOAs!' };
        }

        const member = await guild.members.fetch(request.userId).catch(() => null);

        if (member && request.removedRoles.length > 0) {
            for (const roleId of request.removedRoles) {
                try {
                    const role = guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.add(roleId);
                    }
                } catch (e) {
                    console.log(`Could not restore role ${roleId}: ${e.message}`);
                }
            }
        }

        request.status = 'COMPLETED';
        request.endedAt = new Date();
        request.endedBy = endedBy;
        request.timeline.push({ action: 'ended', date: new Date(), by: endedBy });

        this.client.loa.set(requestId, request);

        if (member) {
            try {
                await member.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle(`🎉 WELCOME BACK! 🎉`)
                        .setDescription(`Your leave of absence has ended and your roles have been restored!\n\n${this.getRandomExcitement()}\n\n✅ **Roles Restored:** ${request.removedRoles.length}\n📅 **LOA Duration:** ${moment(request.startDate).from(moment(), true)}\n\n**We're happy to have you back!** 💪✨`)
                        .setFooter({ text: `Request ID: ${requestId}` })
                        .setTimestamp()
                    ]
                });
            } catch (e) {
                console.log(`Could not DM user: ${e.message}`);
            }
        }

        if (request.coverageUser) {
            const coverMember = await guild.members.fetch(request.coverageUser).catch(() => null);
            if (coverMember) {
                try {
                    await coverMember.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("✅ Coverage Complete!")
                            .setDescription(`**${member?.user.username || 'The staff member'}** has returned from their LOA!\n\nThank you for providing coverage! 🌟`)
                            .setTimestamp()
                        ]
                    });
                } catch (e) {
                    console.log(`Could not DM cover user: ${e.message}`);
                }
            }
        }

        return { success: true, request };
    }

    async extendLOA(requestId, newEndDate, extendedBy) {
        const request = this.client.loa.get(requestId);
        
        if (!request) {
            return { success: false, error: 'Request not found!' };
        }

        if (request.status !== 'APPROVED') {
            return { success: false, error: 'Can only extend approved LOAs!' };
        }

        const typeInfo = LOA_TYPES[request.type];
        const newDurationDays = Math.ceil((newEndDate - new Date(request.startDate)) / (1000 * 60 * 60 * 24));
        
        if (newDurationDays > typeInfo.maxDays) {
            return { 
                success: false, 
                error: `Extension would exceed maximum duration of ${typeInfo.maxDays} days for ${typeInfo.name}!` 
            };
        }

        request.extensionPending = true;
        request.extensionEndDate = newEndDate;
        request.timeline.push({ action: 'extension_requested', date: new Date(), by: extendedBy, newEndDate });
        
        this.client.loa.set(requestId, request);

        return { success: true, request, newEndDate };
    }

    async approveExtension(requestId, approverId) {
        const request = this.client.loa.get(requestId);
        
        if (!request) {
            return { success: false, error: 'Request not found!' };
        }

        if (!request.extensionPending) {
            return { success: false, error: 'No pending extension for this LOA!' };
        }

        const oldEndDate = request.endDate;
        request.endDate = request.extensionEndDate;
        request.extensionPending = false;
        request.extensionEndDate = null;
        request.timeline.push({ action: 'extension_approved', date: new Date(), by: approverId, oldEndDate, newEndDate: request.endDate });
        
        this.client.loa.set(requestId, request);

        const guild = this.client.guilds.cache.get(request.guildId);
        const member = guild ? await guild.members.fetch(request.userId).catch(() => null) : null;

        if (member) {
            try {
                await member.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("✅ LOA Extension Approved!")
                        .setDescription(`Your LOA extension has been approved!\n\n📅 **New End Date:** ${moment(request.endDate).format('MMMM Do, YYYY')}\n⏰ **Returns:** ${moment(request.endDate).fromNow()}`)
                        .setFooter({ text: `Request ID: ${requestId}` })
                        .setTimestamp()
                    ]
                });
            } catch (e) {}
        }

        return { success: true, request };
    }

    getActiveRequests(guildId) {
        const allRequests = this.client.loa.fetchEverything();
        const active = [];
        
        allRequests.forEach((data, requestId) => {
            if (data.guildId === guildId && data.status === 'APPROVED') {
                active.push({ requestId, ...data });
            }
        });
        
        return active.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
    }

    getPendingRequests(guildId) {
        const allRequests = this.client.loa.fetchEverything();
        const pending = [];
        
        allRequests.forEach((data, requestId) => {
            if (data.guildId === guildId && data.status === 'PENDING') {
                pending.push({ requestId, ...data });
            }
        });
        
        return pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    getUserActiveRequest(userId) {
        const allRequests = this.client.loa.fetchEverything();
        
        for (const [requestId, data] of allRequests) {
            if (data.userId === userId && (data.status === 'APPROVED' || data.status === 'PENDING')) {
                return { requestId, ...data };
            }
        }
        
        return null;
    }

    getUserRequests(userId) {
        const allRequests = this.client.loa.fetchEverything();
        const userRequests = [];
        
        allRequests.forEach((data, requestId) => {
            if (data.userId === userId) {
                userRequests.push({ requestId, ...data });
            }
        });
        
        return userRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getAllGuildRequests(guildId) {
        const allRequests = this.client.loa.fetchEverything();
        const guildRequests = [];
        
        allRequests.forEach((data, requestId) => {
            if (data.guildId === guildId) {
                guildRequests.push({ requestId, ...data });
            }
        });
        
        return guildRequests;
    }

    getCalendarData(guildId, month = null, year = null) {
        const now = new Date();
        const targetMonth = month !== null ? month : now.getMonth();
        const targetYear = year !== null ? year : now.getFullYear();
        
        const allRequests = this.client.loa.fetchEverything();
        const calendarData = {
            month: targetMonth,
            year: targetYear,
            monthName: moment().month(targetMonth).format('MMMM'),
            entries: []
        };
        
        allRequests.forEach((data, requestId) => {
            if (data.guildId === guildId && data.status === 'APPROVED') {
                const startDate = new Date(data.startDate);
                const endDate = new Date(data.endDate);
                
                if ((startDate.getMonth() === targetMonth && startDate.getFullYear() === targetYear) ||
                    (endDate.getMonth() === targetMonth && endDate.getFullYear() === targetYear) ||
                    (startDate <= new Date(targetYear, targetMonth, 1) && endDate >= new Date(targetYear, targetMonth + 1, 0))) {
                    calendarData.entries.push({
                        requestId,
                        userId: data.userId,
                        type: data.typeName,
                        emoji: data.typeEmoji,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        reason: data.reason
                    });
                }
            }
        });
        
        calendarData.entries.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        return calendarData;
    }

    async checkAndProcessReturns() {
        const now = new Date();
        const allRequests = this.client.loa.fetchEverything();
        const processed = [];
        
        for (const [requestId, data] of allRequests) {
            if (data.status === 'APPROVED' && new Date(data.endDate) <= now) {
                const guild = this.client.guilds.cache.get(data.guildId);
                if (guild) {
                    const result = await this.endLOA(requestId, this.client.user.id, guild);
                    if (result.success) {
                        processed.push(requestId);
                    }
                }
            }
        }
        
        return processed;
    }

    getStatusEmoji(status) {
        return LOA_STATUS[status]?.emoji || '❓';
    }

    getStatusColor(status) {
        return LOA_STATUS[status]?.color || '#99AAB5';
    }

    getStatusName(status) {
        return LOA_STATUS[status]?.name || status;
    }

    formatRequestEmbed(request, guild) {
        const statusInfo = LOA_STATUS[request.status] || LOA_STATUS.PENDING;
        
        return new EmbedBuilder()
            .setColor(statusInfo.color)
            .setTitle(`${request.typeEmoji} LOA Request - ${request.typeName}`)
            .setDescription(`**Request ID:** \`${request.requestId}\`\n**Status:** ${statusInfo.emoji} ${statusInfo.name}`)
            .addFields(
                { name: "👤 Staff Member", value: `<@${request.userId}>`, inline: true },
                { name: "📅 Duration", value: `${moment(request.startDate).format('MMM Do')} → ${moment(request.endDate).format('MMM Do, YYYY')}`, inline: true },
                { name: "⏰ Time Remaining", value: moment(request.endDate).fromNow(), inline: true },
                { name: "📝 Reason", value: request.reason, inline: false },
                { name: "🛡️ Coverage", value: request.coverageUser ? `<@${request.coverageUser}>` : 'Not assigned', inline: true },
                { name: "✅ Approved By", value: request.approvedBy ? `<@${request.approvedBy}>` : 'Pending', inline: true }
            )
            .setFooter({ text: `Requested: ${moment(request.createdAt).format('MMM Do, YYYY [at] h:mm A')}` })
            .setTimestamp();
    }

    getStatsByType(guildId) {
        const allRequests = this.getAllGuildRequests(guildId);
        const stats = {};
        
        for (const request of allRequests) {
            if (!stats[request.type]) {
                stats[request.type] = {
                    count: 0,
                    approved: 0,
                    denied: 0,
                    completed: 0,
                    totalDays: 0
                };
            }
            
            stats[request.type].count++;
            if (request.status === 'APPROVED') stats[request.type].approved++;
            if (request.status === 'DENIED') stats[request.type].denied++;
            if (request.status === 'COMPLETED') {
                stats[request.type].completed++;
                const days = Math.ceil((new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24));
                stats[request.type].totalDays += days;
            }
        }
        
        return stats;
    }

    getTopLOAUsers(guildId, limit = 5) {
        const allRequests = this.getAllGuildRequests(guildId);
        const userCounts = {};
        
        for (const request of allRequests) {
            userCounts[request.userId] = (userCounts[request.userId] || 0) + 1;
        }
        
        return Object.entries(userCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([userId, count]) => ({ userId, count }));
    }

    getAverageApprovalTime(guildId) {
        const allRequests = this.getAllGuildRequests(guildId).filter(r => r.approvedAt);
        
        if (allRequests.length === 0) return 0;
        
        const totalTime = allRequests.reduce((sum, r) => {
            return sum + (new Date(r.approvedAt) - new Date(r.createdAt));
        }, 0);
        
        return Math.round(totalTime / allRequests.length / (1000 * 60 * 60));
    }
}

module.exports = LOAService;
