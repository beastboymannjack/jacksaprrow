const { EmbedBuilder, MessageFlags } = require('discord.js');
const ms = require('ms');

const BADGES = {
    ticket_master: { name: 'Ticket Master', emoji: '🎫', requirement: 'Close 100 tickets' },
    warning_warrior: { name: 'Warning Warrior', emoji: '⚠️', requirement: 'Issue 50 warnings' },
    ban_hammer: { name: 'Ban Hammer', emoji: '🔨', requirement: 'Ban 25 rule breakers' },
    bot_builder: { name: 'Bot Builder', emoji: '🤖', requirement: 'Create 50 bots' },
    chat_champion: { name: 'Chat Champion', emoji: '💬', requirement: 'Send 1000 messages' },
    early_bird: { name: 'Early Bird', emoji: '🐦', requirement: 'First to respond 10 times' },
    night_owl: { name: 'Night Owl', emoji: '🦉', requirement: 'Active during late hours' },
    streak_king: { name: 'Streak King', emoji: '🔥', requirement: '7 day activity streak' },
    helper: { name: 'Helpful Hero', emoji: '🦸', requirement: 'Help 50 members' },
    speedster: { name: 'Speedster', emoji: '⚡', requirement: 'Average response time under 5 mins' }
};

async function handleStaffCommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    switch (subcommand) {
        case 'points': {
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            client.staffstats.ensure(`${guildId}-${user.id}`, getDefaultStaffData());

            const data = client.staffstats.get(`${guildId}-${user.id}`);
            data.points += amount;
            data.pointHistory.push({
                amount,
                reason,
                addedBy: interaction.user.id,
                timestamp: Date.now()
            });

            client.staffstats.set(`${guildId}-${user.id}`, data);

            await checkAndAwardBadges(client, guildId, user.id, data);

            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('🏆 Points Awarded!')
                .setDescription(`**${user.username}** has been awarded **${amount}** points!`)
                .addFields(
                    { name: 'New Total', value: `${data.points} points`, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setFooter({ text: `Awarded by ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'stats': {
            const user = interaction.options.getUser('user') || interaction.user;
            
            client.staffstats.ensure(`${guildId}-${user.id}`, getDefaultStaffData());
            const data = client.staffstats.get(`${guildId}-${user.id}`);

            const allStaff = client.staffstats.filter((val, key) => key.startsWith(guildId));
            const sorted = [...allStaff.entries()].sort((a, b) => b[1].points - a[1].points);
            const rank = sorted.findIndex(([key]) => key === `${guildId}-${user.id}`) + 1;

            const badgeStr = data.badges.length > 0 
                ? data.badges.map(b => BADGES[b]?.emoji || '🏅').join(' ') 
                : 'No badges earned yet';

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ 
                    name: `${user.username}'s Staff Stats`, 
                    iconURL: user.displayAvatarURL({ dynamic: true }) 
                })
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '🏆 Rank', value: `#${rank}`, inline: true },
                    { name: '⭐ Points', value: `${data.points.toLocaleString()}`, inline: true },
                    { name: '🔥 Streak', value: `${data.activityStreak} days`, inline: true },
                    { name: '🎫 Tickets Closed', value: `${data.ticketsClosed}`, inline: true },
                    { name: '⚠️ Warnings Issued', value: `${data.warningsIssued}`, inline: true },
                    { name: '🤖 Bots Created', value: `${data.botsCreated}`, inline: true },
                    { name: '🏅 Badges', value: badgeStr }
                )
                .setFooter({ text: 'Keep up the great work!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'leaderboard': {
            const period = interaction.options.getString('period') || 'alltime';
            const allStaff = client.staffstats.filter((val, key) => key.startsWith(guildId));

            let filteredData;
            const now = Date.now();
            const periodMs = {
                daily: 24 * 60 * 60 * 1000,
                weekly: 7 * 24 * 60 * 60 * 1000,
                monthly: 30 * 24 * 60 * 60 * 1000
            };

            if (period === 'alltime') {
                filteredData = [...allStaff.entries()].map(([key, data]) => ({
                    id: key.split('-')[1],
                    points: data.points
                }));
            } else {
                filteredData = [...allStaff.entries()].map(([key, data]) => {
                    const periodPoints = data.pointHistory
                        .filter(h => now - h.timestamp < periodMs[period])
                        .reduce((sum, h) => sum + h.amount, 0);
                    return {
                        id: key.split('-')[1],
                        points: periodPoints
                    };
                });
            }

            filteredData.sort((a, b) => b.points - a.points);
            const top10 = filteredData.slice(0, 10);

            const medals = ['🥇', '🥈', '🥉'];
            let description = '';

            for (let i = 0; i < top10.length; i++) {
                const member = await interaction.guild.members.fetch(top10[i].id).catch(() => null);
                const username = member?.user?.username || 'Unknown';
                const medal = i < 3 ? medals[i] : `\`${i + 1}.\``;
                description += `${medal} **${username}** - ${top10[i].points.toLocaleString()} points\n`;
            }

            if (!description) description = 'No data available yet!';

            const periodNames = {
                daily: 'Daily',
                weekly: 'Weekly',
                monthly: 'Monthly',
                alltime: 'All Time'
            };

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🏆 Staff Leaderboard - ${periodNames[period]}`)
                .setDescription(description)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({ text: 'Compete to reach the top!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'badges': {
            const user = interaction.options.getUser('user') || interaction.user;

            client.staffstats.ensure(`${guildId}-${user.id}`, getDefaultStaffData());
            const data = client.staffstats.get(`${guildId}-${user.id}`);

            const earnedBadges = data.badges.map(b => {
                const badge = BADGES[b];
                return badge ? `${badge.emoji} **${badge.name}**` : null;
            }).filter(Boolean);

            const unearnedBadges = Object.entries(BADGES)
                .filter(([key]) => !data.badges.includes(key))
                .map(([key, badge]) => `~~${badge.emoji} ${badge.name}~~ - *${badge.requirement}*`);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🏅 ${user.username}'s Badges`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '✅ Earned Badges', value: earnedBadges.length > 0 ? earnedBadges.join('\n') : 'No badges earned yet' },
                    { name: '🔒 Locked Badges', value: unearnedBadges.slice(0, 5).join('\n') || 'All badges earned!' }
                )
                .setFooter({ text: `${earnedBadges.length}/${Object.keys(BADGES).length} badges earned` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }
    }
}

async function handleCompetitionCommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    client.competitions.ensure(guildId, { active: [], history: [] });

    const data = client.competitions.get(guildId);

    switch (subcommand) {
        case 'create': {
            const name = interaction.options.getString('name');
            const type = interaction.options.getString('type');
            const durationStr = interaction.options.getString('duration');
            const prize = interaction.options.getString('prize') || 'Bragging rights!';

            const duration = ms(durationStr);
            if (!duration) {
                return interaction.reply({ content: 'Invalid duration! Use formats like 1d, 1w, 1m', flags: MessageFlags.Ephemeral });
            }

            const competition = {
                id: Date.now().toString(),
                name,
                type,
                prize,
                startedAt: Date.now(),
                endsAt: Date.now() + duration,
                createdBy: interaction.user.id,
                participants: {}
            };

            data.active.push(competition);
            client.competitions.set(guildId, data);

            const typeNames = {
                tickets: 'Most Tickets Closed',
                warnings: 'Most Warnings Issued',
                messages: 'Most Messages',
                points: 'Most Points',
                bots: 'Most Bots Created'
            };

            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('🏁 New Competition Started!')
                .setDescription(`**${name}**`)
                .addFields(
                    { name: '📊 Type', value: typeNames[type], inline: true },
                    { name: '⏰ Duration', value: durationStr, inline: true },
                    { name: '🎁 Prize', value: prize, inline: true }
                )
                .setFooter({ text: `Ends ${new Date(competition.endsAt).toLocaleDateString()}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'end': {
            const name = interaction.options.getString('name');
            const compIndex = data.active.findIndex(c => c.name.toLowerCase() === name.toLowerCase());

            if (compIndex === -1) {
                return interaction.reply({ content: 'Competition not found!', flags: MessageFlags.Ephemeral });
            }

            const competition = data.active[compIndex];
            const winners = await calculateWinners(client, guildId, competition);

            data.active.splice(compIndex, 1);
            data.history.push({ ...competition, winners, endedAt: Date.now() });
            client.competitions.set(guildId, data);

            const medals = ['🥇', '🥈', '🥉'];
            let winnerText = '';
            for (let i = 0; i < Math.min(3, winners.length); i++) {
                const member = await interaction.guild.members.fetch(winners[i].id).catch(() => null);
                winnerText += `${medals[i]} **${member?.user?.username || 'Unknown'}** - ${winners[i].score}\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🏆 Competition Ended!')
                .setDescription(`**${competition.name}**`)
                .addFields(
                    { name: '🎊 Winners', value: winnerText || 'No participants' },
                    { name: '🎁 Prize', value: competition.prize }
                )
                .setFooter({ text: 'Congratulations to all participants!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'list': {
            if (data.active.length === 0) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🏁 Active Competitions')
                        .setDescription('No active competitions. Create one with `/competition create`!')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            const competitions = data.active.map((c, i) => {
                const timeLeft = c.endsAt - Date.now();
                const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));
                return `**${i + 1}. ${c.name}**\nType: ${c.type} | Ends in: ${daysLeft} days | Prize: ${c.prize}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🏁 Active Competitions')
                .setDescription(competitions)
                .setFooter({ text: `${data.active.length} active competitions` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'status': {
            const name = interaction.options.getString('name');
            const competition = data.active.find(c => c.name.toLowerCase() === name.toLowerCase());

            if (!competition) {
                return interaction.reply({ content: 'Competition not found!', flags: MessageFlags.Ephemeral });
            }

            const standings = await calculateWinners(client, guildId, competition);
            const timeLeft = competition.endsAt - Date.now();
            const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

            let standingsText = '';
            const medals = ['🥇', '🥈', '🥉'];
            for (let i = 0; i < Math.min(5, standings.length); i++) {
                const member = await interaction.guild.members.fetch(standings[i].id).catch(() => null);
                const medal = i < 3 ? medals[i] : `${i + 1}.`;
                standingsText += `${medal} **${member?.user?.username || 'Unknown'}** - ${standings[i].score}\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📊 ${competition.name}`)
                .addFields(
                    { name: '⏰ Time Remaining', value: `${daysLeft} days`, inline: true },
                    { name: '🎁 Prize', value: competition.prize, inline: true },
                    { name: '📈 Current Standings', value: standingsText || 'No participants yet' }
                )
                .setFooter({ text: 'Keep competing!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }
    }
}

async function calculateWinners(client, guildId, competition) {
    const allStaff = client.staffstats?.filter((val, key) => key.startsWith(guildId)) || new Map();
    const startTime = competition.startedAt;

    const scores = [...allStaff.entries()].map(([key, data]) => {
        const userId = key.split('-')[1];
        let score = 0;

        switch (competition.type) {
            case 'tickets':
                score = data.ticketsClosed || 0;
                break;
            case 'warnings':
                score = data.warningsIssued || 0;
                break;
            case 'messages':
                score = data.messageCount || 0;
                break;
            case 'points':
                score = data.pointHistory
                    ?.filter(h => h.timestamp >= startTime)
                    .reduce((sum, h) => sum + h.amount, 0) || 0;
                break;
            case 'bots':
                score = data.botsCreated || 0;
                break;
        }

        return { id: userId, score };
    });

    return scores.sort((a, b) => b.score - a.score);
}

async function checkAndAwardBadges(client, guildId, userId, data) {
    const newBadges = [];

    if (data.ticketsClosed >= 100 && !data.badges.includes('ticket_master')) {
        newBadges.push('ticket_master');
    }
    if (data.warningsIssued >= 50 && !data.badges.includes('warning_warrior')) {
        newBadges.push('warning_warrior');
    }
    if (data.bansIssued >= 25 && !data.badges.includes('ban_hammer')) {
        newBadges.push('ban_hammer');
    }
    if (data.botsCreated >= 50 && !data.badges.includes('bot_builder')) {
        newBadges.push('bot_builder');
    }
    if (data.messageCount >= 1000 && !data.badges.includes('chat_champion')) {
        newBadges.push('chat_champion');
    }
    if (data.activityStreak >= 7 && !data.badges.includes('streak_king')) {
        newBadges.push('streak_king');
    }

    if (newBadges.length > 0) {
        data.badges.push(...newBadges);
        client.staffstats.set(`${guildId}-${userId}`, data);
    }

    return newBadges;
}

function getDefaultStaffData() {
    return {
        points: 0,
        pointHistory: [],
        ticketsClosed: 0,
        warningsIssued: 0,
        bansIssued: 0,
        botsCreated: 0,
        messageCount: 0,
        activityStreak: 0,
        lastActive: 0,
        badges: [],
        joinedAt: Date.now()
    };
}

async function trackStaffAction(client, guildId, userId, actionType, amount = 1) {
    client.staffstats.ensure(`${guildId}-${userId}`, getDefaultStaffData());

    const data = client.staffstats.get(`${guildId}-${userId}`);

    switch (actionType) {
        case 'ticket':
            data.ticketsClosed += amount;
            data.points += 10;
            break;
        case 'warning':
            data.warningsIssued += amount;
            data.points += 5;
            break;
        case 'ban':
            data.bansIssued += amount;
            data.points += 15;
            break;
        case 'bot':
            data.botsCreated += amount;
            data.points += 20;
            break;
        case 'message':
            data.messageCount += amount;
            break;
    }

    const now = Date.now();
    if (now - data.lastActive > 24 * 60 * 60 * 1000) {
        if (now - data.lastActive < 48 * 60 * 60 * 1000) {
            data.activityStreak += 1;
        } else {
            data.activityStreak = 1;
        }
    }
    data.lastActive = now;

    client.staffstats.set(`${guildId}-${userId}`, data);

    await checkAndAwardBadges(client, guildId, userId, data);
}

module.exports = { 
    handleStaffCommand, 
    handleCompetitionCommand,
    trackStaffAction,
    getDefaultStaffData,
    BADGES
};
