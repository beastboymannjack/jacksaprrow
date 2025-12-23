const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const mainconfig = require("../../../mainconfig.js");

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.SupporterRoleId,
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("ADMINISTRATOR");
}

module.exports = {
    name: "history",
    description: "View a user's moderation history",
    usage: "history <@user>",
    aliases: ["modlog", "infractions"],

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to view moderation history.")
                ]
            });
        }

        const targetUser = message.mentions.users.first() || 
            (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        
        if (!targetUser) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing User")
                    .setDescription("Please mention a user to view their history.\n\n**Usage:** `history @user`")
                ]
            });
        }

        const warningsKey = `${message.guild.id}-${targetUser.id}`;
        const warnings = client.warnings.get(warningsKey) || [];
        
        const allCases = client.modcases.fetchEverything();
        const userCases = [];
        
        allCases.forEach((caseData, caseId) => {
            if (!caseId || caseId.startsWith('counter') || typeof caseData !== 'object' || !caseData.user) return;
            if (caseData.user === targetUser.id && caseData.guildId === message.guild.id) {
                userCases.push({ id: caseId, ...caseData });
            }
        });

        userCases.sort((a, b) => new Date(b.date) - new Date(a.date));

        const activeWarnings = warnings.filter(w => w.active !== false).length;

        if (userCases.length === 0) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle(`📋 Moderation History: ${targetUser.tag}`)
                    .setDescription("✅ This user has a clean record!")
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const typeEmojis = {
            warn: '⚠️',
            kick: '👢',
            ban: '🔨',
            unban: '🔓',
            timeout: '⏰',
            strike: '⚡'
        };

        const typeColors = {
            warn: '#FEE75C',
            kick: '#ED4245',
            ban: '#ED4245',
            unban: '#57F287',
            timeout: '#FEE75C',
            strike: '#ED4245'
        };

        let historyText = '';
        const recentCases = userCases.slice(0, 10);

        for (const caseData of recentCases) {
            const emoji = typeEmojis[caseData.type] || '📋';
            const date = moment(caseData.date).format('MMM Do YYYY');
            const moderator = await client.users.fetch(caseData.moderator).catch(() => ({ tag: 'Unknown' }));
            
            historyText += `${emoji} **\`${caseData.id}\`** - ${caseData.type.toUpperCase()}\n`;
            historyText += `└ ${date} by ${moderator.tag}\n`;
            historyText += `└ ${caseData.reason.substring(0, 50)}${caseData.reason.length > 50 ? '...' : ''}\n\n`;
        }

        if (userCases.length > 10) {
            historyText += `*...and ${userCases.length - 10} more cases*`;
        }

        const stats = {
            warn: userCases.filter(c => c.type === 'warn').length,
            kick: userCases.filter(c => c.type === 'kick').length,
            ban: userCases.filter(c => c.type === 'ban').length,
            timeout: userCases.filter(c => c.type === 'timeout').length
        };

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle(`📋 Moderation History: ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields({ name: "📊 Overview", value: `Total Cases: **${userCases.length}**\n` +
                `Active Warnings: **${activeWarnings}**`, inline: true })
            .addFields({ name: "📈 Breakdown", value: `⚠️ Warns: ${stats.warn}\n` +
                `👢 Kicks: ${stats.kick}\n` +
                `🔨 Bans: ${stats.ban}\n` +
                `⏰ Timeouts: ${stats.timeout}`, inline: true })
            .addFields({ name: "📜 Recent Cases", value: historyText || "No cases found" })
            .setFooter({ text: `Use 'case <id>' to view details • Staff Management System`, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
