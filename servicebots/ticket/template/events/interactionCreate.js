const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        const maintenanceMode = client.database.getMaintenanceMode();
        const botOwnerId = process.env.BOT_OWNER_ID;

        if (maintenanceMode.enabled && interaction.user.id !== botOwnerId) {
            const maintenanceEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('🔧 Maintenance Mode')
                .setDescription(
                    '**The bot is currently undergoing maintenance.**\n\n' +
                    'All commands and ticket features are temporarily disabled.\n' +
                    'Please try again later. We apologize for any inconvenience.'
                )
                .setFooter({ text: 'Maintenance started' })
                .setTimestamp(maintenanceMode.enabledAt);

            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                return interaction.reply({
                    embeds: [maintenanceEmbed],
                    flags: MessageFlags.Ephemeral
                });
            } else if (interaction.isModalSubmit()) {
                return interaction.reply({
                    embeds: [maintenanceEmbed],
                    flags: MessageFlags.Ephemeral
                });
            } else if (interaction.isChatInputCommand() && interaction.commandName !== 'maintenance') {
                return interaction.reply({
                    embeds: [maintenanceEmbed],
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error('Command error:', error);
                const reply = { content: '❌ An error occurred executing this command.', flags: MessageFlags.Ephemeral };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        } else if (interaction.isButton()) {
            await handleButton(interaction, client);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction, client);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction, client);
        }
    }
};

async function handleButton(interaction, client) {
    const { customId } = interaction;

    console.log(`🔘 Button clicked - ID: ${customId}`);

    if (customId.startsWith('ticket_create_')) {
        const ticketType = customId.replace('ticket_create_', '');
        console.log(`Extracted ticket type: ${ticketType}`);
        await showPrioritySelect(interaction, ticketType, client);
    } else if (customId === 'panel_refresh') {
        await refreshPanel(interaction, client);
    } else if (customId === 'panel_faq') {
        await showFAQ(interaction, client);
    } else if (customId === 'ticket_claim') {
        await claimTicket(interaction, client);
    } else if (customId === 'ticket_close') {
        await closeTicket(interaction, client);
    } else if (customId === 'ticket_reopen') {
        await reopenTicket(interaction, client);
    } else if (customId === 'ticket_add_member') {
        await interaction.reply({
            content: '👥 Use `/ticket-add <user>` to add a member to this ticket.',
            flags: MessageFlags.Ephemeral
        });
    } else if (customId === 'ticket_request_info') {
        await requestInfo(interaction, client);
    } else if (customId === 'ticket_request_files') {
        await requestFiles(interaction, client);
    } else if (customId === 'ticket_create_voice') {
        await createVoiceChannel(interaction, client);
    } else if (customId.startsWith('rating_')) {
        await submitRating(interaction, client);
    } else if (customId.startsWith('category_save_')) {
        await handleCategorySave(interaction, client);
    } else if (customId.startsWith('category_enable_all_')) {
        await handleCategoryEnableAll(interaction, client);
    } else if (customId.startsWith('category_disable_all_')) {
        await handleCategoryDisableAll(interaction, client);
    } else if (customId.startsWith('category_page_')) {
        await handleCategoryPagination(interaction, client);
    }
}

async function showPrioritySelect(interaction, ticketType, client) {
    console.log(`🎫 Ticket button clicked - Type: ${ticketType}`);
    
    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    const customCategories = serverConfig.customCategories || {};
    const allCategories = { ...config.ticketCategories, ...customCategories };
    
    console.log(`Available categories:`, Object.keys(allCategories));
    console.log(`Looking for category: ${ticketType}`);
    
    const categoryConfig = allCategories[ticketType];
    
    console.log(`Category config found:`, categoryConfig ? 'YES' : 'NO');
    
    if (!categoryConfig) {
        console.log(`❌ Category "${ticketType}" not found in available categories`);
        return interaction.reply({
            content: '❌ This ticket category is not available.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    const prioritySelect = new StringSelectMenuBuilder()
        .setCustomId(`priority_select_${ticketType}`)
        .setPlaceholder('Select ticket priority')
        .addOptions([
            {
                label: 'Low Priority',
                description: 'Non-urgent, general inquiries',
                value: 'low',
                emoji: config.priorityLevels.low.emoji
            },
            {
                label: 'Medium Priority',
                description: 'Standard issues needing attention',
                value: 'medium',
                emoji: config.priorityLevels.medium.emoji
            },
            {
                label: 'High Priority',
                description: 'Important issues affecting usage',
                value: 'high',
                emoji: config.priorityLevels.high.emoji
            },
            {
                label: 'Urgent',
                description: 'Critical issues requiring immediate help',
                value: 'urgent',
                emoji: config.priorityLevels.urgent.emoji
            }
        ]);

    const row = new ActionRowBuilder().addComponents(prioritySelect);

    await interaction.reply({
        content: `Creating ${categoryConfig.emoji} **${categoryConfig.label}** ticket.\nPlease select the priority level:`,
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

async function handleSelectMenu(interaction, client) {
    const { customId, values } = interaction;

    if (customId.startsWith('priority_select_')) {
        const ticketType = customId.replace('priority_select_', '');
        const priority = values[0];
        await showTicketModal(interaction, ticketType, priority, client);
    } else if (customId.startsWith('category_toggle_')) {
        await handleCategoryToggle(interaction, client);
    }
}

async function showTicketModal(interaction, ticketType, priority, client) {
    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    const customCategories = serverConfig.customCategories || {};
    const allCategories = { ...config.ticketCategories, ...customCategories };
    const categoryConfig = allCategories[ticketType];
    
    const activeTickets = client.database.getUserActiveTickets(interaction.guild.id, interaction.user.id);
    const maxTickets = serverConfig.maxTicketsPerUser || 3;

    if (activeTickets.length >= maxTickets) {
        return interaction.update({
            content: `❌ You already have ${activeTickets.length} active ticket(s). Maximum allowed: ${maxTickets}`,
            components: [],
            flags: MessageFlags.Ephemeral
        });
    }

    const cooldown = client.database.getCooldown(interaction.guild.id, interaction.user.id);
    if (serverConfig.cooldownEnabled && cooldown) {
        const cooldownTime = serverConfig.ticketCooldownMs || config.ticketCooldown;
        const timeLeft = cooldownTime - (Date.now() - cooldown);
        if (timeLeft > 0) {
            const minutes = Math.ceil(timeLeft / 60000);
            return interaction.update({
                content: `⏰ You must wait ${minutes} minute(s) before creating another ticket.`,
                components: [],
                flags: MessageFlags.Ephemeral
            });
        }
    }

    const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${ticketType}_${priority}`)
        .setTitle(`${categoryConfig.emoji} ${categoryConfig.label}`);

    const reasonInput = new TextInputBuilder()
        .setCustomId('ticket_reason')
        .setLabel('Reason for ticket')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Please describe your issue in detail')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    const extraInput = new TextInputBuilder()
        .setCustomId('ticket_extra')
        .setLabel(ticketType === 'report' ? 'Player Name / Player ID' : 'Additional Information')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(200);

    modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(extraInput)
    );

    await interaction.showModal(modal);
}

async function handleModalSubmit(interaction, client) {
    if (interaction.customId.startsWith('ticket_modal_')) {
        const parts = interaction.customId.replace('ticket_modal_', '').split('_');
        const priority = parts.pop();
        const ticketType = parts.join('_');
        await createTicket(interaction, client, ticketType, priority);
    } else if (interaction.customId.startsWith('rating_modal_')) {
        await saveRatingWithComment(interaction, client);
    }
}

async function createTicket(interaction, client, ticketType, priority) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    const customCategories = serverConfig.customCategories || {};
    const allCategories = { ...config.ticketCategories, ...customCategories };
    const categoryConfig = allCategories[ticketType];
    
    const categoryId = serverConfig.categories?.[ticketType] || null;
    
    if (categoryId) {
        const category = interaction.guild.channels.cache.get(categoryId);
        if (!category) {
            console.warn(`Category ${categoryId} for ticket type ${ticketType} not found. Creating ticket without category.`);
        }
    }

    const ticketNumber = client.database.incrementTicketCounter(interaction.guild.id);
    const channelName = `${ticketType}-${interaction.user.username}-${ticketNumber}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const reason = interaction.fields.getTextInputValue('ticket_reason');
    const description = interaction.fields.getTextInputValue('ticket_description');
    const extra = interaction.fields.getTextInputValue('ticket_extra') || 'N/A';

    try {
        const channelCreateOptions = {
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: client.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
                },
                ...serverConfig.staffRoles.map(roleId => ({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
                }))
            ]
        };

        if (categoryId && interaction.guild.channels.cache.get(categoryId)) {
            channelCreateOptions.parent = categoryId;
        }

        const ticketChannel = await interaction.guild.channels.create(channelCreateOptions);

        client.database.createTicket(interaction.guild.id, ticketChannel.id, {
            userId: interaction.user.id,
            username: interaction.user.tag,
            type: ticketType,
            priority,
            reason,
            description,
            extra,
            claimed: null,
            tags: []
        });

        client.database.setCooldown(interaction.guild.id, interaction.user.id);

        const queuePosition = serverConfig.queueEnabled ? client.database.getQueuePosition(interaction.guild.id, ticketChannel.id) : 0;
        const avgWaitTime = Math.round(client.database.getAverageWaitTime(interaction.guild.id) / 60000);

        const priorityConfig = config.priorityLevels[priority];
        const ticketEmbed = new EmbedBuilder()
            .setColor(priorityConfig.color)
            .setTitle(`${categoryConfig.emoji} ${categoryConfig.label} Ticket`)
            .setDescription(
                `**Created by:** ${interaction.user}\n` +
                `**Priority:** ${priorityConfig.emoji} ${priorityConfig.label}\n` +
                (serverConfig.queueEnabled && queuePosition > 0 ? `**Queue Position:** #${queuePosition}\n**Est. Wait Time:** ~${avgWaitTime} min\n` : '') +
                `**Reason:** ${reason}\n` +
                `**Description:** ${description}\n` +
                `**${ticketType === 'report' ? 'Player Name/ID' : 'Additional Info'}:** ${extra}`
            )
            .setFooter({ text: `Ticket #${ticketNumber} • ${priorityConfig.label} Priority` })
            .setTimestamp();

        const staffButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_claim')
                .setLabel('Claim Ticket')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_add_member')
                .setLabel('Add Member')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_request_info')
                .setLabel('Request Info')
                .setEmoji('🗒')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Close')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );

        const extraButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_request_files')
                .setLabel('Request Files')
                .setEmoji('📎')
                .setStyle(ButtonStyle.Secondary)
        );

        if (serverConfig.voiceTicketsEnabled) {
            extraButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create_voice')
                    .setLabel('Create Voice Channel')
                    .setEmoji('🎙️')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        const components = [staffButtons];
        if (serverConfig.voiceTicketsEnabled || config.transcriptEnabled) {
            components.push(extraButtons);
        }

        await ticketChannel.send({
            content: `${interaction.user} ${serverConfig.staffRoles.map(r => `<@&${r}>`).join(' ')}`,
            embeds: [ticketEmbed],
            components
        });

        const autoResponseMessages = {
            support: '👋 Thanks for contacting support! A staff member will be with you shortly. Please provide any additional details about your issue below.',
            verify: '✅ Thank you for your verification request! A staff member will assist you with the verification process shortly.',
            general: '💬 Thanks for reaching out! A staff member will be with you soon to help with your question.',
            report: '⚠️ Thank you for submitting a player report. Please provide all relevant evidence (screenshots, videos, player names/IDs) to help staff review this case.',
            purchases: '🛒 Thank you for contacting us about your purchase! A staff member will assist you shortly. Please have your order details ready.',
            redeemGiveaways: '🎁 Thank you for your giveaway redemption request! A staff member will help you claim your prize shortly.',
            redeemPurchases: '🎟️ Thank you for your purchase redemption request! A staff member will process this for you soon.'
        };

        if (autoResponseMessages[ticketType]) {
            await ticketChannel.send(autoResponseMessages[ticketType]);
        }

        await interaction.editReply({
            content: `✅ Ticket created! ${ticketChannel}\n${serverConfig.queueEnabled && queuePosition > 0 ? `You are #${queuePosition} in queue (Est. wait: ~${avgWaitTime} min)` : ''}`
        });

        if (serverConfig.logChannel) {
            const logChannel = interaction.guild.channels.cache.get(serverConfig.logChannel);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(priorityConfig.color)
                    .setTitle('🎫 New Ticket Created')
                    .setDescription(
                        `**User:** ${interaction.user}\n` +
                        `**Type:** ${categoryConfig.label}\n` +
                        `**Priority:** ${priorityConfig.emoji} ${priorityConfig.label}\n` +
                        `**Channel:** ${ticketChannel}\n` +
                        `**Reason:** ${reason}`
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        client.database.logAnalytics(interaction.guild.id, 'ticket_created', {
            type: ticketType,
            priority,
            userId: interaction.user.id
        });

        if (serverConfig.slaEnabled) {
            setTimeout(() => checkSLA(ticketChannel, client, serverConfig.slaTimeMinutes), serverConfig.slaTimeMinutes * 60000);
        }

        setTimeout(() => checkInactiveTicket(ticketChannel, client), config.autoCloseTimer);

    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.editReply({
            content: '❌ Failed to create ticket. Please contact an administrator.'
        });
    }
}

async function checkSLA(channel, client, slaMinutes) {
    try {
        const ticket = client.database.getTicket(channel.guild.id, channel.id);
        if (!ticket || ticket.status !== 'open' || ticket.claimed) return;

        const serverConfig = client.database.getServerConfig(channel.guild.id);
        const customCategories = serverConfig.customCategories || {};
        const allCategories = { ...config.ticketCategories, ...customCategories };
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('⚠️ SLA Alert: Unclaimed Ticket')
            .setDescription(
                `**Ticket:** ${channel}\n` +
                `**Created:** <t:${Math.floor(ticket.createdAt / 1000)}:R>\n` +
                `**User:** <@${ticket.userId}>\n` +
                `**Type:** ${allCategories[ticket.type]?.label || ticket.type}\n` +
                `**Priority:** ${config.priorityLevels[ticket.priority]?.emoji} ${ticket.priority}\n\n` +
                `⏰ This ticket has not been claimed within ${slaMinutes} minutes.`
            )
            .setTimestamp();

        if (serverConfig.logChannel) {
            const logChannel = channel.guild.channels.cache.get(serverConfig.logChannel);
            if (logChannel) {
                await logChannel.send({
                    content: serverConfig.staffRoles.map(r => `<@&${r}>`).join(' '),
                    embeds: [embed]
                });
            }
        }

        client.database.logAnalytics(channel.guild.id, 'sla_breach', {
            ticketId: channel.id,
            slaMinutes
        });

    } catch (error) {
        console.error('SLA check error:', error);
    }
}

async function claimTicket(interaction, client) {
    const ticket = client.database.getTicket(interaction.guild.id, interaction.channel.id);
    
    if (!ticket) {
        return interaction.reply({ content: '❌ This is not a ticket channel.', flags: MessageFlags.Ephemeral });
    }

    if (ticket.claimed) {
        return interaction.reply({ content: '❌ This ticket has already been claimed.', flags: MessageFlags.Ephemeral });
    }

    client.database.updateTicket(interaction.guild.id, interaction.channel.id, {
        claimed: interaction.user.id,
        claimedAt: Date.now()
    });

    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`✅ Ticket claimed by ${interaction.user}`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    client.database.logAnalytics(interaction.guild.id, 'ticket_claimed', {
        ticketId: interaction.channel.id,
        staffId: interaction.user.id
    });
}

async function closeTicket(interaction, client) {
    const ticket = client.database.getTicket(interaction.guild.id, interaction.channel.id);
    
    if (!ticket) {
        return interaction.reply({ content: '❌ This is not a ticket channel.', flags: MessageFlags.Ephemeral });
    }

    if (ticket.status === 'closed') {
        return interaction.reply({ content: '❌ This ticket is already closed.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    const responseTime = Date.now() - ticket.createdAt;
    client.database.closeTicket(interaction.guild.id, interaction.channel.id, interaction.user.id);

    if (ticket.claimed) {
        client.database.incrementStaffTickets(interaction.guild.id, ticket.claimed, responseTime);
    }

    const closeEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🔒 Ticket Closed')
        .setDescription(`This ticket has been closed by ${interaction.user}.\nThe channel will be deleted in 10 seconds.`)
        .setTimestamp();

    const reopenButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_reopen')
            .setLabel('Reopen Ticket')
            .setEmoji('♻️')
            .setStyle(ButtonStyle.Success)
    );

    await interaction.editReply({ embeds: [closeEmbed], components: [reopenButton] });

    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    if (serverConfig.logChannel) {
        const logChannel = interaction.guild.channels.cache.get(serverConfig.logChannel);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🔒 Ticket Closed')
                .setDescription(
                    `**User:** <@${ticket.userId}>\n` +
                    `**Type:** ${ticket.type}\n` +
                    `**Priority:** ${config.priorityLevels[ticket.priority]?.emoji} ${ticket.priority}\n` +
                    `**Closed by:** ${interaction.user}\n` +
                    `**Duration:** ${formatDuration(responseTime)}\n` +
                    `**Claimed by:** ${ticket.claimed ? `<@${ticket.claimed}>` : 'Unclaimed'}`
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }

    if (config.ratingEnabled) {
        try {
            const user = await client.users.fetch(ticket.userId);
            const ratingButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`rating_1_${interaction.guild.id}_${ticket.userId}`)
                    .setLabel('1')
                    .setEmoji('⭐')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`rating_2_${interaction.guild.id}_${ticket.userId}`)
                    .setLabel('2')
                    .setEmoji('⭐')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`rating_3_${interaction.guild.id}_${ticket.userId}`)
                    .setLabel('3')
                    .setEmoji('⭐')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`rating_4_${interaction.guild.id}_${ticket.userId}`)
                    .setLabel('4')
                    .setEmoji('⭐')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`rating_5_${interaction.guild.id}_${ticket.userId}`)
                    .setLabel('5')
                    .setEmoji('⭐')
                    .setStyle(ButtonStyle.Success)
            );

            const feedbackEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('📋 Rate Our Support')
                .setDescription(
                    `Your ticket has been closed in **${interaction.guild.name}**!\n\n` +
                    `How would you rate your experience? Click a star rating below:`
                );
            
            await user.send({ embeds: [feedbackEmbed], components: [ratingButtons] });
        } catch (error) {
            console.log('Could not DM user for feedback');
        }
    }

    client.database.logAnalytics(interaction.guild.id, 'ticket_closed', {
        ticketId: interaction.channel.id,
        duration: responseTime
    });

    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (error) {
            console.error('Error deleting ticket channel:', error);
        }
    }, 10000);
}

async function submitRating(interaction, client) {
    const parts = interaction.customId.split('_');
    const rating = parseInt(parts[1]);
    const guildId = parts[2];
    const userId = parts[3];

    client.database.addFeedback(guildId, userId, 'ticket', rating, '');

    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Thank You!')
        .setDescription(`Thank you for your ${rating}⭐ rating! We appreciate your feedback.`)
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
}

async function reopenTicket(interaction, client) {
    const ticket = client.database.getTicket(interaction.guild.id, interaction.channel.id);
    
    if (!ticket) {
        return interaction.reply({ content: '❌ This is not a ticket channel.', flags: MessageFlags.Ephemeral });
    }

    if (ticket.status !== 'closed') {
        return interaction.reply({ content: '❌ This ticket is not closed.', flags: MessageFlags.Ephemeral });
    }

    client.database.updateTicket(interaction.guild.id, interaction.channel.id, {
        status: 'open',
        reopenedBy: interaction.user.id,
        reopenedAt: Date.now()
    });

    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`♻️ Ticket reopened by ${interaction.user}`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    client.database.logAnalytics(interaction.guild.id, 'ticket_reopened', {
        ticketId: interaction.channel.id
    });
}

async function requestInfo(interaction, client) {
    await interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('ℹ️ Additional Information Requested')
            .setDescription('A staff member has requested more information. Please provide additional details about your issue.')
            .setTimestamp()]
    });
    await interaction.reply({ content: '✅ Info request sent!', flags: MessageFlags.Ephemeral });
}

async function requestFiles(interaction, client) {
    const ticket = client.database.getTicket(interaction.guild.id, interaction.channel.id);
    if (!ticket) return;

    await interaction.channel.send({
        content: `<@${ticket.userId}>`,
        embeds: [new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📎 Files Requested')
            .setDescription(
                '**A staff member has requested additional files.**\n\n' +
                'Please upload any relevant:\n' +
                '• Screenshots\n' +
                '• Error logs\n' +
                '• Screen recordings\n' +
                '• Documents\n\n' +
                'You can drag and drop files directly into this channel.'
            )
            .setFooter({ text: 'Files help us resolve your issue faster!' })
            .setTimestamp()]
    });
    await interaction.reply({ content: '✅ File request sent!', flags: MessageFlags.Ephemeral });
}

async function createVoiceChannel(interaction, client) {
    console.log(`🎙️ Voice channel creation requested in channel ${interaction.channel.id}`);
    
    const ticket = client.database.getTicket(interaction.guild.id, interaction.channel.id);
    
    console.log(`Ticket data:`, ticket);
    
    if (!ticket) {
        console.log(`❌ No ticket found for channel ${interaction.channel.id}`);
        return interaction.reply({ content: '❌ This is not a ticket channel.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    try {
        const voiceChannel = await interaction.guild.channels.create({
            name: `Voice-${interaction.channel.name}`,
            type: ChannelType.GuildVoice,
            parent: interaction.channel.parentId,
            permissionOverwrites: interaction.channel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                allow: overwrite.allow.toArray(),
                deny: overwrite.deny.toArray()
            }))
        });

        client.database.updateTicket(interaction.guild.id, interaction.channel.id, {
            voiceChannelId: voiceChannel.id
        });

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🎙️ Voice Channel Created')
            .setDescription(`Voice channel created: ${voiceChannel}\n\nJoin the voice channel to talk with staff!`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error creating voice channel:', error);
        await interaction.editReply({ content: '❌ Failed to create voice channel.' });
    }
}

async function refreshPanel(interaction, client) {
    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    
    if (!serverConfig.panelMessageId || !serverConfig.panelChannelId) {
        return interaction.reply({
            content: '❌ No panel found. Use `/ticket-panel` to create one.',
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        const channel = await interaction.guild.channels.fetch(serverConfig.panelChannelId);
        const message = await channel.messages.fetch(serverConfig.panelMessageId);
        
        const stats = client.database.getTicketStats(interaction.guild.id);
        const avgWaitTime = client.database.getAverageWaitTime(interaction.guild.id);
        const ratingStats = client.database.getRatingStats(interaction.guild.id);
        
        const waitMinutes = Math.round(avgWaitTime / 60000);
        const statusEmoji = serverConfig.statusOnline ? '🟢' : '🔴';
        const statusText = serverConfig.statusOnline ? 'Online' : 'Offline';
        
        const embed = new EmbedBuilder(message.embeds[0].data);
        embed.setDescription(
            `**${statusText} - Ready to help you!**\n` +
            `Select the category that best matches your needs below.\n\n` +
            `📊 **Current Stats**\n` +
            `• Open Tickets: **${stats.openTickets}**\n` +
            `• Avg Wait Time: **${waitMinutes > 0 ? waitMinutes + ' min' : 'Less than 1 min'}**\n` +
            `• Rating: **${ratingStats.avgRating > 0 ? ratingStats.avgRating.toFixed(1) + '/5.0 ⭐' : 'N/A'}**\n\n` +
            embed.data.description.split('━━━━━━━━━━━━━━━━━━━━━━\n\n')[1]
        );
        embed.setColor(serverConfig.statusOnline ? '#57F287' : '#ED4245');
        embed.setTimestamp();

        await message.edit({ embeds: [embed] });
        await interaction.reply({ content: '✅ Panel refreshed!', flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Panel refresh error:', error);
        await interaction.reply({ content: '❌ Failed to refresh panel.', flags: MessageFlags.Ephemeral });
    }
}

async function showFAQ(interaction, client) {
    const faqEmbed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('❓ Frequently Asked Questions')
        .setDescription('Here are some common questions and answers:')
        .setTimestamp();

    config.faqQuestions.forEach((faq, index) => {
        faqEmbed.addFields({
            name: `${index + 1}. ${faq.question}`,
            value: faq.answer,
            inline: false
        });
    });

    faqEmbed.setFooter({ text: 'Still need help? Create a ticket!' });

    await interaction.reply({ embeds: [faqEmbed], flags: MessageFlags.Ephemeral });
}

async function checkInactiveTicket(channel, client) {
    try {
        const ticket = client.database.getTicket(channel.guild.id, channel.id);
        if (!ticket || ticket.status !== 'open') return;

        const messages = await channel.messages.fetch({ limit: 10 });
        const lastMessage = messages.first();
        
        if (!lastMessage) return;

        const timeSinceLastMessage = Date.now() - lastMessage.createdTimestamp;
        
        if (timeSinceLastMessage >= config.autoCloseTimer - 3600000) {
            const warningEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('⏰ Inactivity Warning')
                .setDescription('This ticket will be automatically closed in 1 hour due to inactivity.')
                .setTimestamp();
            
            await channel.send({ embeds: [warningEmbed] });
        }
    } catch (error) {
        console.error('Error checking inactive ticket:', error);
    }
}

async function handleCategoryToggle(interaction, client) {
    const categoryCommand = require('../commands/ticket-category.js');
    const stateKey = `${interaction.guild.id}_${interaction.user.id}`;
    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    const customCategories = serverConfig.customCategories || {};
    const allCategories = { ...config.ticketCategories, ...customCategories };
    const allCategoryIds = Object.keys(allCategories);
    
    interaction.client.categorySelections = interaction.client.categorySelections || {};
    const currentSelections = interaction.client.categorySelections[stateKey] || [];
    
    const pageSelections = interaction.values || [];
    
    const categoriesPerPage = 25;
    const currentPage = client.categoryPages?.[stateKey] || 0;
    const startIndex = currentPage * categoriesPerPage;
    const endIndex = Math.min(startIndex + categoriesPerPage, allCategoryIds.length);
    const currentPageCategoryIds = allCategoryIds.slice(startIndex, endIndex);
    
    const selectionsFromOtherPages = currentSelections.filter(id => !currentPageCategoryIds.includes(id));
    const newSelections = [...selectionsFromOtherPages, ...pageSelections];
    
    interaction.client.categorySelections[stateKey] = newSelections;
    
    const components = categoryCommand.buildCategoryPage(interaction, client, currentPage);
    
    await interaction.update({
        embeds: components.embed,
        components: components.rows
    });
}

async function handleCategorySave(interaction, client) {
    const stateKey = `${interaction.guild.id}_${interaction.user.id}`;
    const selectedCategories = interaction.client.categorySelections?.[stateKey] || [];
    
    client.database.updateServerConfig(interaction.guild.id, {
        enabledCategories: selectedCategories
    });

    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    const customCategories = serverConfig.customCategories || {};
    const allCategories = { ...config.ticketCategories, ...customCategories };

    const successEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Categories Saved!')
        .setDescription(
            `**Enabled Categories:** ${selectedCategories.length}\n\n` +
            (selectedCategories.length > 0 
                ? `Categories enabled:\n` + selectedCategories.slice(0, 10).map(id => {
                    const cat = allCategories[id];
                    return cat ? `${cat.emoji} ${cat.label}` : id;
                }).join('\n') +
                (selectedCategories.length > 10 ? `\n...and ${selectedCategories.length - 10} more` : '')
                : '❌ No categories enabled'
            ) +
            `\n\n💡 Run \`/ticket-panel\` to update your ticket panel!`
        )
        .setTimestamp();

    await interaction.update({
        embeds: [successEmbed],
        components: [],
        content: null
    });
    
    delete interaction.client.categorySelections?.[stateKey];
    delete interaction.client.categoryPages?.[stateKey];
}

async function handleCategoryEnableAll(interaction, client) {
    const categoryCommand = require('../commands/ticket-category.js');
    const stateKey = `${interaction.guild.id}_${interaction.user.id}`;
    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    const customCategories = serverConfig.customCategories || {};
    const allCategories = { ...config.ticketCategories, ...customCategories };
    const allCategoryIds = Object.keys(allCategories);
    
    interaction.client.categorySelections = interaction.client.categorySelections || {};
    interaction.client.categorySelections[stateKey] = allCategoryIds;
    
    const currentPage = client.categoryPages?.[stateKey] || 0;
    const components = categoryCommand.buildCategoryPage(interaction, client, currentPage);
    
    await interaction.update({
        embeds: components.embed,
        components: components.rows
    });
}

async function handleCategoryDisableAll(interaction, client) {
    const categoryCommand = require('../commands/ticket-category.js');
    const stateKey = `${interaction.guild.id}_${interaction.user.id}`;
    
    interaction.client.categorySelections = interaction.client.categorySelections || {};
    interaction.client.categorySelections[stateKey] = [];
    
    const currentPage = client.categoryPages?.[stateKey] || 0;
    const components = categoryCommand.buildCategoryPage(interaction, client, currentPage);
    
    await interaction.update({
        embeds: components.embed,
        components: components.rows
    });
}

async function handleCategoryPagination(interaction, client) {
    const categoryCommand = require('../commands/ticket-category.js');
    const stateKey = `${interaction.guild.id}_${interaction.user.id}`;
    
    client.categoryPages = client.categoryPages || {};
    const currentPage = client.categoryPages[stateKey] || 0;
    
    let newPage = currentPage;
    if (interaction.customId.includes('_next_')) {
        newPage = currentPage + 1;
    } else if (interaction.customId.includes('_prev_')) {
        newPage = currentPage - 1;
    }
    
    client.categoryPages[stateKey] = newPage;
    
    const components = categoryCommand.buildCategoryPage(interaction, client, newPage);
    
    await interaction.update({
        embeds: components.embed,
        components: components.rows
    });
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
