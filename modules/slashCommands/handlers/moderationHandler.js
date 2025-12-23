const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ms = require('ms');
const { trackStaffAction } = require('./staffCompetitionHandler');

async function handleWarnCommand(interaction, client) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return interaction.reply({ content: 'User not found in this server!', flags: MessageFlags.Ephemeral });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ content: 'You cannot warn this user!', flags: MessageFlags.Ephemeral });
    }


    const guildId = interaction.guild.id;
    client.warnings.ensure(`${guildId}-${user.id}`, []);
    client.modcases.ensure(`${guildId}-counter`, 0);

    const caseNumber = client.modcases.get(`${guildId}-counter`) + 1;
    client.modcases.set(`${guildId}-counter`, caseNumber);

    const warning = {
        caseId: caseNumber,
        moderator: interaction.user.id,
        reason,
        timestamp: Date.now()
    };

    client.warnings.push(`${guildId}-${user.id}`, warning);

    client.modcases.set(`${guildId}-${caseNumber}`, {
        type: 'warning',
        user: user.id,
        moderator: interaction.user.id,
        reason,
        guild: guildId,
        timestamp: Date.now()
    });

    await trackStaffAction(client, guildId, interaction.user.id, 'warning');

    const warnings = client.warnings.get(`${guildId}-${user.id}`);
    const warningCount = warnings.length;

    let autoAction = '';
    if (warningCount >= 5) {
        await member.ban({ reason: 'Reached 5 warnings - Auto-ban' }).catch(() => {});
        autoAction = '\n\n⚠️ **Auto-Action:** User has been banned (5+ warnings)';
    } else if (warningCount >= 3) {
        await member.timeout(24 * 60 * 60 * 1000, 'Reached 3 warnings - Auto-timeout').catch(() => {});
        autoAction = '\n\n⚠️ **Auto-Action:** User has been timed out for 24 hours (3+ warnings)';
    }

    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('⚠️ Warning Issued')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Case #', value: `${caseNumber}`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Total Warnings', value: `${warningCount}` + autoAction }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    try {
        await user.send({
            embeds: [new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle(`⚠️ Warning in ${interaction.guild.name}`)
                .setDescription(`You have been warned.\n\n**Reason:** ${reason}\n**Total Warnings:** ${warningCount}`)
                .setTimestamp()
            ]
        });
    } catch (e) {}

    await logModAction(client, interaction.guild, embed);
}

async function handleKickCommand(interaction, client) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return interaction.reply({ content: 'User not found in this server!', flags: MessageFlags.Ephemeral });
    }

    if (!member.kickable) {
        return interaction.reply({ content: 'I cannot kick this user!', flags: MessageFlags.Ephemeral });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ content: 'You cannot kick this user!', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.guild.id;
    client.modcases.ensure(`${guildId}-counter`, 0);

    const caseNumber = client.modcases.get(`${guildId}-counter`) + 1;
    client.modcases.set(`${guildId}-counter`, caseNumber);

    client.modcases.set(`${guildId}-${caseNumber}`, {
        type: 'kick',
        user: user.id,
        moderator: interaction.user.id,
        reason,
        guild: guildId,
        timestamp: Date.now()
    });

    try {
        await user.send({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle(`👢 Kicked from ${interaction.guild.name}`)
                .setDescription(`**Reason:** ${reason}`)
                .setTimestamp()
            ]
        });
    } catch (e) {}

    await member.kick(reason);

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('👢 User Kicked')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Case #', value: `${caseNumber}`, inline: true },
            { name: 'Reason', value: reason }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await logModAction(client, interaction.guild, embed);
}

async function handleBanCommand(interaction, client) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const duration = interaction.options.getString('duration');
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
        if (!member.bannable) {
            return interaction.reply({ content: 'I cannot ban this user!', flags: MessageFlags.Ephemeral });
        }
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: 'You cannot ban this user!', flags: MessageFlags.Ephemeral });
        }
    }

    const guildId = interaction.guild.id;
    client.modcases.ensure(`${guildId}-counter`, 0);

    const caseNumber = client.modcases.get(`${guildId}-counter`) + 1;
    client.modcases.set(`${guildId}-counter`, caseNumber);

    let unbanTime = null;
    if (duration && duration !== 'permanent') {
        unbanTime = Date.now() + ms(duration);
    }

    client.modcases.set(`${guildId}-${caseNumber}`, {
        type: 'ban',
        user: user.id,
        moderator: interaction.user.id,
        reason,
        guild: guildId,
        timestamp: Date.now(),
        duration: duration || 'permanent',
        unbanTime
    });

    await trackStaffAction(client, guildId, interaction.user.id, 'ban');

    try {
        await user.send({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle(`🔨 Banned from ${interaction.guild.name}`)
                .setDescription(`**Reason:** ${reason}\n**Duration:** ${duration || 'Permanent'}`)
                .setTimestamp()
            ]
        });
    } catch (e) {}

    await interaction.guild.members.ban(user, { 
        reason, 
        deleteMessageDays: Math.min(7, Math.max(0, deleteDays))
    });

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🔨 User Banned')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Case #', value: `${caseNumber}`, inline: true },
            { name: 'Duration', value: duration || 'Permanent', inline: true },
            { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true },
            { name: 'Reason', value: reason }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await logModAction(client, interaction.guild, embed);
}

async function handleUnbanCommand(interaction, client) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        const ban = await interaction.guild.bans.fetch(userId);
        await interaction.guild.members.unban(userId, reason);

        const guildId = interaction.guild.id;
        client.modcases.ensure(`${guildId}-counter`, 0);

        const caseNumber = client.modcases.get(`${guildId}-counter`) + 1;
        client.modcases.set(`${guildId}-counter`, caseNumber);

        client.modcases.set(`${guildId}-${caseNumber}`, {
            type: 'unban',
            user: userId,
            moderator: interaction.user.id,
            reason,
            guild: guildId,
            timestamp: Date.now()
        });

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('🔓 User Unbanned')
            .addFields(
                { name: 'User ID', value: userId, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Case #', value: `${caseNumber}`, inline: true },
                { name: 'Reason', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await logModAction(client, interaction.guild, embed);

    } catch (error) {
        await interaction.reply({ content: 'User not found in ban list!', flags: MessageFlags.Ephemeral });
    }
}

async function handleTimeoutCommand(interaction, client) {
    const user = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return interaction.reply({ content: 'User not found in this server!', flags: MessageFlags.Ephemeral });
    }

    if (!member.moderatable) {
        return interaction.reply({ content: 'I cannot timeout this user!', flags: MessageFlags.Ephemeral });
    }

    const duration = ms(durationStr);
    if (!duration || duration > 28 * 24 * 60 * 60 * 1000) {
        return interaction.reply({ content: 'Invalid duration! Maximum is 28 days.', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.guild.id;
    client.modcases.ensure(`${guildId}-counter`, 0);

    const caseNumber = client.modcases.get(`${guildId}-counter`) + 1;
    client.modcases.set(`${guildId}-counter`, caseNumber);

    client.modcases.set(`${guildId}-${caseNumber}`, {
        type: 'timeout',
        user: user.id,
        moderator: interaction.user.id,
        reason,
        duration: durationStr,
        guild: guildId,
        timestamp: Date.now()
    });

    await member.timeout(duration, reason);

    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('⏰ User Timed Out')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Duration', value: durationStr, inline: true },
            { name: 'Case #', value: `${caseNumber}`, inline: true },
            { name: 'Reason', value: reason }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await logModAction(client, interaction.guild, embed);
}

async function handleSlowmodeCommand(interaction, client) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (seconds < 0 || seconds > 21600) {
        return interaction.reply({ content: 'Slowmode must be between 0 and 21600 seconds (6 hours)!', flags: MessageFlags.Ephemeral });
    }

    await channel.setRateLimitPerUser(seconds);

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🐢 Slowmode Updated')
        .setDescription(`Slowmode in <#${channel.id}> has been set to **${seconds} seconds**.`)
        .setFooter({ text: `Changed by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handlePurgeCommand(interaction, client) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');

    if (amount < 1 || amount > 100) {
        return interaction.reply({ content: 'Amount must be between 1 and 100!', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let messages = await interaction.channel.messages.fetch({ limit: amount });
    
    if (user) {
        messages = messages.filter(m => m.author.id === user.id);
    }

    messages = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

    const deleted = await interaction.channel.bulkDelete(messages, true);

    await interaction.editReply({
        content: `🗑️ Deleted **${deleted.size}** messages${user ? ` from ${user.tag}` : ''}.`
    });
}

async function handleLockCommand(interaction, client) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await channel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: false
    });

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🔒 Channel Locked')
        .setDescription(`This channel has been locked by ${interaction.user}.`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `🔒 Locked <#${channel.id}>`, ephemeral: true });
}

async function handleUnlockCommand(interaction, client) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    await channel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: null
    });

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('🔓 Channel Unlocked')
        .setDescription(`This channel has been unlocked by ${interaction.user}.`)
        .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `🔓 Unlocked <#${channel.id}>`, ephemeral: true });
}

async function handleHistoryCommand(interaction, client) {
    const user = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    const warnings = client.warnings.get(`${guildId}-${user.id}`) || [];
    
    const allCases = client.modcases.fetchEverything();
    const userCases = [];
    
    allCases.forEach((data, key) => {
        if (key !== `${guildId}-counter` && !key.endsWith('-counter') && data.user === user.id && data.guild === guildId) {
            userCases.push({ ...data, caseId: key.split('-')[1] });
        }
    });

    userCases.sort((a, b) => b.timestamp - a.timestamp);

    const recentCases = userCases.slice(0, 10);

    let historyText = '';
    for (const c of recentCases) {
        const date = new Date(c.timestamp).toLocaleDateString();
        historyText += `**#${c.caseId}** - ${c.type.toUpperCase()} - ${date}\n> ${c.reason?.substring(0, 50) || 'No reason'}\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`📋 Moderation History`)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '⚠️ Warnings', value: `${warnings.length}`, inline: true },
            { name: '📊 Total Cases', value: `${userCases.length}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true }
        )
        .setDescription(historyText || 'No moderation history found.')
        .setFooter({ text: `User ID: ${user.id}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleConfigCommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    client.serversettings.ensure(guildId, {});
    const settings = client.serversettings.get(guildId);

    switch (subcommand) {
        case 'modlog': {
            const channel = interaction.options.getChannel('channel');
            settings.modLogChannel = channel.id;
            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('Mod Log Configured')
                    .setDescription(`Moderation actions will now be logged to <#${channel.id}>`)
                ],
                flags: MessageFlags.Ephemeral
            });
            break;
        }

        case 'levelup': {
            const enabled = interaction.options.getBoolean('enabled');
            const channel = interaction.options.getChannel('channel');

            settings.levelUpEnabled = enabled;
            if (channel) settings.levelUpChannel = channel.id;

            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(enabled ? '#57F287' : '#ED4245')
                    .setTitle(`Level Up Notifications ${enabled ? 'Enabled' : 'Disabled'}`)
                    .setDescription(enabled 
                        ? `Level up messages will be sent${channel ? ` to <#${channel.id}>` : ' in the current channel'}.`
                        : 'Level up notifications have been disabled.'
                    )
                ],
                flags: MessageFlags.Ephemeral
            });
            break;
        }

        case 'xpmultiplier': {
            const multiplier = interaction.options.getNumber('multiplier');

            if (multiplier < 0.5 || multiplier > 3) {
                return interaction.reply({ content: 'Multiplier must be between 0.5 and 3!', flags: MessageFlags.Ephemeral });
            }

            settings.xpMultiplier = multiplier;
            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('XP Multiplier Updated')
                    .setDescription(`XP multiplier is now set to **${multiplier}x**`)
                ],
                flags: MessageFlags.Ephemeral
            });
            break;
        }

        case 'view': {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Server Configuration')
                .addFields(
                    { name: 'Mod Log Channel', value: settings.modLogChannel ? `<#${settings.modLogChannel}>` : 'Not set', inline: true },
                    { name: 'Level Up Messages', value: settings.levelUpEnabled ? 'Enabled' : 'Disabled', inline: true },
                    { name: 'XP Multiplier', value: `${settings.xpMultiplier || 1}x`, inline: true },
                    { name: 'Welcome Channel', value: settings.welcome?.channel ? `<#${settings.welcome.channel}>` : 'Not set', inline: true },
                    { name: 'Goodbye Channel', value: settings.goodbye?.channel ? `<#${settings.goodbye.channel}>` : 'Not set', inline: true },
                    { name: 'AI Personality', value: settings.aiPersonality || 'helpful', inline: true }
                )
                .setFooter({ text: interaction.guild.name })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            break;
        }
    }
}

async function logModAction(client, guild, embed) {
    const settings = client.serversettings?.get(guild.id);
    if (!settings?.modLogChannel) return;

    const channel = guild.channels.cache.get(settings.modLogChannel);
    if (!channel) return;

    await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
    handleWarnCommand,
    handleKickCommand,
    handleBanCommand,
    handleUnbanCommand,
    handleTimeoutCommand,
    handleSlowmodeCommand,
    handlePurgeCommand,
    handleLockCommand,
    handleUnlockCommand,
    handleHistoryCommand,
    handleConfigCommand,
    logModAction
};
