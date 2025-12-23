const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require('discord.js');
const moment = require('moment');
const LOAService = require('../../staff/loaService.js');
const { LOA_TYPES, LOA_STATUS, CELEBRATION_EMOJIS } = require('../../constants/staff.js');

module.exports = {
    name: "loa",
    description: "🌴 Advanced Leave of Absence management system with approval workflow!",
    usage: "loa <request|approve|deny|assign|list|status|calendar|end>",
    aliases: ["leave", "absence"],

    run: async (client, message, args) => {
        const loaService = new LOAService(client);
        
        if (!loaService.hasStaffRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Access Denied!")
                    .setDescription("**Oops!** You need to be a staff member to use the LOA system!\n\nIf you believe this is an error, please contact a manager. 💬")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand) {
            return showInteractiveMenu(client, message, loaService);
        }

        switch (subcommand) {
            case 'request':
            case 'submit':
            case 'new':
                return handleInteractiveRequest(client, message, args.slice(1), loaService);
            
            case 'approve':
            case 'accept':
                return handleApprove(client, message, args.slice(1), loaService);
            
            case 'deny':
            case 'reject':
                return handleDeny(client, message, args.slice(1), loaService);
            
            case 'assign':
            case 'cover':
            case 'coverage':
                return handleAssign(client, message, args.slice(1), loaService);
            
            case 'list':
            case 'active':
                return handleList(client, message, args.slice(1), loaService);
            
            case 'status':
            case 'check':
            case 'view':
                return handleStatus(client, message, args.slice(1), loaService);
            
            case 'calendar':
            case 'cal':
            case 'schedule':
                return handleCalendar(client, message, args.slice(1), loaService);
            
            case 'end':
            case 'return':
            case 'back':
                return handleEnd(client, message, args.slice(1), loaService);
            
            case 'pending':
                return handlePending(client, message, loaService);
            
            case 'types':
                return showTypes(client, message);

            case 'stats':
            case 'analytics':
                return handleStats(client, message, loaService);

            case 'extend':
                return handleExtend(client, message, args.slice(1), loaService);
            
            default:
                return showInteractiveMenu(client, message, loaService);
        }
    }
};

async function showInteractiveMenu(client, message, loaService) {
    const pendingCount = loaService.getPendingRequests(message.guild.id).length;
    const activeCount = loaService.getActiveRequests(message.guild.id).length;
    const isLead = loaService.hasLeadPermission(message.member);
    const userActiveRequest = loaService.getUserActiveRequest(message.author.id);
    
    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🌴 LOA Management Center")
        .setDescription(`Welcome to the **Leave of Absence** system!\nManage staff absences with our powerful workflow system.\n\n` + 
            `╭─────────────────────╮\n` +
            `│ 📊 **Current Statistics**\n` +
            `│ ${activeCount > 0 ? `🌴 **${activeCount}** staff on leave` : '✅ No active LOAs'}\n` +
            `│ ${pendingCount > 0 ? `⏳ **${pendingCount}** pending requests` : '📋 No pending requests'}\n` +
            `╰─────────────────────╯`)
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setFooter({ text: "Click a button below to get started!", iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    if (userActiveRequest) {
        embed.addFields({
            name: "🔔 Your Active LOA",
            value: `**Status:** ${loaService.getStatusEmoji(userActiveRequest.status)} ${loaService.getStatusName(userActiveRequest.status)}\n` +
                   `**Type:** ${userActiveRequest.typeEmoji} ${userActiveRequest.typeName}\n` +
                   `**Returns:** ${moment(userActiveRequest.endDate).format('MMM Do, YYYY')} (${moment(userActiveRequest.endDate).fromNow()})`,
            inline: false
        });
    }

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('loa_request_new')
            .setLabel('📝 New Request')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!!userActiveRequest),
        new ButtonBuilder()
            .setCustomId('loa_view_status')
            .setLabel('📋 My Status')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('loa_view_list')
            .setLabel('👥 Active LOAs')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('loa_view_calendar')
            .setLabel('📅 Calendar')
            .setStyle(ButtonStyle.Secondary)
    );

    const row2Components = [
        new ButtonBuilder()
            .setCustomId('loa_view_types')
            .setLabel('📚 LOA Types')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('loa_view_stats')
            .setLabel('📊 Statistics')
            .setStyle(ButtonStyle.Secondary)
    ];

    if (userActiveRequest && userActiveRequest.status === 'APPROVED') {
        row2Components.push(
            new ButtonBuilder()
                .setCustomId('loa_end_early')
                .setLabel('🔙 End LOA Early')
                .setStyle(ButtonStyle.Danger)
        );
    }

    if (isLead && pendingCount > 0) {
        row2Components.push(
            new ButtonBuilder()
                .setCustomId('loa_view_pending')
                .setLabel(`⏳ Pending (${pendingCount})`)
                .setStyle(ButtonStyle.Success)
        );
    }

    const row2 = new ActionRowBuilder().addComponents(row2Components);

    const reply = await message.reply({ embeds: [embed], components: [row1, row2] });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
    });

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
            return interaction.reply({ content: "❌ This menu isn't for you!", ephemeral: true });
        }

        try {
            switch (interaction.customId) {
                case 'loa_request_new':
                    await showRequestModal(interaction, loaService);
                    break;
                case 'loa_view_status':
                    await showStatusEmbed(interaction, message, loaService);
                    break;
                case 'loa_view_list':
                    await showListEmbed(interaction, message, loaService);
                    break;
                case 'loa_view_calendar':
                    await showCalendarEmbed(interaction, message, loaService);
                    break;
                case 'loa_view_types':
                    await showTypesEmbed(interaction);
                    break;
                case 'loa_view_stats':
                    await showStatsEmbed(interaction, message, loaService);
                    break;
                case 'loa_end_early':
                    await handleEndButton(interaction, message, loaService);
                    break;
                case 'loa_view_pending':
                    await showPendingEmbed(interaction, message, loaService);
                    break;
            }
        } catch (error) {
            console.error('LOA interaction error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "❌ An error occurred. Please try again.", ephemeral: true }).catch(() => {});
            }
        }
    });

    collector.on('end', () => {
        row1.components.forEach(c => c.setDisabled(true));
        row2.components.forEach(c => c.setDisabled(true));
        reply.edit({ components: [row1, row2] }).catch(() => {});
    });
}

async function showRequestModal(interaction, loaService) {
    const selectEmbed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📝 New LOA Request")
        .setDescription("**Select the type of leave you're requesting:**\n\n" +
            Object.entries(LOA_TYPES).map(([key, value]) => 
                `${value.emoji} **${value.name}** - Up to ${value.maxDays} days`
            ).join('\n'))
        .setFooter({ text: "Select a type from the dropdown below" });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('loa_type_select')
        .setPlaceholder('🌴 Choose your LOA type...')
        .addOptions(
            Object.entries(LOA_TYPES).map(([key, value]) => ({
                label: value.name,
                description: `Up to ${value.maxDays} days`,
                value: key,
                emoji: value.emoji
            }))
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({ embeds: [selectEmbed], components: [row] });

    const selectCollector = interaction.message.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
        max: 1
    });

    selectCollector.on('collect', async (selectInteraction) => {
        if (selectInteraction.user.id !== interaction.user.id) {
            return selectInteraction.reply({ content: "❌ This menu isn't for you!", ephemeral: true });
        }

        const selectedType = selectInteraction.values[0];
        const typeInfo = LOA_TYPES[selectedType];

        const modal = new ModalBuilder()
            .setCustomId(`loa_modal_${selectedType}`)
            .setTitle(`${typeInfo.emoji} ${typeInfo.name} Request`);

        const durationInput = new TextInputBuilder()
            .setCustomId('loa_duration')
            .setLabel('Duration (e.g., 3d, 1w, 2weeks)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1w')
            .setRequired(true)
            .setMaxLength(20);

        const reasonInput = new TextInputBuilder()
            .setCustomId('loa_reason')
            .setLabel('Reason for leave')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Brief description of why you need time off...')
            .setRequired(true)
            .setMaxLength(500);

        const emergencyContactInput = new TextInputBuilder()
            .setCustomId('loa_emergency')
            .setLabel('Emergency Contact (Discord username)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Leave blank if none')
            .setRequired(false)
            .setMaxLength(50);

        modal.addComponents(
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(reasonInput),
            new ActionRowBuilder().addComponents(emergencyContactInput)
        );

        await selectInteraction.showModal(modal);

        try {
            const modalSubmit = await selectInteraction.awaitModalSubmit({
                filter: (i) => i.customId === `loa_modal_${selectedType}` && i.user.id === interaction.user.id,
                time: 300000
            });

            const duration = modalSubmit.fields.getTextInputValue('loa_duration');
            const reason = modalSubmit.fields.getTextInputValue('loa_reason');
            const emergencyContact = modalSubmit.fields.getTextInputValue('loa_emergency') || null;

            const endDate = loaService.parseDate(duration);
            if (!endDate || endDate <= new Date()) {
                return modalSubmit.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Invalid Duration!")
                        .setDescription("Please provide a valid future duration!\n\n**Valid formats:**\n• `3d` - 3 days\n• `1w` - 1 week\n• `2weeks` - 2 weeks\n• `1m` - 1 month")
                    ],
                    ephemeral: true
                });
            }

            const result = await loaService.createRequest(
                modalSubmit.user.id,
                interaction.guild.id,
                selectedType,
                endDate,
                reason,
                interaction.member,
                emergencyContact
            );

            if (!result.success) {
                return modalSubmit.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Request Failed!")
                        .setDescription(result.error)
                    ],
                    ephemeral: true
                });
            }

            const request = result.request;
            const durationDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

            const successEmbed = new EmbedBuilder()
                .setColor("#FEE75C")
                .setTitle(`${request.typeEmoji} LOA Request Submitted! ⏳`)
                .setDescription(`**Your leave request has been submitted!**\n\n${loaService.getRandomCelebration()} A manager will review your request shortly!`)
                .addFields(
                    { name: "📋 Request ID", value: `\`${request.requestId}\``, inline: true },
                    { name: `${request.typeEmoji} Type`, value: request.typeName, inline: true },
                    { name: "📅 Duration", value: `${durationDays} day(s)`, inline: true },
                    { name: "🗓️ Date Range", value: `${moment().format('MMM Do')} → ${moment(endDate).format('MMM Do, YYYY')}`, inline: true },
                    { name: "⏰ Returns", value: moment(endDate).fromNow(), inline: true },
                    { name: "⏳ Status", value: "Pending Approval", inline: true },
                    { name: "📝 Reason", value: reason, inline: false }
                )
                .setThumbnail(modalSubmit.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "A Lead+ staff member will review your request", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            if (emergencyContact) {
                successEmbed.addFields({ name: "🆘 Emergency Contact", value: emergencyContact, inline: false });
            }

            await modalSubmit.reply({ embeds: [successEmbed] });

            try {
                await modalSubmit.user.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle(`${request.typeEmoji} LOA Request Confirmation`)
                        .setDescription(`Your leave request has been submitted!\n\n**Request ID:** \`${request.requestId}\`\n**Type:** ${request.typeName}\n**Until:** ${moment(endDate).format('MMMM Do, YYYY')}\n\nYou'll receive a notification when reviewed! 📬`)
                        .setFooter({ text: interaction.guild.name })
                        .setTimestamp()
                    ]
                });
            } catch (e) {}

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return;
            }
            console.error('Modal error:', error);
        }
    });
}

async function showStatusEmbed(interaction, message, loaService) {
    const userRequests = loaService.getUserRequests(message.author.id);
    
    if (userRequests.length === 0) {
        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("📋 Your LOA Status")
            .setDescription("You have no LOA history!\n\nClick **New Request** to submit your first LOA.")
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
        
        return interaction.update({ embeds: [embed], components: [] });
    }

    const activeRequest = userRequests.find(r => r.status === 'APPROVED' || r.status === 'PENDING');
    const completedRequests = userRequests.filter(r => r.status === 'COMPLETED').length;
    const deniedRequests = userRequests.filter(r => r.status === 'DENIED').length;

    let description = `**📊 LOA Overview**\n` +
        `Total Requests: **${userRequests.length}**\n` +
        `Completed: **${completedRequests}** ✅\n` +
        `Denied: **${deniedRequests}** ❌\n\n`;

    if (activeRequest) {
        const statusInfo = LOA_STATUS[activeRequest.status];
        description += `**🔔 Current LOA:**\n` +
            `╭─────────────────────╮\n` +
            `│ ${statusInfo.emoji} **Status:** ${statusInfo.name}\n` +
            `│ ${activeRequest.typeEmoji} **Type:** ${activeRequest.typeName}\n` +
            `│ 📅 **Period:** ${moment(activeRequest.startDate).format('MMM Do')} → ${moment(activeRequest.endDate).format('MMM Do')}\n` +
            `│ ⏰ **${activeRequest.status === 'APPROVED' ? 'Returns' : 'Requested Until'}:** ${moment(activeRequest.endDate).fromNow()}\n` +
            `│ 📝 **Reason:** ${activeRequest.reason.substring(0, 50)}${activeRequest.reason.length > 50 ? '...' : ''}\n` +
            `╰─────────────────────╯`;
    }

    const embed = new EmbedBuilder()
        .setColor(activeRequest ? loaService.getStatusColor(activeRequest.status) : "#5865F2")
        .setTitle(`📋 LOA Status - ${message.author.tag}`)
        .setDescription(description)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    if (userRequests.length > 0) {
        const recentHistory = userRequests.slice(0, 3).map(r => {
            const statusEmoji = loaService.getStatusEmoji(r.status);
            return `${statusEmoji} ${r.typeEmoji} ${r.typeName} - ${moment(r.createdAt).format('MMM Do, YYYY')}`;
        }).join('\n');
        embed.addFields({ name: "📜 Recent History", value: recentHistory || "No history", inline: false });
    }

    await interaction.update({ embeds: [embed], components: [] });
}

async function showListEmbed(interaction, message, loaService) {
    const activeRequests = loaService.getActiveRequests(message.guild.id);

    if (activeRequests.length === 0) {
        const embed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle("✅ All Hands On Deck!")
            .setDescription("**No staff members are currently on leave!** 🎉\n\nEveryone is here and ready to help!")
            .setThumbnail(message.guild.iconURL({ dynamic: true }));
        
        return interaction.update({ embeds: [embed], components: [] });
    }

    let description = '';
    for (const request of activeRequests.slice(0, 8)) {
        const member = await message.guild.members.fetch(request.userId).catch(() => null);
        const username = member ? member.user.username : 'Unknown';
        
        description += `${request.typeEmoji} **${username}**\n`;
        description += `├ 📋 \`${request.requestId}\`\n`;
        description += `├ 📅 Returns: ${moment(request.endDate).format('MMM Do')} (${moment(request.endDate).fromNow()})\n`;
        if (request.coverageUser) {
            description += `├ 🛡️ Coverage: <@${request.coverageUser}>\n`;
        }
        description += `└ 📝 ${request.reason.substring(0, 40)}${request.reason.length > 40 ? '...' : ''}\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`🌴 Active LOAs (${activeRequests.length})`)
        .setDescription(description)
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setFooter({ text: "Sorted by return date • Staff Management System" })
        .setTimestamp();

    if (activeRequests.length > 8) {
        embed.addFields({ name: "📊 Note", value: `Showing 8 of ${activeRequests.length} active LOAs`, inline: false });
    }

    await interaction.update({ embeds: [embed], components: [] });
}

async function showCalendarEmbed(interaction, message, loaService) {
    const calendarData = loaService.getCalendarData(message.guild.id);
    
    const daysInMonth = new Date(calendarData.year, calendarData.month + 1, 0).getDate();
    const firstDay = new Date(calendarData.year, calendarData.month, 1).getDay();
    
    let calendarGrid = '```\n';
    calendarGrid += `     ${calendarData.monthName} ${calendarData.year}\n`;
    calendarGrid += ' Su Mo Tu We Th Fr Sa\n';
    
    let dayCount = 1;
    for (let week = 0; week < 6; week++) {
        let weekStr = '';
        for (let day = 0; day < 7; day++) {
            if (week === 0 && day < firstDay) {
                weekStr += '   ';
            } else if (dayCount <= daysInMonth) {
                const hasLOA = calendarData.entries.some(entry => {
                    const start = new Date(entry.startDate);
                    const end = new Date(entry.endDate);
                    const checkDate = new Date(calendarData.year, calendarData.month, dayCount);
                    return checkDate >= start && checkDate <= end;
                });
                weekStr += hasLOA ? `[${String(dayCount).padStart(2, ' ')}]` : ` ${String(dayCount).padStart(2, ' ')} `;
                dayCount++;
            }
        }
        calendarGrid += weekStr + '\n';
        if (dayCount > daysInMonth) break;
    }
    calendarGrid += '```\n`[XX]` = Days with active LOAs';

    let loaList = '';
    if (calendarData.entries.length > 0) {
        loaList = calendarData.entries.slice(0, 5).map(entry => {
            return `${entry.emoji} <@${entry.userId}>: ${moment(entry.startDate).format('MMM D')} - ${moment(entry.endDate).format('MMM D')}`;
        }).join('\n');
    } else {
        loaList = 'No LOAs scheduled this month! ✨';
    }

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`📅 LOA Calendar - ${calendarData.monthName} ${calendarData.year}`)
        .setDescription(calendarGrid)
        .addFields({ name: "🌴 Scheduled Leaves", value: loaList, inline: false })
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
}

async function showTypesEmbed(interaction) {
    let typesDescription = '';
    for (const [key, value] of Object.entries(LOA_TYPES)) {
        typesDescription += `${value.emoji} **${value.name}**\n`;
        typesDescription += `├ Max Duration: **${value.maxDays} days**\n`;
        typesDescription += `└ Color: \`${value.color}\`\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📚 Available LOA Types")
        .setDescription(typesDescription)
        .addFields({
            name: "💡 Duration Formats",
            value: "• `3d` - 3 days\n• `1w` - 1 week\n• `2weeks` - 2 weeks\n• `1m` - 1 month\n• `2025-01-15` - Specific date",
            inline: false
        })
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
}

async function showStatsEmbed(interaction, message, loaService) {
    const allRequests = loaService.getAllGuildRequests(message.guild.id);
    
    const stats = {
        total: allRequests.length,
        pending: allRequests.filter(r => r.status === 'PENDING').length,
        approved: allRequests.filter(r => r.status === 'APPROVED').length,
        completed: allRequests.filter(r => r.status === 'COMPLETED').length,
        denied: allRequests.filter(r => r.status === 'DENIED').length
    };

    const typeStats = {};
    for (const request of allRequests) {
        typeStats[request.type] = (typeStats[request.type] || 0) + 1;
    }

    const mostCommonType = Object.entries(typeStats).sort((a, b) => b[1] - a[1])[0];

    const avgDuration = allRequests.length > 0 
        ? Math.round(allRequests.reduce((sum, r) => {
            const days = Math.ceil((new Date(r.endDate) - new Date(r.startDate)) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0) / allRequests.length)
        : 0;

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📊 LOA Statistics")
        .setDescription("**Server-wide LOA analytics:**")
        .addFields(
            { name: "📋 Total Requests", value: `${stats.total}`, inline: true },
            { name: "⏳ Pending", value: `${stats.pending}`, inline: true },
            { name: "🌴 Active", value: `${stats.approved}`, inline: true },
            { name: "✅ Completed", value: `${stats.completed}`, inline: true },
            { name: "❌ Denied", value: `${stats.denied}`, inline: true },
            { name: "📅 Avg Duration", value: `${avgDuration} days`, inline: true }
        )
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    if (mostCommonType) {
        const typeInfo = LOA_TYPES[mostCommonType[0]];
        embed.addFields({
            name: "🏆 Most Common Type",
            value: `${typeInfo.emoji} ${typeInfo.name} (${mostCommonType[1]} requests)`,
            inline: false
        });
    }

    await interaction.update({ embeds: [embed], components: [] });
}

async function showPendingEmbed(interaction, message, loaService) {
    if (!loaService.hasLeadPermission(interaction.member)) {
        return interaction.reply({ content: "❌ You don't have permission to view pending requests!", ephemeral: true });
    }

    const pending = loaService.getPendingRequests(message.guild.id);
    
    if (pending.length === 0) {
        const embed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle("✅ No Pending Requests!")
            .setDescription("All LOA requests have been reviewed! 🎉");
        
        return interaction.update({ embeds: [embed], components: [] });
    }

    let description = '';
    for (const request of pending.slice(0, 5)) {
        const member = await message.guild.members.fetch(request.userId).catch(() => null);
        const username = member ? member.user.username : 'Unknown';
        const durationDays = Math.ceil((new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24));
        
        description += `${request.typeEmoji} **${username}**\n`;
        description += `├ 📋 ID: \`${request.requestId}\`\n`;
        description += `├ 📅 Duration: ${durationDays} days\n`;
        description += `├ 📝 ${request.reason.substring(0, 40)}${request.reason.length > 40 ? '...' : ''}\n`;
        description += `└ ⏰ Submitted: ${moment(request.createdAt).fromNow()}\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle(`⏳ Pending Requests (${pending.length})`)
        .setDescription(description)
        .addFields({
            name: "💡 How to Review",
            value: "Use `,loa approve <ID>` to approve\nUse `,loa deny <ID> [reason]` to deny",
            inline: false
        })
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    const buttons = new ActionRowBuilder();
    
    if (pending.length > 0) {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`loa_quick_approve_${pending[0].requestId}`)
                .setLabel(`Approve ${pending[0].requestId}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`loa_quick_deny_${pending[0].requestId}`)
                .setLabel(`Deny ${pending[0].requestId}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );
    }

    await interaction.update({ embeds: [embed], components: buttons.components.length > 0 ? [buttons] : [] });

    const buttonCollector = interaction.message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    buttonCollector.on('collect', async (btnInteraction) => {
        if (!loaService.hasLeadPermission(btnInteraction.member)) {
            return btnInteraction.reply({ content: "❌ You don't have permission!", ephemeral: true });
        }

        if (btnInteraction.customId.startsWith('loa_quick_approve_')) {
            const requestId = btnInteraction.customId.replace('loa_quick_approve_', '');
            const result = await loaService.approveRequest(requestId, btnInteraction.user.id, message.guild);
            
            if (result.success) {
                await btnInteraction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("✅ LOA Approved!")
                        .setDescription(`Request \`${requestId}\` has been approved!`)
                    ]
                });
            } else {
                await btnInteraction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }
        } else if (btnInteraction.customId.startsWith('loa_quick_deny_')) {
            const requestId = btnInteraction.customId.replace('loa_quick_deny_', '');
            
            const modal = new ModalBuilder()
                .setCustomId(`loa_deny_modal_${requestId}`)
                .setTitle('Deny LOA Request');

            const reasonInput = new TextInputBuilder()
                .setCustomId('deny_reason')
                .setLabel('Reason for denial')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explain why this request is being denied...')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            await btnInteraction.showModal(modal);

            try {
                const modalSubmit = await btnInteraction.awaitModalSubmit({
                    filter: (i) => i.customId === `loa_deny_modal_${requestId}`,
                    time: 60000
                });

                const denyReason = modalSubmit.fields.getTextInputValue('deny_reason');
                const result = await loaService.denyRequest(requestId, modalSubmit.user.id, denyReason);

                if (result.success) {
                    await modalSubmit.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("❌ LOA Denied")
                            .setDescription(`Request \`${requestId}\` has been denied.\n**Reason:** ${denyReason}`)
                        ]
                    });
                } else {
                    await modalSubmit.reply({ content: `❌ ${result.error}`, ephemeral: true });
                }
            } catch (e) {}
        }
    });
}

async function handleEndButton(interaction, message, loaService) {
    const userRequest = loaService.getUserActiveRequest(message.author.id);
    
    if (!userRequest || userRequest.status !== 'APPROVED') {
        return interaction.reply({ content: "❌ You don't have an active LOA to end!", ephemeral: true });
    }

    const confirmEmbed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle("⚠️ End LOA Early?")
        .setDescription(`Are you sure you want to end your LOA early?\n\n` +
            `**Request:** \`${userRequest.requestId}\`\n` +
            `**Type:** ${userRequest.typeEmoji} ${userRequest.typeName}\n` +
            `**Originally Until:** ${moment(userRequest.endDate).format('MMM Do, YYYY')}\n\n` +
            `Your staff roles will be restored immediately.`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('loa_confirm_end')
            .setLabel('Yes, End My LOA')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('loa_cancel_end')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [confirmEmbed], components: [row] });

    const collector = interaction.message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
        max: 1
    });

    collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== message.author.id) {
            return btnInteraction.reply({ content: "❌ This isn't for you!", ephemeral: true });
        }

        if (btnInteraction.customId === 'loa_confirm_end') {
            const result = await loaService.endLOA(userRequest.requestId, message.author.id, message.guild);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("🎉 Welcome Back!")
                    .setDescription(`Your LOA has been ended and your roles have been restored!\n\n${loaService.getRandomExcitement()}`)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
                
                await btnInteraction.update({ embeds: [embed], components: [] });
            } else {
                await btnInteraction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }
        } else {
            await btnInteraction.update({ 
                embeds: [new EmbedBuilder().setColor("#5865F2").setTitle("❌ Cancelled").setDescription("LOA end cancelled.")], 
                components: [] 
            });
        }
    });
}

async function handleInteractiveRequest(client, message, args, loaService) {
    const existingRequest = loaService.getUserActiveRequest(message.author.id);
    if (existingRequest) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#FEE75C")
                .setTitle("⚠️ Already Have Active LOA!")
                .setDescription(`You already have an active LOA!\n\n**ID:** \`${existingRequest.requestId}\`\n**Type:** ${existingRequest.typeEmoji} ${existingRequest.typeName}\n**Until:** ${moment(existingRequest.endDate).format('MMMM Do, YYYY')}\n\nUse \`,loa end\` to return early.`)
            ]
        });
    }

    if (args.length < 2) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('loa_type_select_cmd')
            .setPlaceholder('🌴 Choose your LOA type...')
            .addOptions(
                Object.entries(LOA_TYPES).map(([key, value]) => ({
                    label: value.name,
                    description: `Up to ${value.maxDays} days`,
                    value: key,
                    emoji: value.emoji
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("📝 New LOA Request")
            .setDescription("Select the type of leave you're requesting:\n\n" +
                Object.entries(LOA_TYPES).map(([key, value]) => 
                    `${value.emoji} **${value.name}** - Up to ${value.maxDays} days`
                ).join('\n'));

        const reply = await message.reply({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
            max: 1
        });

        collector.on('collect', async (selectInteraction) => {
            if (selectInteraction.user.id !== message.author.id) {
                return selectInteraction.reply({ content: "❌ This menu isn't for you!", ephemeral: true });
            }

            const selectedType = selectInteraction.values[0];
            const typeInfo = LOA_TYPES[selectedType];

            const modal = new ModalBuilder()
                .setCustomId(`loa_cmd_modal_${selectedType}`)
                .setTitle(`${typeInfo.emoji} ${typeInfo.name} Request`);

            const durationInput = new TextInputBuilder()
                .setCustomId('loa_duration')
                .setLabel('Duration (e.g., 3d, 1w, 2weeks)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId('loa_reason')
                .setLabel('Reason for leave')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(durationInput),
                new ActionRowBuilder().addComponents(reasonInput)
            );

            await selectInteraction.showModal(modal);

            try {
                const modalSubmit = await selectInteraction.awaitModalSubmit({
                    filter: (i) => i.customId === `loa_cmd_modal_${selectedType}` && i.user.id === message.author.id,
                    time: 300000
                });

                await processLOASubmission(modalSubmit, selectedType, loaService, message.guild);
            } catch (e) {}
        });

        return;
    }

    const [loaType, duration, ...reasonParts] = args;
    const reason = reasonParts.join(' ') || 'No reason provided';

    const typeInfo = loaService.getLOAType(loaType);
    if (!typeInfo) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Invalid LOA Type!")
                .setDescription(`**"${loaType}"** is not valid!\n\n**Available:** 🏖️ vacation • 🤒 sick • 🏠 personal • 🚨 emergency • 📚 training`)
            ]
        });
    }

    const endDate = loaService.parseDate(duration);
    if (!endDate || endDate <= new Date()) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Invalid Duration!")
                .setDescription("Please provide a valid future duration!\n\n**Formats:** `3d`, `1w`, `2weeks`, `1m`")
            ]
        });
    }

    const result = await loaService.createRequest(
        message.author.id,
        message.guild.id,
        loaType,
        endDate,
        reason,
        message.member
    );

    if (!result.success) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Request Failed!")
                .setDescription(result.error)
            ]
        });
    }

    const request = result.request;
    const durationDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle(`${request.typeEmoji} LOA Request Submitted! ⏳`)
        .setDescription(`${loaService.getRandomCelebration()} Your request has been submitted for approval!`)
        .addFields(
            { name: "📋 Request ID", value: `\`${request.requestId}\``, inline: true },
            { name: `${request.typeEmoji} Type`, value: request.typeName, inline: true },
            { name: "📅 Duration", value: `${durationDays} day(s)`, inline: true },
            { name: "🗓️ Period", value: `${moment().format('MMM Do')} → ${moment(endDate).format('MMM Do, YYYY')}`, inline: true },
            { name: "⏰ Returns", value: moment(endDate).fromNow(), inline: true },
            { name: "⏳ Status", value: "Pending Approval", inline: true },
            { name: "📝 Reason", value: reason, inline: false }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "A Lead+ staff member will review your request" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function processLOASubmission(modalSubmit, selectedType, loaService, guild) {
    const duration = modalSubmit.fields.getTextInputValue('loa_duration');
    const reason = modalSubmit.fields.getTextInputValue('loa_reason');

    const endDate = loaService.parseDate(duration);
    if (!endDate || endDate <= new Date()) {
        return modalSubmit.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Invalid Duration!")
                .setDescription("Please provide a valid future duration!")
            ],
            ephemeral: true
        });
    }

    const result = await loaService.createRequest(
        modalSubmit.user.id,
        guild.id,
        selectedType,
        endDate,
        reason,
        modalSubmit.member
    );

    if (!result.success) {
        return modalSubmit.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Request Failed!")
                .setDescription(result.error)
            ],
            ephemeral: true
        });
    }

    const request = result.request;
    const durationDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

    await modalSubmit.reply({
        embeds: [new EmbedBuilder()
            .setColor("#FEE75C")
            .setTitle(`${request.typeEmoji} LOA Request Submitted! ⏳`)
            .setDescription(`${loaService.getRandomCelebration()} Your request has been submitted!`)
            .addFields(
                { name: "📋 Request ID", value: `\`${request.requestId}\``, inline: true },
                { name: `${request.typeEmoji} Type`, value: request.typeName, inline: true },
                { name: "📅 Duration", value: `${durationDays} day(s)`, inline: true },
                { name: "📝 Reason", value: reason, inline: false }
            )
            .setFooter({ text: "A Lead+ staff member will review your request" })
            .setTimestamp()
        ]
    });
}

async function handleApprove(client, message, args, loaService) {
    if (!loaService.hasLeadPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Lead+ staff** can approve LOA requests!")
            ]
        });
    }

    const requestId = args[0];
    if (!requestId) {
        const pending = loaService.getPendingRequests(message.guild.id);
        if (pending.length === 0) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("✅ No Pending Requests!")
                    .setDescription("All LOA requests have been reviewed! 🎉")
                ]
            });
        }
        
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Missing Request ID!")
                .setDescription(`**Pending Requests (${pending.length}):**\n${pending.slice(0, 5).map(r => `\`${r.requestId}\` - <@${r.userId}> (${r.typeName})`).join('\n')}\n\n**Usage:** \`,loa approve <requestId>\``)
            ]
        });
    }

    const result = await loaService.approveRequest(requestId.toUpperCase(), message.author.id, message.guild);

    if (!result.success) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Approval Failed!")
                .setDescription(result.error)
            ]
        });
    }

    const request = result.request;
    const member = await message.guild.members.fetch(request.userId).catch(() => null);

    const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle(`${loaService.getRandomCelebration()} LOA APPROVED! ${loaService.getRandomCelebration()}`)
        .setDescription(`**The leave of absence has been approved!**\n\n${loaService.getRandomExcitement()}`)
        .addFields(
            { name: "👤 Staff Member", value: `<@${request.userId}>`, inline: true },
            { name: `${request.typeEmoji} Type`, value: request.typeName, inline: true },
            { name: "📅 Until", value: moment(request.endDate).format('MMM Do, YYYY'), inline: true },
            { name: "📝 Reason", value: request.reason, inline: false },
            { name: "✅ Approved By", value: `<@${message.author.id}>`, inline: true },
            { name: "🔄 Roles Removed", value: request.removedRoles.length > 0 ? `${request.removedRoles.length} role(s)` : 'None', inline: true }
        )
        .setThumbnail(member?.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Roles will be restored on return" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleDeny(client, message, args, loaService) {
    if (!loaService.hasLeadPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Lead+ staff** can deny LOA requests!")
            ]
        });
    }

    const requestId = args[0];
    const denyReason = args.slice(1).join(' ') || 'No reason provided';

    if (!requestId) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Missing Request ID!")
                .setDescription("**Usage:** `,loa deny <requestId> [reason]`")
            ]
        });
    }

    const result = await loaService.denyRequest(requestId.toUpperCase(), message.author.id, denyReason);

    if (!result.success) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Denial Failed!")
                .setDescription(result.error)
            ]
        });
    }

    const request = result.request;

    const embed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle("❌ LOA Request Denied")
        .setDescription("The leave of absence request has been denied.")
        .addFields(
            { name: "👤 Staff Member", value: `<@${request.userId}>`, inline: true },
            { name: `${request.typeEmoji} Type`, value: request.typeName, inline: true },
            { name: "📅 Requested Until", value: moment(request.endDate).format('MMM Do, YYYY'), inline: true },
            { name: "❌ Denied By", value: `<@${message.author.id}>`, inline: true },
            { name: "📝 Denial Reason", value: denyReason, inline: false }
        )
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleAssign(client, message, args, loaService) {
    if (!loaService.hasLeadPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Lead+ staff** can assign LOA coverage!")
            ]
        });
    }

    const requestId = args[0];
    const coverUser = message.mentions.users.first();

    if (!requestId || !coverUser) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Missing Information!")
                .setDescription("**Usage:** `,loa assign <requestId> @user`")
            ]
        });
    }

    const result = await loaService.assignCoverage(requestId.toUpperCase(), coverUser.id, message.guild);

    if (!result.success) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Assignment Failed!")
                .setDescription(result.error)
            ]
        });
    }

    const request = result.request;

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("✅ Coverage Assigned!")
        .setDescription("**Coverage has been successfully assigned!** 🎉")
        .addFields(
            { name: "🌴 Staff on LOA", value: `<@${request.userId}>`, inline: true },
            { name: "🛡️ Coverage By", value: `<@${coverUser.id}>`, inline: true },
            { name: "📅 Until", value: moment(request.endDate).format('MMM Do, YYYY'), inline: true },
            { name: `${request.typeEmoji} LOA Type`, value: request.typeName, inline: true },
            { name: "⏰ Returns", value: moment(request.endDate).fromNow(), inline: true }
        )
        .setFooter({ text: "Coverage user has been notified" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleList(client, message, args, loaService) {
    const activeRequests = loaService.getActiveRequests(message.guild.id);

    if (activeRequests.length === 0) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("✅ All Hands On Deck!")
                .setDescription("**No staff members are currently on leave!** 🎉\n\nEveryone is here and ready to help!")
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
            ]
        });
    }

    let description = '';
    for (const request of activeRequests.slice(0, 10)) {
        const member = await message.guild.members.fetch(request.userId).catch(() => null);
        const username = member ? member.user.username : 'Unknown';
        description += `${request.typeEmoji} **${username}**\n`;
        description += `├ \`${request.requestId}\` • Returns: ${moment(request.endDate).format('MMM Do')} (${moment(request.endDate).fromNow()})\n`;
        description += `└ ${request.reason.substring(0, 50)}${request.reason.length > 50 ? '...' : ''}\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`🌴 Active LOAs (${activeRequests.length})`)
        .setDescription(description)
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setFooter({ text: "Sorted by return date" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleStatus(client, message, args, loaService) {
    const targetUser = message.mentions.users.first() || message.author;
    const userRequests = loaService.getUserRequests(targetUser.id);

    if (userRequests.length === 0) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("📋 LOA Status")
                .setDescription(`${targetUser.id === message.author.id ? 'You have' : `**${targetUser.username}** has`} no LOA history!`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            ]
        });
    }

    const activeRequest = userRequests.find(r => r.status === 'APPROVED' || r.status === 'PENDING');
    
    let description = `**Total Requests:** ${userRequests.length}\n\n`;
    if (activeRequest) {
        const statusInfo = LOA_STATUS[activeRequest.status];
        description += `**Current LOA:**\n` +
            `${statusInfo.emoji} **Status:** ${statusInfo.name}\n` +
            `${activeRequest.typeEmoji} **Type:** ${activeRequest.typeName}\n` +
            `📅 **Duration:** ${moment(activeRequest.startDate).format('MMM Do')} → ${moment(activeRequest.endDate).format('MMM Do, YYYY')}\n` +
            `⏰ **Returns:** ${moment(activeRequest.endDate).fromNow()}\n` +
            `📝 **Reason:** ${activeRequest.reason}`;
    }

    const embed = new EmbedBuilder()
        .setColor(activeRequest ? loaService.getStatusColor(activeRequest.status) : "#5865F2")
        .setTitle(`📋 LOA Status - ${targetUser.username}`)
        .setDescription(description)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleCalendar(client, message, args, loaService) {
    const calendarData = loaService.getCalendarData(message.guild.id);
    
    let calendarView = '```\n';
    calendarView += `     ${calendarData.monthName} ${calendarData.year}\n`;
    calendarView += ' Su Mo Tu We Th Fr Sa\n';
    
    const daysInMonth = new Date(calendarData.year, calendarData.month + 1, 0).getDate();
    const firstDay = new Date(calendarData.year, calendarData.month, 1).getDay();
    
    let dayCount = 1;
    for (let week = 0; week < 6; week++) {
        let weekStr = '';
        for (let day = 0; day < 7; day++) {
            if (week === 0 && day < firstDay) {
                weekStr += '   ';
            } else if (dayCount <= daysInMonth) {
                const hasLOA = calendarData.entries.some(entry => {
                    const start = new Date(entry.startDate);
                    const end = new Date(entry.endDate);
                    const checkDate = new Date(calendarData.year, calendarData.month, dayCount);
                    return checkDate >= start && checkDate <= end;
                });
                weekStr += hasLOA ? `[${String(dayCount).padStart(2, ' ')}]` : ` ${String(dayCount).padStart(2, ' ')} `;
                dayCount++;
            }
        }
        calendarView += weekStr + '\n';
        if (dayCount > daysInMonth) break;
    }
    calendarView += '```';

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`📅 LOA Calendar - ${calendarData.monthName} ${calendarData.year}`)
        .setDescription(calendarView + '\n`[XX]` = Days with active LOAs')
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    if (calendarData.entries.length > 0) {
        const entryList = calendarData.entries.slice(0, 5).map(e => 
            `${e.emoji} <@${e.userId}>: ${moment(e.startDate).format('MMM D')} - ${moment(e.endDate).format('MMM D')}`
        ).join('\n');
        embed.addFields({ name: "🌴 This Month's LOAs", value: entryList, inline: false });
    }

    await message.reply({ embeds: [embed] });
}

async function handleEnd(client, message, args, loaService) {
    const userRequest = loaService.getUserActiveRequest(message.author.id);
    
    if (!userRequest || userRequest.status !== 'APPROVED') {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ No Active LOA!")
                .setDescription("You don't have an active LOA to end!")
            ]
        });
    }

    const result = await loaService.endLOA(userRequest.requestId, message.author.id, message.guild);
    
    if (!result.success) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Failed to End LOA!")
                .setDescription(result.error)
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle("🎉 Welcome Back!")
        .setDescription(`Your LOA has been ended and your roles have been restored!\n\n${loaService.getRandomExcitement()}`)
        .addFields(
            { name: "📅 LOA Duration", value: moment(result.request.startDate).from(moment(), true), inline: true },
            { name: "🔄 Roles Restored", value: `${result.request.removedRoles.length} role(s)`, inline: true }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handlePending(client, message, loaService) {
    if (!loaService.hasLeadPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Lead+ staff** can view pending requests!")
            ]
        });
    }

    const pending = loaService.getPendingRequests(message.guild.id);
    
    if (pending.length === 0) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("✅ No Pending Requests!")
                .setDescription("All LOA requests have been reviewed! 🎉")
            ]
        });
    }

    let description = '';
    for (const request of pending.slice(0, 10)) {
        const member = await message.guild.members.fetch(request.userId).catch(() => null);
        const username = member ? member.user.username : 'Unknown';
        const durationDays = Math.ceil((new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24));
        
        description += `${request.typeEmoji} **${username}**\n`;
        description += `├ 📋 ID: \`${request.requestId}\`\n`;
        description += `├ 📅 Duration: ${durationDays} days (until ${moment(request.endDate).format('MMM Do')})\n`;
        description += `├ 📝 ${request.reason.substring(0, 50)}${request.reason.length > 50 ? '...' : ''}\n`;
        description += `└ ⏰ Submitted: ${moment(request.createdAt).fromNow()}\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle(`⏳ Pending Requests (${pending.length})`)
        .setDescription(description)
        .addFields({
            name: "💡 Quick Actions",
            value: "`,loa approve <ID>` - Approve request\n`,loa deny <ID> [reason]` - Deny request",
            inline: false
        })
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

function showTypes(client, message) {
    let typesDescription = '';
    for (const [key, value] of Object.entries(LOA_TYPES)) {
        typesDescription += `${value.emoji} **${value.name}**\n`;
        typesDescription += `├ Max Duration: **${value.maxDays} days**\n`;
        typesDescription += `└ Use: \`${key.toLowerCase()}\`\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📚 Available LOA Types")
        .setDescription(typesDescription)
        .addFields({
            name: "💡 How to Use",
            value: "`,loa request vacation 1w Going to the beach!`\n`,loa request sick 3d Not feeling well`",
            inline: false
        })
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function handleStats(client, message, loaService) {
    const allRequests = loaService.getAllGuildRequests(message.guild.id);
    
    const stats = {
        total: allRequests.length,
        pending: allRequests.filter(r => r.status === 'PENDING').length,
        approved: allRequests.filter(r => r.status === 'APPROVED').length,
        completed: allRequests.filter(r => r.status === 'COMPLETED').length,
        denied: allRequests.filter(r => r.status === 'DENIED').length
    };

    const avgDuration = allRequests.length > 0 
        ? Math.round(allRequests.reduce((sum, r) => {
            const days = Math.ceil((new Date(r.endDate) - new Date(r.startDate)) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0) / allRequests.length)
        : 0;

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📊 LOA Statistics")
        .setDescription("**Server-wide LOA analytics:**")
        .addFields(
            { name: "📋 Total Requests", value: `${stats.total}`, inline: true },
            { name: "⏳ Pending", value: `${stats.pending}`, inline: true },
            { name: "🌴 Active", value: `${stats.approved}`, inline: true },
            { name: "✅ Completed", value: `${stats.completed}`, inline: true },
            { name: "❌ Denied", value: `${stats.denied}`, inline: true },
            { name: "📅 Avg Duration", value: `${avgDuration} days`, inline: true }
        )
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setFooter({ text: "Staff Management System" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleExtend(client, message, args, loaService) {
    const userRequest = loaService.getUserActiveRequest(message.author.id);
    
    if (!userRequest || userRequest.status !== 'APPROVED') {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ No Active LOA!")
                .setDescription("You don't have an active LOA to extend!")
            ]
        });
    }

    const newDuration = args[0];
    if (!newDuration) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Missing Duration!")
                .setDescription("**Usage:** `,loa extend <duration>`\n\n**Example:** `,loa extend 3d` to extend by 3 days")
            ]
        });
    }

    const additionalTime = loaService.parseDate(newDuration);
    if (!additionalTime) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Invalid Duration!")
                .setDescription("Please provide a valid duration like `3d`, `1w`, or `2weeks`")
            ]
        });
    }

    const result = await loaService.extendLOA(userRequest.requestId, additionalTime, message.author.id);
    
    if (!result.success) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Extension Failed!")
                .setDescription(result.error)
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle("⏳ LOA Extension Requested!")
        .setDescription("Your LOA extension request has been submitted for approval!")
        .addFields(
            { name: "📅 Original End Date", value: moment(userRequest.endDate).format('MMM Do, YYYY'), inline: true },
            { name: "📅 New End Date", value: moment(result.newEndDate).format('MMM Do, YYYY'), inline: true }
        )
        .setFooter({ text: "A Lead+ staff member will review your extension" })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}
