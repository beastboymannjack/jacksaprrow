const { EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');

function calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp));
}

function calculateXPForLevel(level) {
    return Math.pow(level / 0.1, 2);
}

function calculateProgress(xp, currentLevel) {
    const currentLevelXP = calculateXPForLevel(currentLevel);
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
}

function createProgressBar(percentage, length = 20) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

async function handleLevelCommand(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    const guildId = interaction.guild.id;

    client.levels = client.levels || new (require('enmap'))({ name: 'levels', dataDir: './dbs/levels' });

    client.levels.ensure(`${guildId}-${user.id}`, {
        xp: 0,
        level: 0,
        messages: 0,
        lastMessage: 0,
        voiceTime: 0
    });

    const data = client.levels.get(`${guildId}-${user.id}`);
    const level = calculateLevel(data.xp);
    const progress = calculateProgress(data.xp, level);
    const nextLevelXP = calculateXPForLevel(level + 1);
    const currentLevelXP = calculateXPForLevel(level);

    const allUsers = client.levels.filter((val, key) => key.startsWith(guildId));
    const sortedUsers = [...allUsers.entries()].sort((a, b) => b[1].xp - a[1].xp);
    const rank = sortedUsers.findIndex(([key]) => key === `${guildId}-${user.id}`) + 1;

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
            name: `${user.username}'s Level`, 
            iconURL: user.displayAvatarURL({ dynamic: true }) 
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '🏆 Rank', value: `#${rank}`, inline: true },
            { name: '⭐ Level', value: `${level}`, inline: true },
            { name: '✨ Total XP', value: `${data.xp.toLocaleString()}`, inline: true },
            { name: '💬 Messages', value: `${data.messages.toLocaleString()}`, inline: true },
            { name: '🎤 Voice Time', value: formatVoiceTime(data.voiceTime), inline: true },
            { name: '\u200b', value: '\u200b', inline: true }
        )
        .addFields({
            name: `Progress to Level ${level + 1}`,
            value: `\`${createProgressBar(progress)}\` ${progress.toFixed(1)}%\n${Math.floor(data.xp - currentLevelXP).toLocaleString()} / ${Math.floor(nextLevelXP - currentLevelXP).toLocaleString()} XP`
        })
        .setFooter({ text: `Keep chatting to earn more XP!` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboardCommand(interaction, client) {
    const type = interaction.options.getString('type') || 'xp';
    const guildId = interaction.guild.id;

    client.levels = client.levels || new (require('enmap'))({ name: 'levels', dataDir: './dbs/levels' });

    let sortedUsers = [];
    let title = '';
    let icon = '';

    if (type === 'xp') {
        const allUsers = client.levels.filter((val, key) => key.startsWith(guildId));
        sortedUsers = [...allUsers.entries()]
            .map(([key, data]) => ({ 
                id: key.split('-')[1], 
                xp: data.xp,
                level: calculateLevel(data.xp)
            }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 10);
        title = 'XP Leaderboard';
        icon = '⭐';
    } else if (type === 'staff') {
        const allStaff = client.staffstats?.filter((val, key) => key.startsWith(guildId)) || new Map();
        sortedUsers = [...allStaff.entries()]
            .map(([key, data]) => ({ 
                id: key.split('-')[1], 
                points: data.points || 0 
            }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 10);
        title = 'Staff Points Leaderboard';
        icon = '🏅';
    } else if (type === 'messages') {
        const allUsers = client.levels.filter((val, key) => key.startsWith(guildId));
        sortedUsers = [...allUsers.entries()]
            .map(([key, data]) => ({ 
                id: key.split('-')[1], 
                messages: data.messages || 0 
            }))
            .sort((a, b) => b.messages - a.messages)
            .slice(0, 10);
        title = 'Messages Leaderboard';
        icon = '💬';
    }

    const medals = ['🥇', '🥈', '🥉'];
    let description = '';

    for (let i = 0; i < sortedUsers.length; i++) {
        const userData = sortedUsers[i];
        const member = await interaction.guild.members.fetch(userData.id).catch(() => null);
        const username = member?.user?.username || 'Unknown User';
        const medal = i < 3 ? medals[i] : `\`${i + 1}.\``;

        if (type === 'xp') {
            description += `${medal} **${username}** - Level ${userData.level} (${userData.xp.toLocaleString()} XP)\n`;
        } else if (type === 'staff') {
            description += `${medal} **${username}** - ${userData.points.toLocaleString()} points\n`;
        } else {
            description += `${medal} **${username}** - ${userData.messages.toLocaleString()} messages\n`;
        }
    }

    if (!description) description = 'No data available yet!';

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`${icon} ${title}`)
        .setDescription(description)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: `${interaction.guild.name}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleXPCommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    client.levels = client.levels || new (require('enmap'))({ name: 'levels', dataDir: './dbs/levels' });

    client.levels.ensure(`${guildId}-${user.id}`, {
        xp: 0,
        level: 0,
        messages: 0,
        lastMessage: 0,
        voiceTime: 0
    });

    let data = client.levels.get(`${guildId}-${user.id}`);
    let action = '';
    let newXP = data.xp;

    switch (subcommand) {
        case 'add':
            newXP = data.xp + amount;
            action = `Added **${amount} XP** to`;
            break;
        case 'remove':
            newXP = Math.max(0, data.xp - amount);
            action = `Removed **${amount} XP** from`;
            break;
        case 'set':
            newXP = amount;
            action = `Set XP to **${amount}** for`;
            break;
        case 'reset':
            newXP = 0;
            action = `Reset XP for`;
            break;
    }

    const oldLevel = calculateLevel(data.xp);
    const newLevel = calculateLevel(newXP);

    data.xp = newXP;
    data.level = newLevel;
    client.levels.set(`${guildId}-${user.id}`, data);

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('XP Updated')
        .setDescription(`${action} **${user.username}**`)
        .addFields(
            { name: 'Previous XP', value: `${data.xp - (subcommand === 'add' ? amount : 0)}`, inline: true },
            { name: 'New XP', value: `${newXP}`, inline: true },
            { name: 'Level', value: oldLevel !== newLevel ? `${oldLevel} → ${newLevel}` : `${newLevel}`, inline: true }
        )
        .setFooter({ text: `Modified by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    await checkLevelRoles(interaction.guild, user.id, newLevel, client);
}

async function handleLevelRolesCommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    client.serversettings.ensure(guildId, { levelRoles: {} });
    const settings = client.serversettings.get(guildId);

    switch (subcommand) {
        case 'add': {
            const level = interaction.options.getInteger('level');
            const role = interaction.options.getRole('role');

            settings.levelRoles = settings.levelRoles || {};
            settings.levelRoles[level] = role.id;
            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('Level Role Added')
                    .setDescription(`Users reaching **Level ${level}** will receive <@&${role.id}>`)
                ],
                flags: MessageFlags.Ephemeral
            });
            break;
        }

        case 'remove': {
            const level = interaction.options.getInteger('level');

            if (settings.levelRoles && settings.levelRoles[level]) {
                delete settings.levelRoles[level];
                client.serversettings.set(guildId, settings);
            }

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('Level Role Removed')
                    .setDescription(`Level ${level} role reward has been removed.`)
                ],
                flags: MessageFlags.Ephemeral
            });
            break;
        }

        case 'list': {
            const roles = settings.levelRoles || {};
            const sortedLevels = Object.keys(roles).sort((a, b) => parseInt(a) - parseInt(b));

            let description = '';
            for (const level of sortedLevels) {
                description += `Level **${level}** → <@&${roles[level]}>\n`;
            }

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('Level Role Rewards')
                    .setDescription(description || 'No level roles configured.')
                    .setFooter({ text: 'Use /levelroles add to add new rewards' })
                ],
                flags: MessageFlags.Ephemeral
            });
            break;
        }
    }
}

async function checkLevelRoles(guild, userId, level, client) {
    const settings = client.serversettings.get(guild.id);
    if (!settings?.levelRoles) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    for (const [reqLevel, roleId] of Object.entries(settings.levelRoles)) {
        if (level >= parseInt(reqLevel)) {
            if (!member.roles.cache.has(roleId)) {
                await member.roles.add(roleId).catch(() => {});
            }
        }
    }
}

function formatVoiceTime(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
}

async function addXP(client, guildId, userId, amount = null) {
    client.levels = client.levels || new (require('enmap'))({ name: 'levels', dataDir: './dbs/levels' });

    client.levels.ensure(`${guildId}-${userId}`, {
        xp: 0,
        level: 0,
        messages: 0,
        lastMessage: 0,
        voiceTime: 0
    });

    const data = client.levels.get(`${guildId}-${userId}`);
    const now = Date.now();

    if (now - data.lastMessage < 60000) return null;

    const settings = client.serversettings.get(guildId);
    const multiplier = settings?.xpMultiplier || 1;
    const xpGain = amount || Math.floor((Math.random() * 10 + 15) * multiplier);

    const oldLevel = calculateLevel(data.xp);
    data.xp += xpGain;
    data.messages += 1;
    data.lastMessage = now;
    data.level = calculateLevel(data.xp);

    client.levels.set(`${guildId}-${userId}`, data);

    if (data.level > oldLevel) {
        return { leveledUp: true, oldLevel, newLevel: data.level, xp: data.xp };
    }

    return { leveledUp: false, xp: data.xp };
}

module.exports = { 
    handleLevelCommand, 
    handleLeaderboardCommand, 
    handleXPCommand, 
    handleLevelRolesCommand,
    addXP,
    calculateLevel,
    calculateProgress,
    checkLevelRoles
};
