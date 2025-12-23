const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const PromotionService = require('../../staff/promotionService.js');
const { STAFF_RANKS, CELEBRATION_EMOJIS } = require('../../constants/staff.js');

module.exports = {
    name: "promote",
    description: "🎉 Promote a staff member to the next rank with celebration!",
    usage: "promote <@user> [reason]",
    aliases: ["promo", "rankup", "levelup"],

    run: async (client, message, args) => {
        const promotionService = new PromotionService(client);
        
        if (!promotionService.hasLeadPermission(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied!")
                    .setDescription("**Oops!** Only **Lead+ staff** can promote team members!\n\nIf you believe someone deserves a promotion, let a manager know! 💬")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const targetUser = message.mentions.users.first();

        if (!targetUser) {
            const eligible = promotionService.getBulkEligibleForPromotion();
            
            let description = "**Usage:** `promote @user [reason]`\n\n";
            
            if (eligible.length > 0) {
                description += "🌟 **Staff Eligible for Promotion:**\n\n";
                for (const staff of eligible.slice(0, 5)) {
                    description += `${staff.currentRank.emoji} <@${staff.userId}>\n`;
                    description += `└ Ready for ${staff.nextRank.emoji} **${staff.nextRank.name}** (${staff.xpCurrent.toLocaleString()} XP)\n\n`;
                }
                if (eligible.length > 5) {
                    description += `*...and ${eligible.length - 5} more eligible staff members!*`;
                }
            } else {
                description += "*No staff members are currently eligible for automatic promotion.*";
            }

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("🎉 Promotion Command")
                    .setDescription(description)
                    .addFields({ name: "💡 Tip", value: "You can promote anyone regardless of XP requirements!\nThe eligibility list is just a suggestion.", inline: false })
                    .setFooter({ text: "Staff Management System" })
                    .setTimestamp()
                ]
            });
        }

        if (targetUser.bot) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Cannot Promote Bots!")
                    .setDescription("Nice try, but bots don't need promotions! 🤖")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const reason = args.filter(a => !a.startsWith('<@')).join(' ') || 'Outstanding performance!';

        const eligibility = promotionService.checkEligibility(targetUser.id);
        
        if (eligibility.isMaxRank) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FFD700")
                    .setTitle("👑 Already at Maximum Rank!")
                    .setDescription(`**${targetUser.tag}** is already at the highest rank!\n\n${eligibility.currentRank.emoji} **${eligibility.currentRank.name}** - The pinnacle of excellence! 🏆`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("🎉 Confirm Promotion")
            .setDescription(`Are you sure you want to promote **${targetUser.tag}**?`)
            .addFields({ name: "📈 Rank Change", value: `${eligibility.currentRank.emoji} **${eligibility.currentRank.name}** → ${eligibility.nextRank.emoji} **${eligibility.nextRank.name}**`, inline: false })
            .addFields({ name: "📝 Reason", value: reason, inline: false })
            .addFields({ name: "⚡ Current XP", value: `${eligibility.xpCurrent.toLocaleString()} / ${eligibility.xpRequired.toLocaleString()} required`, inline: true })
            .addFields({ name: "📅 Time in Rank", value: `${eligibility.daysInRank} days`, inline: true })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Click Promote to confirm • Expires in 30 seconds" });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_promote')
                    .setLabel('🎉 Promote!')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel_promote')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

        const collector = confirmMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000,
            max: 1
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'cancel_promote') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor("#95A5A6")
                    .setTitle("❌ Promotion Cancelled")
                    .setDescription("The promotion has been cancelled.")
                    .setFooter({ text: "Staff Management System" });

                return interaction.update({ embeds: [cancelEmbed], components: [] });
            }

            const result = await promotionService.promoteUser(
                targetUser.id, 
                message.author.id, 
                reason, 
                message.guild
            );

            if (!result.success) {
                const errorEmbed = new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Promotion Failed!")
                    .setDescription(result.error)
                    .setFooter({ text: "Staff Management System" });

                return interaction.update({ embeds: [errorEmbed], components: [] });
            }

            promotionService.logActivity(targetUser.id, 'PROMOTION', {
                from: result.oldRankKey,
                to: result.newRankKey,
                by: message.author.id,
                reason
            });

            const promotionEmbed = promotionService.generatePromotionEmbed(targetUser, result, message.author.id);
            await interaction.update({ embeds: [promotionEmbed], components: [] });

            const dmEmbed = promotionService.generatePromotionDM(targetUser, result, message.guild.name);
            const dmResult = await promotionService.sendDMNotification(targetUser, dmEmbed);

            if (!dmResult.success) {
                await message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#FEE75C")
                        .setDescription(`⚠️ Could not DM ${targetUser.tag} about their promotion (DMs may be disabled)`)
                    ]
                });
            }

            const celebration = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
            try {
                await message.channel.send(`${celebration} Congratulations <@${targetUser.id}>! ${celebration}`);
            } catch (e) {}
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor("#95A5A6")
                    .setTitle("⏱️ Promotion Timed Out")
                    .setDescription("The promotion request has expired.")
                    .setFooter({ text: "Staff Management System" });

                confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    }
};
