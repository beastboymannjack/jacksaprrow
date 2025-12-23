const { EmbedBuilder } = require('discord.js');
const mainconfig = require('../../../mainconfig');
const inviteTracking = require('../../inviteTracking');

module.exports = {
    name: "renew",
    aliases: ["renewbot", "extend", "renew-hosting"],
    category: "Hosting",
    description: "Renew your bot's hosting for 7 more days by inviting new members",
    usage: ",renew <botname>",
    permissions: ["SEND_MESSAGES"],
    run: async (client, message, args, cmduser, text, prefix) => {
        if (!args[0]) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Usage Error')
                    .setDescription(`**Usage:** \`${prefix}renew <botname>\`\n\n**Example:** \`${prefix}renew mybot\``)
                ]
            });
        }

        try {
            const botName = args[0].toLowerCase();
            const userId = message.author.id;
            const requiredInvites = mainconfig.InviteRequirements.RequiredInvites || 5;

            // Get bot expiration info
            const botExpiration = inviteTracking.getBotExpiration(botName);
            
            if (!botExpiration) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Bot Not Found')
                        .setDescription(`No bot named **${botName}** found in the invite tracking system.\n\nMake sure the bot was created using invites.`)
                    ]
                });
            }

            // Check if user owns the bot
            if (botExpiration.ownerId !== userId) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Permission Denied')
                        .setDescription(`You don't own the bot **${botName}**.\n\nOnly the bot owner can renew it.`)
                    ]
                });
            }

            // Check if bot is already expired
            const isExpired = inviteTracking.checkBotExpired(botName);
            const remainingDays = inviteTracking.getRemainingDays(botName);

            if (!isExpired && remainingDays > 0) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('⏰ Bot Still Active')
                        .setDescription(`Your bot **${botName}** still has **${remainingDays} days** remaining.\n\nYou can renew it when it expires.`)
                    ]
                });
            }

            // Check user's available invites
            const userStats = inviteTracking.getUserInviteStats(userId);
            
            if (userStats.available < requiredInvites) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Not Enough New Invites')
                        .setDescription(`You need **${requiredInvites}** new invites to renew but only have **${userStats.available}** available.\n\n📌 **Important:**\n• You can only use invites from people who were NOT previously invited by you\n• The same person cannot be invited twice\n• You must invite brand new members to the server`)
                        .addFields(
                            { name: 'Your Invite Stats', value: `Total: ${userStats.total}\nUsed: ${userStats.used}\nAvailable: ${userStats.available}` }
                        )
                    ]
                });
            }

            // Show renewal confirmation
            const confirmEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Renewal Available')
                .setDescription(`Your bot **${botName}** can be renewed!\n\n**Requirements:** ${requiredInvites} new invites from people not previously invited by you`)
                .addFields(
                    { name: 'Current Status', value: `${isExpired ? '🔴 Expired' : '🟡 Expiring soon'}`, inline: true },
                    { name: 'Extension', value: '+7 days', inline: true },
                    { name: 'Your Available Invites', value: `${userStats.available}/${requiredInvites}`, inline: true }
                );

            // Attempt renewal
            const renewResult = inviteTracking.renewBotHosting(userId, botName, requiredInvites);

            if (renewResult.success) {
                const successEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('✅ Bot Renewed Successfully!')
                    .setDescription(`Your bot **${botName}** has been renewed!`)
                    .addFields(
                        { name: 'Bot Name', value: botName, inline: true },
                        { name: 'Extension', value: `+${renewResult.daysAdded} days`, inline: true },
                        { name: 'New Expiration', value: `<t:${Math.floor(renewResult.newExpiresAt / 1000)}:R>`, inline: true }
                    )
                    .setFooter({ text: 'Use /botexpiration to check remaining time' });

                await message.reply({ embeds: [successEmbed] });

                // Update bot info with new expiration
                if (client.bots && client.bots.has(botName)) {
                    const botInfo = client.bots.get(botName);
                    botInfo.expiresAt = renewResult.newExpiresAt;
                    botInfo.remainingDays = inviteTracking.getRemainingDays(botName);
                    botInfo.renewed = true;
                    botInfo.lastRenewal = Date.now();
                    client.bots.set(botName, botInfo);
                }

                // Send DM notification
                try {
                    await message.author.send({
                        embeds: [new EmbedBuilder()
                            .setColor('#57F287')
                            .setTitle('🎉 Bot Renewal Successful')
                            .setDescription(`Your **${botName}** bot has been renewed for 7 more days!`)
                            .addFields(
                                { name: 'New Expiration', value: `<t:${Math.floor(renewResult.newExpiresAt / 1000)}:R>` }
                            )
                        ]
                    }).catch(() => {});
                } catch (e) {
                    console.error('[Renew] Could not send DM:', e.message);
                }

            } else {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Renewal Failed')
                        .setDescription(`Could not renew your bot: **${renewResult.message}**`)
                    ]
                });
            }

        } catch (error) {
            console.error('[Renew Command] Error:', error);
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Error')
                    .setDescription(`An error occurred while renewing your bot.\n\n**Error:** ${error.message}`)
                ]
            });
        }
    }
};
