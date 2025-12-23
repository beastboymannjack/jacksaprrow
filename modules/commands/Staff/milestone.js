const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { PersonalityEngine, MILESTONE_CELEBRATIONS } = require('../../ai/advancedPersonality.js');

module.exports = {
    name: "milestone",
    description: "🏆 Check your staff milestones and achievements!",
    usage: "milestone [@user]",
    aliases: ["milestones", "goals", "journey"],

    run: async (client, message, args) => {
        const targetUser = message.mentions.users.first() || message.author;
        const guildId = message.guild.id;
        
        client.staffstats.ensure(`${guildId}-${targetUser.id}`, {
            actions: 0,
            warnings: 0,
            kicks: 0,
            bans: 0,
            mutes: 0,
            helpedUsers: 0,
            ticketsResolved: 0,
            activityStreak: 0,
            longestStreak: 0,
            lastActive: null,
            joinedStaff: new Date().toISOString()
        });

        const stats = client.staffstats.get(`${guildId}-${targetUser.id}`);
        const personality = new PersonalityEngine();
        const milestone = personality.getMilestone(stats.actions);

        const progressBar = (current, max, size = 10) => {
            const filled = Math.min(Math.floor((current / max) * size), size);
            const empty = size - filled;
            return '█'.repeat(filled) + '░'.repeat(empty);
        };

        const nextMilestones = [
            { name: "🌱 First Steps", required: 1, emoji: "🎉" },
            { name: "⚡ Getting Started", required: 10, emoji: "⚡" },
            { name: "🔥 On Fire", required: 50, emoji: "🔥" },
            { name: "💎 Century Club", required: 100, emoji: "💎" },
            { name: "🏆 Master", required: 500, emoji: "🏆" },
            { name: "👑 Legend", required: 1000, emoji: "👑" }
        ];

        let currentMilestone = nextMilestones[0];
        let nextMilestone = nextMilestones[1];
        
        for (let i = 0; i < nextMilestones.length; i++) {
            if (stats.actions >= nextMilestones[i].required) {
                currentMilestone = nextMilestones[i];
                nextMilestone = nextMilestones[i + 1] || null;
            }
        }

        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle(`🏆 ${targetUser.username}'s Staff Journey 🏆`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(milestone 
                ? `${milestone.emoji} **${milestone.title}**\n${milestone.message}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                : "🌟 Start your journey by taking moderation actions!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        embed.addFields({ name: "📊 Current Stats", value: `🎯 **Total Actions:** ${stats.actions.toLocaleString()}\n` +
            `⚠️ **Warnings:** ${stats.warnings.toLocaleString()}\n` +
            `👢 **Kicks:** ${stats.kicks.toLocaleString()}\n` +
            `🔨 **Bans:** ${stats.bans.toLocaleString()}\n` +
            `🤐 **Mutes:** ${stats.mutes.toLocaleString()}`,
            inline: true });

        embed.addFields({ name: "💫 Achievements", value: `🤝 **Helped Users:** ${stats.helpedUsers.toLocaleString()}\n` +
            `🎫 **Tickets Resolved:** ${stats.ticketsResolved.toLocaleString()}\n` +
            `🔥 **Current Streak:** ${stats.activityStreak} days\n` +
            `🏆 **Best Streak:** ${stats.longestStreak} days`,
            inline: true });

        if (nextMilestone) {
            const progress = (stats.actions / nextMilestone.required) * 100;
            embed.addFields({ name: `📈 Progress to ${nextMilestone.emoji} ${nextMilestone.name}`, value: `${progressBar(stats.actions, nextMilestone.required)} **${progress.toFixed(1)}%**\n` +
                `(${stats.actions}/${nextMilestone.required} actions)`,
                inline: false });
        } else {
            embed.addFields({ name: "👑 MAXIMUM LEVEL REACHED!", value: "You've achieved legendary status! You're an inspiration to all staff members! 🌟", inline: false });
        }

        embed.addFields({ name: "🗓️ Your Journey", value: `📅 **Joined Staff:** <t:${Math.floor(new Date(stats.joinedStaff).getTime() / 1000)}:R>\n` +
            `⏰ **Last Active:** ${stats.lastActive ? `<t:${Math.floor(new Date(stats.lastActive).getTime() / 1000)}:R>` : 'Never'}`,
            inline: false });

        embed.setFooter({ text: "🌟 Every action counts! Keep up the amazing work! 🌟" })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
