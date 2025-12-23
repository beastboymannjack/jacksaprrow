const Discord = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");
const remoteBotClient = require("../../api/remoteBotClient");
const { recoverBot, getExpirationStatus, findBotByName } = require("../../expirationChecker");

module.exports = {
    name: "recoverbot",
    description: "Recover an expired bot after payment is completed",
    usage: "recoverbot <botId> [days]",
    
    run: async (client, message, args) => {
        // Check permissions - only bot creator roles and owner can use this
        const isOwner = message.author.id === mainconfig.BotOwnerID || 
            mainconfig.OwnerInformation.OwnerID.includes(message.author.id);
        const isAdmin = message.member.permissions.has("Administrator");
        const hasBotCreatorRole = message.member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) ||
            message.member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`) ||
            message.member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`);

        if (!isOwner && !isAdmin && !hasBotCreatorRole) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only bot creators and admins can recover expired bots.")
                ]
            });
        }

        if (!args[0]) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing Bot ID")
                    .setDescription(`**Usage:** \`${client.config.prefix || ','}recoverbot <botId> [days]\`\n\nProvide the Discord bot ID to recover. Default duration is 30 days.`)
                    .addFields(
                        { name: "Example", value: `\`${client.config.prefix || ','}recoverbot 1234567890 30\`` }
                    )
                ]
            });
        }

        const botId = args[0];
        const days = parseInt(args[1]) || 30;

        if (days < 1 || days > 365) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Duration")
                    .setDescription("Duration must be between 1 and 365 days.")
                ]
            });
        }

        // Check if bot exists
        const botData = client.bots.get(botId);
        if (!botData) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Bot Not Found")
                    .setDescription(`No bot found with ID \`${botId}\`.\n\nThe bot may have been permanently deleted after the grace period.`)
                ]
            });
        }

        // Check expiration status
        const status = getExpirationStatus(botData);
        
        if (status.status !== 'expired') {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FFA500")
                    .setTitle("⚠️ Bot Not Expired")
                    .setDescription(`Bot **${botData.name}** is not expired. It has **${status.days}** days remaining.`)
                ]
            });
        }

        // Show current status before recovery
        const statusMsg = await message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#FFA500")
                .setTitle("⏳ Recovering Bot...")
                .setDescription(`Recovering **${botData.name}**...`)
                .addFields(
                    { name: "Grace Period Remaining", value: `${status.graceDays} days`, inline: true },
                    { name: "New Duration", value: `${days} days`, inline: true }
                )
            ]
        });

        try {
            // Recover the bot in database
            const result = recoverBot(client, botId, days);
            
            if (!result.success) {
                return statusMsg.edit({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Recovery Failed")
                        .setDescription(result.error)
                    ]
                });
            }

            // Start the bot on deadloom hosting
            let startResult = null;
            if (botData.location === 'secondary' && remoteBotClient.isConfigured()) {
                try {
                    startResult = await remoteBotClient.startBot(botData.name);
                    console.log(`[RecoverBot] Started ${botData.name} on deadloom hosting`);
                } catch (err) {
                    console.error(`[RecoverBot] Failed to start ${botData.name}: ${err.message}`);
                }
            }

            // Sync expiration to secondary server
            try {
                await remoteBotClient.setExpiration(botData.name, result.newExpirationDate, days, message.author.id);
            } catch (err) {
                console.error(`[RecoverBot] Failed to sync expiration: ${err.message}`);
            }

            // Log to bot manager logs
            try {
                const logChannel = await client.channels.fetch(`${mainconfig.BotManagerLogs.toString()}`);
                if (logChannel) {
                    logChannel.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("🔄 Bot Recovered")
                            .setDescription(`Bot **${botData.name}** was recovered by <@${message.author.id}>`)
                            .addFields(
                                { name: "Bot ID", value: botId, inline: true },
                                { name: "New Duration", value: `${days} days`, inline: true },
                                { name: "Owner", value: `<@${botData.ownerID}>`, inline: true }
                            )
                            .setFooter({ text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                            .setTimestamp()
                        ]
                    }).catch(console.log);
                }
            } catch (e) {
                console.error(e);
            }

            // Notify the bot owner
            try {
                const owner = await client.users.fetch(botData.ownerID);
                if (owner) {
                    owner.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("✅ Bot Recovered!")
                            .setDescription(`Your bot **${botData.name}** has been recovered and is now active again!`)
                            .addFields(
                                { name: "New Expiration", value: new Date(result.newExpirationDate).toLocaleDateString(), inline: true },
                                { name: "Duration", value: `${days} days`, inline: true }
                            )
                            .setTimestamp()
                        ]
                    }).catch(() => {});
                }
            } catch (e) {}

            // Success message
            await statusMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("✅ Bot Recovered Successfully!")
                    .setDescription(`Bot **${botData.name}** has been recovered and is ready to use.`)
                    .addFields(
                        { name: "Bot Name", value: botData.name, inline: true },
                        { name: "Owner", value: `<@${botData.ownerID}>`, inline: true },
                        { name: "Location", value: botData.location || 'secondary', inline: true },
                        { name: "New Expiration", value: new Date(result.newExpirationDate).toLocaleString(), inline: true },
                        { name: "Duration", value: `${days} days`, inline: true },
                        { name: "Started", value: startResult ? '✅ Yes' : '⚠️ Manual start needed', inline: true }
                    )
                    .setFooter({ text: `Recovered by ${message.author.tag}` })
                    .setTimestamp()
                ]
            });

        } catch (err) {
            console.error('[RecoverBot] Error:', err);
            await statusMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Recovery Error")
                    .setDescription(`An error occurred while recovering the bot: ${err.message}`)
                ]
            });
        }
    }
};
