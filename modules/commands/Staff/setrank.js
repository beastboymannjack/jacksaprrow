const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const PromotionService = require('../../staff/promotionService.js');
const { STAFF_RANKS, CELEBRATION_EMOJIS } = require('../../constants/staff.js');

module.exports = {
    name: "setrank",
    description: "⚙️ Set a staff member to a specific rank (Admin only)",
    usage: "setrank <@user> <rank> [reason]",
    aliases: ["setrole", "assignrank", "forcerank"],

    run: async (client, message, args) => {
        const promotionService = new PromotionService(client);
        
        if (!promotionService.hasAdminPermission(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied!")
                    .setDescription("**Oops!** Only **Administrators** can directly set ranks!\n\nUse `promote` or `demote` for normal rank changes. 💬")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        if (!args[0]) {
            let ranksDescription = '';
            for (const [key, rank] of Object.entries(STAFF_RANKS)) {
                ranksDescription += `${rank.emoji} **${rank.name}** (\`${key}\`)\n`;
                ranksDescription += `└ Level ${rank.level} • ${rank.xpRequired.toLocaleString()} XP required\n`;
            }

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("⚙️ Set Rank Command")
                    .setDescription("Set any staff member to a specific rank!\n\n**Usage:** `setrank @user <rank> [reason]`")
                    .addFields({ name: "📋 Available Ranks", value: ranksDescription, inline: false })
                    .addFields({ name: "💡 Examples", value: "`setrank @John SENIOR Great performance!`\n" +
                        "`setrank @Jane LEAD Promotion from interview`\n" +
                        "`setrank @Bob TRAINEE Rank reset`", inline: false })
                    .setFooter({ text: "Staff Management System • Admin Only Command" })
                    .setTimestamp()
                ]
            });
        }

        const targetUser = message.mentions.users.first();

        if (!targetUser) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing User!")
                    .setDescription("Please mention a user to set their rank!\n\n**Usage:** `setrank @user <rank> [reason]`")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        if (targetUser.bot) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Cannot Set Rank for Bots!")
                    .setDescription("Bots don't participate in the staff ranking system! 🤖")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const rankArg = args.find(a => !a.startsWith('<@') && STAFF_RANKS[a.toUpperCase()]);
        
        if (!rankArg) {
            const availableRanks = Object.keys(STAFF_RANKS).join(', ');
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Rank!")
                    .setDescription(`Please provide a valid rank!\n\n**Available Ranks:** \`${availableRanks}\`\n\n**Usage:** \`setrank @user <rank> [reason]\``)
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const targetRankKey = rankArg.toUpperCase();
        const targetRank = STAFF_RANKS[targetRankKey];
        const currentRank = promotionService.getRank(targetUser.id);
        const reason = args.filter(a => !a.startsWith('<@') && a.toUpperCase() !== targetRankKey).join(' ') || 'Administrative rank assignment';

        if (currentRank.key === targetRankKey) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("⚠️ Same Rank!")
                    .setDescription(`**${targetUser.tag}** is already at **${targetRank.emoji} ${targetRank.name}**!`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const isPromotion = targetRank.level > currentRank.level;
        const levelDifference = Math.abs(targetRank.level - currentRank.level);

        const confirmEmbed = new EmbedBuilder()
            .setColor(isPromotion ? "#57F287" : "#FEE75C")
            .setTitle(`${isPromotion ? '⬆️' : '⬇️'} Confirm Rank Change`)
            .setDescription(`Are you sure you want to set **${targetUser.tag}**'s rank?\n\n*This is a ${levelDifference > 1 ? `**${levelDifference}-level** ` : ''}${isPromotion ? 'promotion' : 'demotion'}!*`)
            .addFields({ name: "📊 Rank Change", value: `${currentRank.emoji} **${currentRank.name}** (Level ${currentRank.level})\n` +
                `${isPromotion ? '⬇️' : '⬆️'}\n` +
                `${targetRank.emoji} **${targetRank.name}** (Level ${targetRank.level})`, inline: false })
            .addFields({ name: "📝 Reason", value: reason, inline: false })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Click Confirm to proceed • Expires in 30 seconds" });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_setrank')
                    .setLabel('✅ Confirm')
                    .setStyle(isPromotion ? 'SUCCESS' : 'PRIMARY'),
                new ButtonBuilder()
                    .setCustomId('cancel_setrank')
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
            if (interaction.customId === 'cancel_setrank') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor("#95A5A6")
                    .setTitle("❌ Rank Change Cancelled")
                    .setDescription("The rank change has been cancelled. No modifications were made.")
                    .setFooter({ text: "Staff Management System" });

                return interaction.update({ embeds: [cancelEmbed], components: [] });
            }

            const result = await promotionService.setRank(
                targetUser.id, 
                targetRankKey, 
                message.author.id, 
                reason, 
                message.guild
            );

            if (!result.success) {
                const errorEmbed = new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Rank Change Failed!")
                    .setDescription(result.error)
                    .setFooter({ text: "Staff Management System" });

                return interaction.update({ embeds: [errorEmbed], components: [] });
            }

            promotionService.logActivity(targetUser.id, result.isPromotion ? 'PROMOTION' : 'DEMOTION', {
                from: result.oldRankKey,
                to: result.newRankKey,
                by: message.author.id,
                reason,
                method: 'SETRANK'
            });

            const celebration = result.isPromotion ? CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)] : '📋';

            const resultEmbed = new EmbedBuilder()
                .setColor(result.newRank.color)
                .setTitle(`${celebration} Rank Updated Successfully! ${celebration}`)
                .setDescription(result.isPromotion ? 
                    `**${targetUser.tag}** has been promoted!` : 
                    `**${targetUser.tag}**'s rank has been updated.`)
                .addFields({ name: "📊 Rank Change", value: `${result.oldRank.emoji} **${result.oldRank.name}** → ${result.newRank.emoji} **${result.newRank.name}**`, inline: false })
                .addFields({ name: "✨ Current Perks", value: result.newRank.perks.map(p => `• ${p}`).join('\n'), inline: false })
                .addFields({ name: "📝 Reason", value: reason, inline: false })
                .addFields({ name: "👤 Set By", value: `<@${message.author.id}>`, inline: true })
                .addFields({ name: "📅 Date", value: moment().format('MMM Do, YYYY'), inline: true })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setFooter({ text: "Staff Management System • Admin Action" })
                .setTimestamp();

            await interaction.update({ embeds: [resultEmbed], components: [] });

            const dmEmbed = result.isPromotion ?
                promotionService.generatePromotionDM(targetUser, result, message.guild.name) :
                promotionService.generateDemotionDM(targetUser, result, message.guild.name, reason);

            const dmResult = await promotionService.sendDMNotification(targetUser, dmEmbed);

            if (!dmResult.success) {
                await message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#FEE75C")
                        .setDescription(`⚠️ Could not DM ${targetUser.tag} about the rank change (DMs may be disabled)`)
                    ]
                });
            }

            if (result.isPromotion) {
                try {
                    await message.channel.send(`${celebration} Congratulations <@${targetUser.id}> on your new rank! ${celebration}`);
                } catch (e) {}
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor("#95A5A6")
                    .setTitle("⏱️ Request Timed Out")
                    .setDescription("The rank change request has expired.")
                    .setFooter({ text: "Staff Management System" });

                confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    }
};
