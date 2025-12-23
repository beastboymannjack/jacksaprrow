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
    name: "strikes",
    description: "View a user's strike count or add a strike",
    usage: "strikes <@user> | strike <@user> <reason>",
    aliases: ["strike"],

    run: async (client, message, args, prefix, commandName) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You don't have permission to manage strikes.")
                ]
            });
        }

        const isAddStrike = message.content.toLowerCase().includes(`${prefix}strike `) && 
                           !message.content.toLowerCase().includes(`${prefix}strikes`);

        const targetUser = message.mentions.users.first() || 
            (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        
        if (!targetUser) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing User")
                    .setDescription("Please mention a user.\n\n**Usage:**\n`strikes @user` - View strikes\n`strike @user <reason>` - Add a strike")
                ]
            });
        }

        const settings = client.serversettings.get(message.guild.id) || {};
        const strikeThreshold = settings['strike-threshold'] || 3;
        const autoBanStrikes = settings['auto-ban-strikes'] || 5;
        const currentStrikes = getStrikes(client, message.guild.id, targetUser.id);

        if (isAddStrike) {
            if (targetUser.id === message.author.id) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Invalid Target")
                        .setDescription("You cannot strike yourself.")
                    ]
                });
            }

            const reason = args.slice(1).join(' ') || 'No reason provided';
            const caseId = generateCaseId(client, message.guild.id);
            const warningsKey = `${message.guild.id}-${targetUser.id}`;
            
            client.warnings.ensure(warningsKey, []);
            
            const strike = {
                caseId: caseId,
                date: new Date(),
                reason: reason,
                issuer: message.author.id,
                issuerTag: message.author.tag,
                active: true,
                isStrike: true
            };
            
            client.warnings.push(warningsKey, strike);
            
            client.modcases.set(caseId, {
                type: 'strike',
                user: targetUser.id,
                userTag: targetUser.tag,
                moderator: message.author.id,
                moderatorTag: message.author.tag,
                reason: reason,
                date: new Date(),
                guildId: message.guild.id,
                status: 'active'
            });
            
            const newStrikeCount = currentStrikes + 1;
            
            const embed = new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("⚡ Strike Issued")
                .addFields({ name: "👤 User", value: `${targetUser.tag}\n<@${targetUser.id}>`, inline: true })
                .addFields({ name: "👮 Moderator", value: `${message.author.tag}`, inline: true })
                .addFields({ name: "📋 Case ID", value: `\`${caseId}\``, inline: true })
                .addFields({ name: "📝 Reason", value: reason })
                .addFields({ name: "⚡ Strike Count", value: `${newStrikeCount}/${autoBanStrikes}`, inline: true })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Staff Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            let escalationMessage = '';
            if (newStrikeCount >= autoBanStrikes) {
                escalationMessage = `\n\n🔨 **AUTO-BAN:** User has reached ${autoBanStrikes} strikes!`;
            } else if (newStrikeCount >= strikeThreshold) {
                escalationMessage = `\n\n⏰ **AUTO-TIMEOUT:** User has reached ${strikeThreshold} strikes!`;
            } else if (newStrikeCount === strikeThreshold - 1) {
                escalationMessage = `\n\n⚠️ **WARNING:** One more strike will trigger timeout!`;
            }

            embed.setDescription(`Strike has been added to ${targetUser.tag}.${escalationMessage}`);

            await message.reply({ embeds: [embed] });

            try {
                await targetUser.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("⚡ You Received a Strike")
                        .setDescription(`You have received a strike in **${message.guild.name}**.`)
                        .addFields({ name: "📝 Reason", value: reason })
                        .addFields({ name: "📋 Case ID", value: `\`${caseId}\`` })
                        .addFields({ name: "⚡ Current Strikes", value: `${newStrikeCount}/${autoBanStrikes}` })
                        .addFields({ name: "⚠️ Consequences", value: `• ${strikeThreshold} strikes = Timeout\n• ${autoBanStrikes} strikes = Ban` })
                        .setTimestamp()
                    ]
                });
            } catch (e) {}

            if (newStrikeCount >= autoBanStrikes) {
                try {
                    const member = await message.guild.members.fetch(targetUser.id);
                    await member.ban({ reason: `Auto-ban: ${autoBanStrikes}+ strikes` });
                    message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("🔨 Auto-Ban Executed")
                            .setDescription(`**${targetUser.tag}** has been automatically banned for reaching ${autoBanStrikes} strikes.`)
                        ]
                    });
                } catch (e) {
                    message.channel.send({ content: `⚠️ Could not auto-ban user: ${e.message}` });
                }
            } else if (newStrikeCount >= strikeThreshold) {
                try {
                    const member = await message.guild.members.fetch(targetUser.id);
                    const timeoutDuration = settings['timeout-duration'] || 604800000;
                    await member.timeout(timeoutDuration, `Auto-timeout: ${strikeThreshold}+ strikes`);
                    message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#FEE75C")
                            .setTitle("⏰ Auto-Timeout Executed")
                            .setDescription(`**${targetUser.tag}** has been automatically timed out for 7 days for reaching ${strikeThreshold} strikes.`)
                        ]
                    });
                } catch (e) {
                    message.channel.send({ content: `⚠️ Could not auto-timeout user: ${e.message}` });
                }
            }
        } else {
            const warningsKey = `${message.guild.id}-${targetUser.id}`;
            const allStrikes = client.warnings.get(warningsKey) || [];
            const activeStrikes = allStrikes.filter(w => w.active !== false);
            
            let progressBar = '';
            for (let i = 0; i < autoBanStrikes; i++) {
                if (i < currentStrikes) {
                    progressBar += '🔴';
                } else {
                    progressBar += '⚪';
                }
            }

            let consequence = '✅ No immediate consequences';
            if (currentStrikes >= autoBanStrikes) {
                consequence = '🔨 BAN THRESHOLD REACHED';
            } else if (currentStrikes >= strikeThreshold) {
                consequence = '⏰ Timeout threshold reached';
            } else if (currentStrikes === strikeThreshold - 1) {
                consequence = '⚠️ One strike away from timeout';
            }

            const embed = new EmbedBuilder()
                .setColor(currentStrikes >= strikeThreshold ? "#ED4245" : "#5865F2")
                .setTitle(`⚡ Strikes: ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields({ name: "Strike Count", value: `**${currentStrikes}** / ${autoBanStrikes}`, inline: true })
                .addFields({ name: "Status", value: consequence, inline: true })
                .addFields({ name: "Progress", value: progressBar })
                .addFields({ name: "Thresholds", value: `⏰ Timeout at: ${strikeThreshold} strikes\n🔨 Ban at: ${autoBanStrikes} strikes` })
                .setFooter({ text: "Staff Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            if (activeStrikes.length > 0) {
                let strikeList = '';
                const recentStrikes = activeStrikes.slice(-5);
                for (const strike of recentStrikes) {
                    const date = new Date(strike.date).toLocaleDateString();
                    strikeList += `\`${strike.caseId}\` - ${date}\n└ ${strike.reason.substring(0, 40)}${strike.reason.length > 40 ? '...' : ''}\n`;
                }
                if (activeStrikes.length > 5) {
                    strikeList += `\n*...and ${activeStrikes.length - 5} more*`;
                }
                embed.addFields({ name: "Recent Strikes", value: strikeList });
            }

            await message.reply({ embeds: [embed] });
        }
    }
};
