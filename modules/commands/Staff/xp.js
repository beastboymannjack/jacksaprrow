const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const ProgressionService = require('../../staff/progressionService.js');
const { STAFF_RANKS, XP_REWARDS, CELEBRATION_EMOJIS } = require('../../constants/staff.js');

module.exports = {
    name: "xp",
    description: "⚡ Quick XP check, leaderboard, and admin XP management!",
    usage: "xp [user|leaderboard|add|remove|set] [args]",
    aliases: ["exp", "experience", "points"],

    run: async (client, message, args) => {
        const progressionService = new ProgressionService(client);
        
        if (!progressionService.hasStaffRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Access Denied!")
                    .setDescription("**Oops!** You need to be a staff member to use the XP system!\n\nIf you believe this is an error, please contact a manager. 💬")
                    .setFooter({ text: "Staff XP System" })
                ]
            });
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand) {
            return showQuickXP(client, message, message.author, progressionService);
        }

        if (message.mentions.users.first()) {
            const targetUser = message.mentions.users.first();
            return showQuickXP(client, message, targetUser, progressionService);
        }

        switch (subcommand) {
            case 'leaderboard':
            case 'lb':
            case 'top':
            case 'ranking':
                return showLeaderboard(client, message, args.slice(1), progressionService);
            
            case 'add':
            case 'give':
                return addXP(client, message, args.slice(1), progressionService);
            
            case 'remove':
            case 'take':
            case 'subtract':
                return removeXP(client, message, args.slice(1), progressionService);
            
            case 'set':
                return setXP(client, message, args.slice(1), progressionService);
            
            case 'history':
            case 'log':
                return showHistory(client, message, args.slice(1), progressionService);
            
            case 'rewards':
            case 'actions':
                return showRewards(client, message, progressionService);
            
            case 'promote':
                return promoteUser(client, message, args.slice(1), progressionService);
            
            case 'demote':
                return demoteUser(client, message, args.slice(1), progressionService);
            
            default:
                const user = await client.users.fetch(subcommand).catch(() => null);
                if (user) {
                    return showQuickXP(client, message, user, progressionService);
                }
                return showHelp(client, message, progressionService);
        }
    }
};

async function showQuickXP(client, message, targetUser, progressionService) {
    const stats = progressionService.getStats(targetUser.id);
    const currentRank = progressionService.getRank(targetUser.id);
    const progressData = progressionService.getProgressToNextRank(targetUser.id);
    const nextRank = progressionService.getNextRank(targetUser.id);
    const leaderboard = progressionService.getLeaderboard(50);
    const userPosition = leaderboard.findIndex(e => e.odId === targetUser.id) + 1;

    const celebration = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
    const progressBar = progressionService.generateProgressBar(progressData.progress, 12);

    const embed = new EmbedBuilder()
        .setColor(currentRank.color)
        .setTitle(`${celebration} ${targetUser.username}'s XP Card`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields({ name: "⚡ Total XP", value: `**${stats.totalXp.toLocaleString()}**`, inline: true })
        .addFields({ name: `${currentRank.emoji} Rank`, value: `**${currentRank.name}**`, inline: true })
        .addFields({ name: "🏆 Position", value: userPosition > 0 ? `**#${userPosition}**` : 'Unranked', inline: true });

    if (!progressData.isMaxRank && nextRank) {
        embed.addFields({ name: "📈 Progress", value: `Next: ${nextRank.emoji} **${nextRank.name}**\n` +
            `\`[${progressBar}]\` ${progressData.progress}%\n` +
            `⚡ **${progressData.xpNeeded.toLocaleString()}** XP to go!`, inline: false });
    } else {
        embed.addFields({ name: "👑 Status", value: `${celebration} **MAX RANK!** ${celebration}\nYou've reached the pinnacle!`, inline: false });
    }

    embed.addFields({ name: "🔥 Streak", value: `**${stats.currentStreak}** day${stats.currentStreak !== 1 ? 's' : ''}`, inline: true })
        .addFields({ name: "🏅 Achievements", value: `**${stats.achievements.length}** unlocked`, inline: true })
        .addFields({ name: "🎫 Tickets", value: `**${stats.ticketsClosed}** closed`, inline: true })
        .setFooter({ text: "Use ,xp leaderboard to see rankings! • ,progress for full stats", iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function showLeaderboard(client, message, args, progressionService) {
    const page = parseInt(args[0]) || 1;
    const perPage = 10;
    const leaderboard = progressionService.getLeaderboard(100);
    
    const totalPages = Math.ceil(leaderboard.length / perPage);
    const currentPage = Math.min(Math.max(1, page), totalPages || 1);
    const startIndex = (currentPage - 1) * perPage;
    const pageEntries = leaderboard.slice(startIndex, startIndex + perPage);

    if (leaderboard.length === 0) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("🏆 Staff XP Leaderboard")
                .setDescription("*No staff members have earned XP yet!*\n\nStart helping out to appear on the leaderboard! 💪")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    let description = '';
    for (const entry of pageEntries) {
        const medal = entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : `**#${entry.position}**`;
        const user = await client.users.fetch(entry.odId).catch(() => null);
        const username = user ? user.username : 'Unknown User';
        
        description += `${medal} ${entry.rank.emoji} **${username}**\n`;
        description += `└ ⚡ \`${entry.totalXp.toLocaleString()}\` XP • 🎫 ${entry.ticketsClosed} tickets • 🔥 ${entry.currentStreak} streak\n\n`;
    }

    const userPosition = leaderboard.findIndex(e => e.odId === message.author.id) + 1;
    let yourPosition = '';
    if (userPosition > 0 && (userPosition < startIndex + 1 || userPosition > startIndex + perPage)) {
        const yourEntry = leaderboard[userPosition - 1];
        yourPosition = `\n**Your Position: #${userPosition}** (${yourEntry.totalXp.toLocaleString()} XP)`;
    }

    const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle("🏆 Staff XP Leaderboard")
        .setDescription(description + yourPosition)
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Page ${currentPage}/${totalPages} • ${leaderboard.length} staff members • Use ,xp leaderboard <page>`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('lb_first')
                .setLabel('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId('lb_prev')
                .setLabel('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId('lb_page')
                .setLabel(`${currentPage}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('lb_next')
                .setLabel('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === totalPages),
            new ButtonBuilder()
                .setCustomId('lb_last')
                .setLabel('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalPages)
        );

    const reply = await message.reply({ embeds: [embed], components: [row] });

    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 120000
    });

    let page2 = currentPage;

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'lb_first') page2 = 1;
        else if (interaction.customId === 'lb_prev') page2 = Math.max(1, page2 - 1);
        else if (interaction.customId === 'lb_next') page2 = Math.min(totalPages, page2 + 1);
        else if (interaction.customId === 'lb_last') page2 = totalPages;

        const newStart = (page2 - 1) * perPage;
        const newEntries = leaderboard.slice(newStart, newStart + perPage);

        let newDesc = '';
        for (const entry of newEntries) {
            const medal = entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : `**#${entry.position}**`;
            const user = await client.users.fetch(entry.odId).catch(() => null);
            const username = user ? user.username : 'Unknown User';
            newDesc += `${medal} ${entry.rank.emoji} **${username}**\n`;
            newDesc += `└ ⚡ \`${entry.totalXp.toLocaleString()}\` XP • 🎫 ${entry.ticketsClosed} tickets • 🔥 ${entry.currentStreak} streak\n\n`;
        }

        if (userPosition > 0 && (userPosition < newStart + 1 || userPosition > newStart + perPage)) {
            const yourEntry = leaderboard[userPosition - 1];
            newDesc += `\n**Your Position: #${userPosition}** (${yourEntry.totalXp.toLocaleString()} XP)`;
        }

        const newEmbed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("🏆 Staff XP Leaderboard")
            .setDescription(newDesc)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Page ${page2}/${totalPages} • ${leaderboard.length} staff members`, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const newRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('lb_first').setLabel('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(page2 === 1),
                new ButtonBuilder().setCustomId('lb_prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page2 === 1),
                new ButtonBuilder().setCustomId('lb_page').setLabel(`${page2}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('lb_next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page2 === totalPages),
                new ButtonBuilder().setCustomId('lb_last').setLabel('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(page2 === totalPages)
            );

        await interaction.update({ embeds: [newEmbed], components: [newRow] });
    });
}

async function addXP(client, message, args, progressionService) {
    if (!progressionService.hasAdminPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Administrators** can manually add XP!")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const targetUser = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(a)));
    const reason = args.filter(a => !a.startsWith('<@') && isNaN(a)).join(' ') || 'Manual XP addition';

    if (!targetUser) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Missing User!")
                .setDescription("Please mention a user to add XP to!\n\n**Usage:** `xp add @user <amount> [reason]`\n**Example:** `xp add @John 500 Great performance this week!`")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    if (!amount || amount <= 0) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Invalid Amount!")
                .setDescription("Please provide a valid positive XP amount!\n\n**Usage:** `xp add @user <amount> [reason]`")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const result = await progressionService.addXP(targetUser.id, null, amount, reason);
    const celebration = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];

    const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle(`${celebration} XP Added Successfully! ${celebration}`)
        .setDescription(`**${targetUser.tag}** has received XP!`)
        .addFields({ name: "⚡ XP Added", value: `**+${amount.toLocaleString()}**`, inline: true })
        .addFields({ name: "📊 New Total", value: `**${result.totalXp.toLocaleString()}**`, inline: true })
        .addFields({ name: "✍️ Added By", value: `<@${message.author.id}>`, inline: true })
        .addFields({ name: "📝 Reason", value: reason, inline: false })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Staff XP System", iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    if (result.promoted) {
        embed.addFields({ name: "🎉 PROMOTION!", value: `Promoted to **${result.newRank.emoji} ${result.newRank.name}**!`, inline: false });
    }

    if (result.newAchievements && result.newAchievements.length > 0) {
        const achieveText = result.newAchievements.map(a => `${a.emoji} ${a.name}`).join('\n');
        embed.addFields({ name: "🏆 New Achievements!", value: achieveText, inline: false });
    }

    return message.reply({ embeds: [embed] });
}

async function removeXP(client, message, args, progressionService) {
    if (!progressionService.hasAdminPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Administrators** can remove XP!")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const targetUser = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(a)));
    const reason = args.filter(a => !a.startsWith('<@') && isNaN(a)).join(' ') || 'Manual XP removal';

    if (!targetUser) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Missing User!")
                .setDescription("Please mention a user to remove XP from!\n\n**Usage:** `xp remove @user <amount> [reason]`")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    if (!amount || amount <= 0) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Invalid Amount!")
                .setDescription("Please provide a valid positive XP amount to remove!\n\n**Usage:** `xp remove @user <amount> [reason]`")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const result = await progressionService.removeXP(targetUser.id, amount, reason);

    const embed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle("📉 XP Removed")
        .setDescription(`XP has been removed from **${targetUser.tag}**`)
        .addFields({ name: "⚡ XP Removed", value: `**-${amount.toLocaleString()}**`, inline: true })
        .addFields({ name: "📊 New Total", value: `**${result.totalXp.toLocaleString()}**`, inline: true })
        .addFields({ name: "✍️ Removed By", value: `<@${message.author.id}>`, inline: true })
        .addFields({ name: "📝 Reason", value: reason, inline: false })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Staff XP System", iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function setXP(client, message, args, progressionService) {
    if (!progressionService.hasAdminPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Administrators** can set XP!")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const targetUser = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(a)));

    if (!targetUser || amount === undefined || amount < 0) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Invalid Arguments!")
                .setDescription("Please provide a user and amount!\n\n**Usage:** `xp set @user <amount>`")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const stats = progressionService.ensureUserStats(targetUser.id);
    const oldXp = stats.totalXp;
    stats.xp = amount;
    stats.totalXp = amount;
    stats.xpHistory.unshift({
        amount: amount - oldXp,
        type: 'XP_SET',
        emoji: '⚙️',
        message: `XP set to ${amount} by admin`,
        date: new Date()
    });
    client.staffstats.set(targetUser.id, stats);

    await progressionService.checkPromotion(targetUser.id);

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("⚙️ XP Set Successfully")
        .setDescription(`**${targetUser.tag}**'s XP has been updated!`)
        .addFields({ name: "📊 Previous XP", value: `${oldXp.toLocaleString()}`, inline: true })
        .addFields({ name: "⚡ New XP", value: `**${amount.toLocaleString()}**`, inline: true })
        .addFields({ name: "✍️ Set By", value: `<@${message.author.id}>`, inline: true })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Staff XP System" })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function showHistory(client, message, args, progressionService) {
    const targetUser = message.mentions.users.first() || message.author;
    const recentXP = progressionService.getRecentXP(targetUser.id, 15);

    if (recentXP.length === 0) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("📜 XP History")
                .setDescription(`*${targetUser.id === message.author.id ? 'You have' : `${targetUser.username} has`} no XP history yet!*\n\nStart earning XP by helping out! 💪`)
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    let historyText = '';
    for (const entry of recentXP) {
        const sign = entry.amount >= 0 ? '+' : '';
        const timeAgo = moment(entry.date).fromNow();
        historyText += `${entry.emoji} **${sign}${entry.amount}** - ${entry.message}\n`;
        historyText += `└ *${timeAgo}*\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`📜 ${targetUser.username}'s XP History`)
        .setDescription(historyText)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Showing last ${recentXP.length} entries • Staff XP System`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function showRewards(client, message, progressionService) {
    let rewardText = '';
    for (const [key, reward] of Object.entries(XP_REWARDS)) {
        rewardText += `${reward.emoji} **${reward.message}** - +${reward.xp} XP\n`;
    }

    const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle("⚡ XP Rewards Guide")
        .setDescription("**Earn XP by performing these actions:**\n\n" + rewardText)
        .addFields({ name: "💡 Tips", value: "• Maintain a daily activity streak for bonus XP!\n" +
            "• Complete achievements for extra XP rewards!\n" +
            "• Help train new staff for mentor bonuses!", inline: false })
        .setFooter({ text: "Staff XP System • Keep earning to rank up!", iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function promoteUser(client, message, args, progressionService) {
    if (!progressionService.hasAdminPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Administrators** can promote staff!")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const targetUser = message.mentions.users.first();
    const targetRank = args.find(a => !a.startsWith('<@'))?.toUpperCase();

    if (!targetUser) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Missing User!")
                .setDescription("Please mention a user to promote!\n\n**Usage:** `xp promote @user [rank]`")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const result = await progressionService.promoteUser(targetUser.id, message.author.id, targetRank);

    if (!result.success) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Promotion Failed!")
                .setDescription(result.error)
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const celebration = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];

    const embed = new EmbedBuilder()
        .setColor(result.newRank.color)
        .setTitle(`${celebration} PROMOTION! ${celebration}`)
        .setDescription(progressionService.getRandomPromotion(targetUser.id, result.newRank.name))
        .addFields({ name: "📈 Rank Change", value: `${result.oldRank.emoji} ${result.oldRank.name} → ${result.newRank.emoji} ${result.newRank.name}`, inline: false })
        .addFields({ name: "✨ New Perks", value: result.newRank.perks.map(p => `• ${p}`).join('\n'), inline: false })
        .addFields({ name: "👤 Promoted By", value: `<@${message.author.id}>`, inline: true })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: "Staff XP System • Congratulations!", iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function demoteUser(client, message, args, progressionService) {
    if (!progressionService.hasAdminPermission(message.member)) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Permission Denied!")
                .setDescription("Only **Administrators** can demote staff!")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const targetUser = message.mentions.users.first();
    const targetRank = args.find(a => !a.startsWith('<@'))?.toUpperCase();

    if (!targetUser) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Missing User!")
                .setDescription("Please mention a user to demote!\n\n**Usage:** `xp demote @user [rank]`")
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const result = await progressionService.demoteUser(targetUser.id, message.author.id, targetRank);

    if (!result.success) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ Demotion Failed!")
                .setDescription(result.error)
                .setFooter({ text: "Staff XP System" })
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle("📉 Rank Adjustment")
        .setDescription(`**${targetUser.tag}**'s rank has been adjusted.`)
        .addFields({ name: "📉 Rank Change", value: `${result.oldRank.emoji} ${result.oldRank.name} → ${result.newRank.emoji} ${result.newRank.name}`, inline: false })
        .addFields({ name: "👤 Adjusted By", value: `<@${message.author.id}>`, inline: true })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Staff XP System", iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function showHelp(client, message, progressionService) {
    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("⚡ XP System - Command Guide")
        .setDescription("**Quick XP management and leaderboard commands!**")
        .addFields({ name: "📊 Information Commands", value: "`xp` - View your XP\n" +
            "`xp @user` - View someone's XP\n" +
            "`xp leaderboard` - View the leaderboard\n" +
            "`xp history [@user]` - View XP history\n" +
            "`xp rewards` - View XP reward actions", inline: false })
        .addFields({ name: "⚙️ Admin Commands", value: "`xp add @user <amount> [reason]` - Add XP\n" +
            "`xp remove @user <amount> [reason]` - Remove XP\n" +
            "`xp set @user <amount>` - Set exact XP\n" +
            "`xp promote @user [rank]` - Promote a user\n" +
            "`xp demote @user [rank]` - Demote a user", inline: false })
        .addFields({ name: "💡 Related Commands", value: "`progress` - Full progression profile\n" +
            "`achievements` - View all achievements", inline: false })
        .setFooter({ text: "Staff XP System • Use ,progress for full stats!", iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}
