const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const VerificationService = require('../../verification/verificationService.js');
const mainconfig = require("../../../mainconfig.js");

async function handleVerify(client, interaction) {
    const verificationService = new VerificationService(client);
    const config = mainconfig.DeadLoomVerification;

    if (verificationService.isAlreadyVerified(interaction.user.id, interaction.member)) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Already Verified!')
                .setDescription('You are already verified and have the **Code Access** role.')
                .setFooter({ text: 'DeadLoom Subscription Verification' })
            ],
            ephemeral: true
        });
    }

    const cooldownCheck = verificationService.isOnCooldown(interaction.user.id);
    if (cooldownCheck.onCooldown) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⏳ Cooldown Active')
                .setDescription(`You recently submitted a verification.\nPlease wait **${cooldownCheck.hoursLeft} hours** before trying again.`)
                .setFooter({ text: 'DeadLoom Subscription Verification' })
            ],
            ephemeral: true
        });
    }

    const attachment = interaction.options.getAttachment('screenshot');

    if (!attachment) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📋 DeadLoom Subscription Verification')
                .setDescription(`To get access to the **Code Access** role, you need to:\n\n1️⃣ Subscribe to **${config.ChannelName || 'deadloom'}**\n2️⃣ Take a screenshot showing you're subscribed\n3️⃣ Use \`/verify screenshot:[your image]\` to submit`)
                .addFields(
                    { name: '📸 Screenshot Requirements', value: '• Show the channel name clearly\n• Show the "Subscribed" button\n• Must be a clear, readable image' }
                )
                .setFooter({ text: 'DeadLoom Subscription Verification' })
            ],
            ephemeral: true
        });
    }

    const isImage = attachment.contentType?.startsWith('image/');
    if (!isImage) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Invalid File Type')
                .setDescription('Please upload an **image** file (PNG, JPG, JPEG, GIF).')
                .setFooter({ text: 'DeadLoom Subscription Verification' })
            ],
            ephemeral: true
        });
    }

    const verification = await verificationService.addVerification(
        interaction.user.id,
        'pending',
        attachment.url
    );

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📋 Verification Submitted!')
            .setDescription(`Your screenshot has been submitted for review.\n\n**Verification ID:** \`${verification.id}\``)
            .addFields(
                { name: '📺 Checking for', value: `Subscription to **${config.ChannelName || 'deadloom'}**`, inline: true },
                { name: '⏳ Status', value: 'Pending Review', inline: true }
            )
            .setImage(attachment.url)
            .setFooter({ text: 'A staff member will review your submission shortly' })
            .setTimestamp()
        ],
        ephemeral: true
    });

    if (config.LoggingChannelID) {
        let logChannel = interaction.guild.channels.cache.get(config.LoggingChannelID);
        if (!logChannel) {
            logChannel = await interaction.guild.channels.fetch(config.LoggingChannelID).catch(() => null);
        }
        if (logChannel) {
            const stats = verificationService.getUserStats(interaction.user.id);

            const reviewButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_approve_${verification.id}_${interaction.user.id}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`verify_deny_${verification.id}_${interaction.user.id}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId(`verify_stats_${interaction.user.id}`)
                    .setLabel('View Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

            const logEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔔 New Verification Request (Slash Command)')
                .setDescription(`**User:** <@${interaction.user.id}> (${interaction.user.tag})`)
                .addFields(
                    { name: '📋 Verification ID', value: `\`${verification.id}\``, inline: true },
                    { name: '📊 Previous Attempts', value: `Total: ${stats.total} | Denied: ${stats.denied}`, inline: true },
                    { name: '📺 Channel', value: config.ChannelName || 'deadloom', inline: true }
                )
                .setImage(attachment.url)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Click buttons below to approve or deny' });

            await logChannel.send({ embeds: [logEmbed], components: [reviewButtons] });
        }
    }
}

async function handleAppeal(client, interaction) {
    const verificationService = new VerificationService(client);
    const config = mainconfig.DeadLoomVerification;

    if (verificationService.isAlreadyVerified(interaction.user.id, interaction.member)) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Already Verified!')
                .setDescription('You are already verified. No appeal needed!')
            ],
            ephemeral: true
        });
    }

    const canAppealResult = verificationService.canAppeal(interaction.user.id);
    if (!canAppealResult.canAppeal) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Cannot Appeal')
                .setDescription(canAppealResult.reason)
                .addFields({ name: '📊 Requirements', value: `You need **${config.MaxFailuresBeforeAppeal || 3}** failed verifications to appeal.` })
            ],
            ephemeral: true
        });
    }

    const reason = interaction.options.getString('reason');
    const screenshot = interaction.options.getAttachment('screenshot');

    if (!reason || !screenshot) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📝 Submit an Appeal')
                .setDescription('To appeal your failed verifications:\n\n`/appeal reason:[your reason] screenshot:[new screenshot]`')
                .addFields(
                    { name: '📸 Screenshot', value: 'Upload a new, clear screenshot showing your subscription' },
                    { name: '📝 Reason', value: 'Explain why your previous verifications failed' }
                )
            ],
            ephemeral: true
        });
    }

    const isImage = screenshot.contentType?.startsWith('image/');
    if (!isImage) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Invalid File Type')
                .setDescription('Please upload an **image** file.')
            ],
            ephemeral: true
        });
    }

    const appeal = await verificationService.createAppeal(
        interaction.user.id,
        reason,
        screenshot.url
    );

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📋 Appeal Submitted!')
            .setDescription(`Your appeal has been submitted for review.\n\n**Appeal ID:** \`${appeal.id}\``)
            .addFields(
                { name: '📝 Reason', value: reason },
                { name: '⏳ Status', value: 'Pending Review', inline: true }
            )
            .setImage(screenshot.url)
            .setFooter({ text: 'A staff member will review your appeal shortly' })
            .setTimestamp()
        ],
        ephemeral: true
    });

    if (config.LoggingChannelID) {
        let logChannel = interaction.guild.channels.cache.get(config.LoggingChannelID);
        if (!logChannel) {
            logChannel = await interaction.guild.channels.fetch(config.LoggingChannelID).catch(() => null);
        }
        if (logChannel) {
            const stats = verificationService.getUserStats(interaction.user.id);

            const reviewButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_appeal_approve_${appeal.id}_${interaction.user.id}`)
                    .setLabel('Approve Appeal')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`verify_appeal_deny_${appeal.id}_${interaction.user.id}`)
                    .setLabel('Deny Appeal')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId(`verify_stats_${interaction.user.id}`)
                    .setLabel('View Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

            const logEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('📝 New Appeal Request')
                .setDescription(`**User:** <@${interaction.user.id}> (${interaction.user.tag})`)
                .addFields(
                    { name: '📋 Appeal ID', value: `\`${appeal.id}\``, inline: true },
                    { name: '📊 Failed Attempts', value: stats.denied.toString(), inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setImage(screenshot.url)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Click buttons below to approve or deny the appeal' });

            await logChannel.send({ embeds: [logEmbed], components: [reviewButtons] });
        }
    }
}

async function handleVerifyHistory(client, interaction) {
    const verificationService = new VerificationService(client);

    if (!verificationService.hasStaffRole(interaction.member)) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Permission Denied')
                .setDescription('Only staff members can view verification history.')
            ],
            ephemeral: true
        });
    }

    const targetUser = interaction.options.getUser('user');
    const type = interaction.options.getString('type') || 'all';

    if (targetUser) {
        const user = targetUser;
        const statsEmbed = verificationService.generateStatsEmbed(user.id, user);
        const verifications = verificationService.getUserVerifications(user.id).slice(-5);
        const appeals = verificationService.getUserAppeals(user.id).slice(-3);

        let historyText = '';
        for (const v of verifications) {
            const statusEmoji = v.status === 'approved' ? '✅' : v.status === 'denied' ? '❌' : '⏳';
            const date = new Date(v.timestamp).toLocaleDateString();
            historyText += `${statusEmoji} \`${v.id}\` - ${v.status.toUpperCase()} (${date})\n`;
        }

        let appealsText = '';
        for (const a of appeals) {
            const statusEmoji = a.status === 'approved' ? '✅' : a.status === 'denied' ? '❌' : '⏳';
            const date = new Date(a.timestamp).toLocaleDateString();
            appealsText += `${statusEmoji} \`${a.id}\` - ${a.status.toUpperCase()} (${date})\n`;
        }

        statsEmbed.addFields(
            { name: '📜 Recent Verifications', value: historyText || 'No verifications found', inline: false },
            { name: '📝 Recent Appeals', value: appealsText || 'No appeals found', inline: false }
        );

        return interaction.reply({ embeds: [statsEmbed], ephemeral: true });
    }

    let items = [];
    let title = '';

    if (type === 'pending') {
        items = verificationService.getPendingVerifications();
        title = '⏳ Pending Verifications';
    } else if (type === 'appeals') {
        items = verificationService.getPendingAppeals();
        title = '📝 Pending Appeals';
    } else {
        items = verificationService.getAllVerifications(20);
        title = '📋 All Verification History';
    }

    if (items.length === 0) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(title)
                .setDescription('No records found.')
            ],
            ephemeral: true
        });
    }

    let description = '';
    for (const item of items.slice(0, 15)) {
        const statusEmoji = item.status === 'approved' ? '✅' : item.status === 'denied' ? '❌' : '⏳';
        const date = new Date(item.timestamp).toLocaleDateString();
        description += `${statusEmoji} \`${item.id}\` | <@${item.userId}> | ${item.status.toUpperCase()} | ${date}\n`;
    }

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(title)
        .setDescription(description)
        .addFields({ name: '📊 Total Records', value: items.length.toString(), inline: true })
        .setTimestamp()
        .setFooter({ text: 'Use /verifyhistory user:@user to see detailed stats' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleVerifyManage(client, interaction) {
    const verificationService = new VerificationService(client);

    if (!verificationService.hasStaffRole(interaction.member)) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Permission Denied')
                .setDescription('Only staff members can manage verifications.')
            ],
            ephemeral: true
        });
    }

    const subcommand = interaction.options.getSubcommand();
    const config = mainconfig.DeadLoomVerification;

    if (subcommand === 'approve') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: '❌ User not found in server.', ephemeral: true });
        }

        const role = interaction.guild.roles.cache.get(config.CodeAccessRoleID);
        if (!role) {
            return interaction.reply({ content: '❌ Code Access role not found.', ephemeral: true });
        }

        try {
            await member.roles.add(role);
        } catch (e) {
            return interaction.reply({ content: '❌ Failed to add role.', ephemeral: true });
        }

        await verificationService.addVerification(user.id, 'approved', 'manual', interaction.user.id, 'Manual approval by staff');

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ User Manually Verified')
                .setDescription(`<@${user.id}> has been manually verified and given the **${role.name}** role.`)
                .addFields({ name: '👤 Approved by', value: `<@${interaction.user.id}>` })
                .setTimestamp()
            ]
        });

    } else if (subcommand === 'revoke') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: '❌ User not found in server.', ephemeral: true });
        }

        const role = interaction.guild.roles.cache.get(config.CodeAccessRoleID);
        if (role && member.roles.cache.has(role.id)) {
            try {
                await member.roles.remove(role);
            } catch (e) {
                return interaction.reply({ content: '❌ Failed to remove role.', ephemeral: true });
            }
        }

        verificationService.revokeVerification(user.id, interaction.user.id, 'Manual revocation by staff');

        if (config.LoggingChannelID) {
            let logChannel = interaction.guild.channels.cache.get(config.LoggingChannelID);
            if (!logChannel) {
                logChannel = await interaction.guild.channels.fetch(config.LoggingChannelID).catch(() => null);
            }
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('🚫 Verification Revoked')
                    .setDescription(`**User:** <@${user.id}> (${user.tag})`)
                    .addFields(
                        { name: '👤 Revoked by', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📋 Reason', value: 'Manual revocation by staff', inline: true }
                    )
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
        }

        return interaction.reply({
            content: `Verification for <@${user.id}> has been revoked successfully.`,
            ephemeral: true
        });

    } else if (subcommand === 'stats') {
        const verifications = verificationService.getAllVerifications(1000);
        const appeals = verificationService.getAllAppeals(1000);

        const totalVerifications = verifications.length;
        const approved = verifications.filter(v => v.status === 'approved').length;
        const denied = verifications.filter(v => v.status === 'denied').length;
        const pending = verifications.filter(v => v.status === 'pending').length;

        const totalAppeals = appeals.length;
        const appealsApproved = appeals.filter(a => a.status === 'approved').length;
        const appealsDenied = appeals.filter(a => a.status === 'denied').length;
        const appealsPending = appeals.filter(a => a.status === 'pending').length;

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📊 Verification System Statistics')
                .addFields(
                    { name: '📋 Total Verifications', value: totalVerifications.toString(), inline: true },
                    { name: '✅ Approved', value: approved.toString(), inline: true },
                    { name: '❌ Denied', value: denied.toString(), inline: true },
                    { name: '⏳ Pending', value: pending.toString(), inline: true },
                    { name: '📝 Total Appeals', value: totalAppeals.toString(), inline: true },
                    { name: '✅ Appeals Approved', value: appealsApproved.toString(), inline: true },
                    { name: '❌ Appeals Denied', value: appealsDenied.toString(), inline: true },
                    { name: '⏳ Appeals Pending', value: appealsPending.toString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'DeadLoom Subscription Verification System' })
            ],
            ephemeral: true
        });
    }
}

async function handleVerifySetup(client, interaction) {
    const verificationService = new VerificationService(client);

    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('Permission Denied')
                .setDescription('Only administrators can setup the verification system.')
            ],
            ephemeral: true
        });
    }

    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const logChannel = interaction.options.getChannel('log_channel');
    const channelName = interaction.options.getString('channel_name') || 'deadloom';

    const setupEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Verification System Setup')
        .setDescription('Please add the following environment variables to your Replit secrets:')
        .addFields(
            { name: 'VERIFICATION_CHANNEL_ID', value: channel ? channel.id : 'Not set', inline: true },
            { name: 'CODE_ACCESS_ROLE_ID', value: role ? role.id : 'Not set', inline: true },
            { name: 'VERIFICATION_LOG_CHANNEL_ID', value: logChannel ? logChannel.id : 'Not set', inline: true },
            { name: 'DEADLOOM_CHANNEL_NAME', value: channelName, inline: true }
        )
        .addFields({ name: 'Instructions', value: '1. Copy these values\n2. Go to Replit Secrets tab\n3. Add each as an environment variable\n4. Restart the bot' })
        .setTimestamp()
        .setFooter({ text: 'DeadLoom Subscription Verification System' });

    return interaction.reply({ embeds: [setupEmbed], ephemeral: true });
}

async function handleVerifyEmbed(client, interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('Permission Denied')
                .setDescription('Only administrators can send the verification embed.')
            ],
            ephemeral: true
        });
    }

    const config = mainconfig.DeadLoomVerification;
    const deadloomLink = interaction.options.getString('deadloom_link');
    const codeChannel = interaction.options.getChannel('code_channel');

    const verificationEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('DeadLoom Subscription Verification')
        .setDescription(`Get access to exclusive content by subscribing to DeadLoom!`)
        .addFields(
            { 
                name: 'Step 1: Subscribe', 
                value: `Go to **[${config.ChannelName || 'deadloom'}](${deadloomLink})** and subscribe.`,
                inline: false 
            },
            { 
                name: 'Step 2: Take Screenshot', 
                value: 'Take a **screenshot** showing that you are subscribed (the "Subscribed" button should be visible).',
                inline: false 
            },
            { 
                name: 'Step 3: Upload Here', 
                value: 'Upload your screenshot in **this channel** and our bot will automatically verify it.',
                inline: false 
            },
            { 
                name: 'What You Get', 
                value: codeChannel ? `Access to <#${codeChannel.id}> with exclusive code content!` : 'Access to exclusive code content!',
                inline: false 
            }
        )
        .setThumbnail('https://deadloom.gg/favicon.ico')
        .setFooter({ text: 'All messages except this embed will be auto-deleted after verification' })
        .setTimestamp();

    const infoEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Important Information')
        .setDescription('**Automatic Verification:** Our AI will analyze your screenshot automatically.\n\n**Auto-Delete:** Screenshots and messages will be deleted after processing to keep this channel clean.\n\n**Need Help?** If automatic verification fails, a staff member will manually review your submission.')
        .setFooter({ text: 'DeadLoom Subscription Verification System' });

    await interaction.channel.send({ embeds: [verificationEmbed, infoEmbed] });

    return interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Verification Embed Sent!')
            .setDescription('The verification instructions have been posted in this channel.')
        ],
        ephemeral: true
    });
}

module.exports = {
    handleVerify,
    handleAppeal,
    handleVerifyHistory,
    handleVerifyManage,
    handleVerifySetup,
    handleVerifyEmbed
};
