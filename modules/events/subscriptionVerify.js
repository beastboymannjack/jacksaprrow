const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const VerificationService = require('../verification/verificationService.js');
const { analyzeSubscriptionScreenshot } = require('../verification/subscriptionAnalyzer.js');
const mainconfig = require("../../mainconfig.js");

const AUTO_APPROVE_CONFIDENCE = 0.85;
const AUTO_DENY_CONFIDENCE = 0.80;

module.exports = async (client) => {
    client.on('messageCreate', async (message) => {
        try {
            if (message.author.bot) return;

            const config = mainconfig.DeadLoomVerification;
            if (!config || !config.VerificationChannelID) return;
            if (message.channel.id !== config.VerificationChannelID) return;

            const attachment = message.attachments.first();
            if (!attachment) {
                const reply = await message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF6B6B')
                        .setTitle('No Screenshot Detected')
                        .setDescription('Please upload a **screenshot** showing you are subscribed to the YouTube channel.')
                        .addFields({ name: 'Channel to Subscribe', value: `**${config.ChannelName || 'deadloom'}**` })
                        .setFooter({ text: 'This message will be deleted in 5 seconds' })
                    ]
                });
                setTimeout(async () => {
                    try { await message.delete(); } catch (e) {}
                    try { await reply.delete(); } catch (e) {}
                }, 5000);
                return;
            }

            const isImage = attachment.contentType?.startsWith('image/');
            if (!isImage) {
                const reply = await message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF6B6B')
                        .setTitle('Invalid File Type')
                        .setDescription('Please upload an **image** (PNG, JPG, JPEG, GIF).')
                        .setFooter({ text: 'This message will be deleted in 5 seconds' })
                    ]
                });
                setTimeout(async () => {
                    try { await message.delete(); } catch (e) {}
                    try { await reply.delete(); } catch (e) {}
                }, 5000);
                return;
            }

            const verificationService = new VerificationService(client);

            if (verificationService.isAlreadyVerified(message.author.id, message.member)) {
                const reply = await message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Already Verified!')
                        .setDescription('You are already verified and have access to the code channel.')
                        .setFooter({ text: 'This message will be deleted in 5 seconds' })
                    ]
                });
                setTimeout(async () => {
                    try { await message.delete(); } catch (e) {}
                    try { await reply.delete(); } catch (e) {}
                }, 5000);
                return;
            }

            const cooldownCheck = verificationService.isOnCooldown(message.author.id);
            if (cooldownCheck.onCooldown) {
                const reply = await message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('Cooldown Active')
                        .setDescription(`You recently submitted a verification. Please wait **${cooldownCheck.hoursLeft} hours** before trying again.`)
                        .setFooter({ text: 'This message will be deleted in 5 seconds' })
                    ]
                });
                setTimeout(async () => {
                    try { await message.delete(); } catch (e) {}
                    try { await reply.delete(); } catch (e) {}
                }, 5000);
                return;
            }

            const processingReply = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('Analyzing Screenshot...')
                    .setDescription('Please wait while your subscription screenshot is being verified automatically.')
                    .setFooter({ text: 'This usually takes a few seconds' })
                ]
            });

            const analysisResult = await analyzeSubscriptionScreenshot(
                attachment.url, 
                config.ChannelName || 'deadloom'
            );

            try { await processingReply.delete(); } catch (e) {}

            if (analysisResult.success && analysisResult.isSubscribed && analysisResult.confidence >= AUTO_APPROVE_CONFIDENCE) {
                const verification = await verificationService.addVerification(
                    message.author.id,
                    'approved',
                    attachment.url,
                    client.user.id,
                    `Auto-approved by AI (Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%)`
                );

                const member = message.member;
                if (member && config.CodeAccessRoleID) {
                    try {
                        await member.roles.add(config.CodeAccessRoleID);
                    } catch (e) {
                        console.error('[SubscriptionVerify] Failed to add role:', e.message);
                    }
                }

                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Verification Approved!')
                    .setDescription(`Your subscription to **${config.ChannelName || 'deadloom'}** has been verified!`)
                    .addFields(
                        { name: 'Status', value: 'Approved', inline: true },
                        { name: 'Confidence', value: `${(analysisResult.confidence * 100).toFixed(1)}%`, inline: true },
                        { name: 'Access Granted', value: config.CodeAccessRoleID ? `<@&${config.CodeAccessRoleID}>` : 'N/A', inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'This message will be deleted in 5 seconds' })
                    .setTimestamp();

                const successReply = await message.reply({ embeds: [successEmbed] });

                if (config.LoggingChannelID) {
                    await sendLogMessage(message, config, verification, analysisResult, 'approved', client);
                }

                setTimeout(async () => {
                    try { await message.delete(); } catch (e) {}
                    try { await successReply.delete(); } catch (e) {}
                }, 5000);

            } else if (analysisResult.success && !analysisResult.isSubscribed && analysisResult.confidence >= AUTO_DENY_CONFIDENCE) {
                const verification = await verificationService.addVerification(
                    message.author.id,
                    'denied',
                    attachment.url,
                    client.user.id,
                    `Auto-denied by AI: ${analysisResult.reason} (Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%)`
                );

                const denyEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Verification Denied')
                    .setDescription(`Your screenshot could not verify subscription to **${config.ChannelName || 'deadloom'}**.`)
                    .addFields(
                        { name: 'Reason', value: analysisResult.reason || 'Subscription not detected', inline: false },
                        { name: 'What to do', value: `1. Make sure you are subscribed to **${config.ChannelName || 'deadloom'}**\n2. Take a clear screenshot showing the "Subscribed" button\n3. Try again after the cooldown`, inline: false }
                    )
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'This message will be deleted in 5 seconds' })
                    .setTimestamp();

                const denyReply = await message.reply({ embeds: [denyEmbed] });

                if (config.LoggingChannelID) {
                    await sendLogMessage(message, config, verification, analysisResult, 'denied', client);
                }

                setTimeout(async () => {
                    try { await message.delete(); } catch (e) {}
                    try { await denyReply.delete(); } catch (e) {}
                }, 5000);

            } else {
                const verification = await verificationService.addVerification(
                    message.author.id,
                    'pending',
                    attachment.url
                );

                const pendingEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('Manual Review Required')
                    .setDescription(`Your screenshot needs manual review by staff.\n\n**Verification ID:** \`${verification.id}\``)
                    .addFields(
                        { name: 'Reason', value: analysisResult.reason || 'Low confidence in automatic detection', inline: false },
                        { name: 'Status', value: 'Pending Staff Review', inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'A staff member will review your submission shortly. Message will be deleted in 5 seconds.' })
                    .setTimestamp();

                const pendingReply = await message.reply({ embeds: [pendingEmbed] });

                if (config.LoggingChannelID) {
                    await sendLogMessageWithButtons(message, config, verification, analysisResult, client, verificationService);
                }

                setTimeout(async () => {
                    try { await message.delete(); } catch (e) {}
                    try { await pendingReply.delete(); } catch (e) {}
                }, 5000);
            }

        } catch (error) {
            console.error('[SubscriptionVerify] Error:', error);
        }
    });
};

async function sendLogMessage(message, config, verification, analysisResult, status, client) {
    try {
        let logChannel = message.guild.channels.cache.get(config.LoggingChannelID);
        if (!logChannel) {
            logChannel = await message.guild.channels.fetch(config.LoggingChannelID).catch(() => null);
        }
        if (!logChannel) return;

        const statusColors = {
            'approved': '#00FF00',
            'denied': '#FF0000',
            'pending': '#FFA500'
        };

        const statusEmojis = {
            'approved': '✅',
            'denied': '❌',
            'pending': '⏳'
        };

        const logEmbed = new EmbedBuilder()
            .setColor(statusColors[status] || '#5865F2')
            .setTitle(`${statusEmojis[status]} Verification ${status.toUpperCase()}`)
            .setDescription(`**User:** <@${message.author.id}> (${message.author.tag})`)
            .addFields(
                { name: 'Verification ID', value: `\`${verification.id}\``, inline: true },
                { name: 'Status', value: status.toUpperCase(), inline: true },
                { name: 'Confidence', value: `${(analysisResult.confidence * 100).toFixed(1)}%`, inline: true },
                { name: 'Channel Detected', value: analysisResult.channelFound || 'N/A', inline: true },
                { name: 'Button Text', value: analysisResult.subscriptionButtonText || 'N/A', inline: true },
                { name: 'Method', value: 'Automatic AI', inline: true },
                { name: 'Reason', value: analysisResult.reason || 'N/A', inline: false }
            )
            .setImage(verification.imageUrl)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: `Processed by AI` });

        await logChannel.send({ embeds: [logEmbed] });
    } catch (e) {
        console.error('[SubscriptionVerify] Log message error:', e.message);
    }
}

async function sendLogMessageWithButtons(message, config, verification, analysisResult, client, verificationService) {
    try {
        let logChannel = message.guild.channels.cache.get(config.LoggingChannelID);
        if (!logChannel) {
            logChannel = await message.guild.channels.fetch(config.LoggingChannelID).catch(() => null);
        }
        if (!logChannel) return;

        const reviewButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`verify_approve_${verification.id}_${message.author.id}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`verify_deny_${verification.id}_${message.author.id}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌'),
            new ButtonBuilder()
                .setCustomId(`verify_stats_${message.author.id}`)
                .setLabel('View Stats')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📊')
        );

        const stats = verificationService.getUserStats(message.author.id);

        const logEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('Manual Review Required')
            .setDescription(`**User:** <@${message.author.id}> (${message.author.tag})`)
            .addFields(
                { name: 'Verification ID', value: `\`${verification.id}\``, inline: true },
                { name: 'Previous Attempts', value: `Total: ${stats.total} | Denied: ${stats.denied}`, inline: true },
                { name: 'AI Confidence', value: `${(analysisResult.confidence * 100).toFixed(1)}%`, inline: true },
                { name: 'Channel Detected', value: analysisResult.channelFound || 'N/A', inline: true },
                { name: 'Button Text', value: analysisResult.subscriptionButtonText || 'N/A', inline: true },
                { name: 'AI Reason', value: analysisResult.reason || 'Low confidence', inline: false }
            )
            .setImage(verification.imageUrl)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Click buttons below to approve or deny' });

        await logChannel.send({ embeds: [logEmbed], components: [reviewButtons] });
    } catch (e) {
        console.error('[SubscriptionVerify] Log message with buttons error:', e.message);
    }
}
