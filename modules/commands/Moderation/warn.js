const { EmbedBuilder } = require('discord.js');
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

function generateCaseId(client, guildId) {
    const counterKey = `counter-${guildId}`;
    client.modcases.ensure(counterKey, { count: 0 });
    const counter = client.modcases.get(counterKey, "count") + 1;
    client.modcases.set(counterKey, counter, "count");
    return `MOD-${guildId.slice(-4)}-${String(counter).padStart(3, '0')}`;
}

function getStrikes(client, guildId, userId) {
    const key = `${guildId}-${userId}`;
    const warnings = client.warnings.get(key) || [];
    return warnings.filter(w => w.active !== false).length;
}

module.exports = {
    name: "warn",
    description: "Issue a warning to a user",
    usage: "warn <@user> <reason>",

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to use this command.")
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
                    .setDescription("Please mention a user to warn.\n\n**Usage:** `warn @user <reason>`")
                ]
            });
        }

        if (targetUser.id === message.author.id) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Target")
                    .setDescription("You cannot warn yourself.")
                ]
            });
        }

        if (targetUser.bot) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Target")
                    .setDescription("You cannot warn bots.")
                ]
            });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        if (reason.length > 500) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Reason Too Long")
                    .setDescription("Reason must be under 500 characters.")
                ]
            });
        }

        const caseId = generateCaseId(client, message.guild.id);
        const warningsKey = `${message.guild.id}-${targetUser.id}`;
        
        client.warnings.ensure(warningsKey, []);
        
        const warning = {
            caseId: caseId,
            date: new Date(),
            reason: reason,
            issuer: message.author.id,
            issuerTag: message.author.tag,
            active: true
        };
        
        client.warnings.push(warningsKey, warning);
        
        client.modcases.set(caseId, {
            type: 'warn',
            user: targetUser.id,
            userTag: targetUser.tag,
            moderator: message.author.id,
            moderatorTag: message.author.tag,
            reason: reason,
            date: new Date(),
            guildId: message.guild.id,
            status: 'active'
        });
        
        const currentStrikes = getStrikes(client, message.guild.id, targetUser.id);
        
        const settings = client.serversettings.get(message.guild.id) || {};
        const strikeThreshold = settings['strike-threshold'] || 3;
        const autoBanStrikes = settings['auto-ban-strikes'] || 5;
        
        const embed = new EmbedBuilder()
            .setColor("#FEE75C")
            .setTitle("⚠️ Warning Issued")
            .addFields({ name: "👤 User", value: `${targetUser.tag}\n<@${targetUser.id}>`, inline: true })
            .addFields({ name: "👮 Moderator", value: `${message.author.tag}`, inline: true })
            .addFields({ name: "📋 Case ID", value: `\`${caseId}\``, inline: true })
            .addFields({ name: "📝 Reason", value: reason })
            .addFields({ name: "⚠️ Total Warnings", value: `${currentStrikes}/${strikeThreshold} before timeout`, inline: true })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Staff Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        try {
            await targetUser.send({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("⚠️ You Have Been Warned")
                    .setDescription(`You have received a warning in **${message.guild.name}**.`)
                    .addFields({ name: "📝 Reason", value: reason })
                    .addFields({ name: "📋 Case ID", value: `\`${caseId}\`` })
                    .addFields({ name: "⚠️ Total Warnings", value: `${currentStrikes}/${strikeThreshold}` })
                    .setFooter({ text: `Warning ${currentStrikes} of ${strikeThreshold}` })
                    .setTimestamp()
                ]
            });
        } catch (e) {
            message.channel.send({ content: `⚠️ Could not DM ${targetUser.tag} about their warning.` });
        }

        if (currentStrikes >= autoBanStrikes) {
            try {
                const member = await message.guild.members.fetch(targetUser.id);
                await member.ban({ reason: `Auto-ban: ${autoBanStrikes}+ warnings` });
                message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("🔨 Auto-Ban Triggered")
                        .setDescription(`**${targetUser.tag}** has been automatically banned for reaching ${autoBanStrikes} warnings.`)
                    ]
                });
            } catch (e) {
                message.channel.send({ content: `⚠️ Could not auto-ban user: ${e.message}` });
            }
        } else if (currentStrikes >= strikeThreshold) {
            try {
                const member = await message.guild.members.fetch(targetUser.id);
                const timeoutDuration = settings['timeout-duration'] || 604800000;
                await member.timeout(timeoutDuration, `Auto-timeout: ${strikeThreshold}+ warnings`);
                message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("⏰ Auto-Timeout Triggered")
                        .setDescription(`**${targetUser.tag}** has been timed out for 7 days for reaching ${strikeThreshold} warnings.`)
                    ]
                });
            } catch (e) {
                message.channel.send({ content: `⚠️ Could not auto-timeout user: ${e.message}` });
            }
        }
    }
};
