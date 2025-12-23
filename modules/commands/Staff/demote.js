const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const PromotionService = require('../../staff/promotionService.js');
const { STAFF_RANKS } = require('../../constants/staff.js');

module.exports = {
    name: "demote",
    description: "📉 Demote a staff member to the previous rank",
    usage: "demote <@user> [reason]",
    aliases: ["rankdown", "derank"],

    run: async (client, message, args) => {
        const promotionService = new PromotionService(client);
        
        if (!promotionService.hasLeadPermission(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied!")
                    .setDescription("**Oops!** Only **Lead+ staff** can demote team members!\n\nIf you have concerns, please speak with a manager. 💬")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const targetUser = message.mentions.users.first();

        if (!targetUser) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing User!")
                    .setDescription("Please mention a user to demote!\n\n**Usage:** `demote @user [reason]`\n**Example:** `demote @John Performance improvement needed`")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        if (targetUser.bot) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Cannot Demote Bots!")
                    .setDescription("Bots don't have staff ranks! 🤖")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        if (targetUser.id === message.author.id) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Cannot Demote Yourself!")
                    .setDescription("You cannot demote yourself. Please ask another staff member if needed.")
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const reason = args.filter(a => !a.startsWith('<@')).join(' ') || 'Administrative decision';

        const currentRank = promotionService.getRank(targetUser.id);
        const rankKeys = Object.keys(STAFF_RANKS);
        const currentIndex = rankKeys.indexOf(currentRank.key);

        if (currentIndex === 0) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#95A5A6")
                    .setTitle("🌱 Already at Minimum Rank")
                    .setDescription(`**${targetUser.tag}** is already at the lowest rank!\n\n${currentRank.emoji} **${currentRank.name}** - The starting point for everyone.`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        const previousRankKey = rankKeys[currentIndex - 1];
        const previousRank = STAFF_RANKS[previousRankKey];

        const confirmEmbed = new EmbedBuilder()
            .setColor("#FEE75C")
            .setTitle("⚠️ Confirm Demotion")
            .setDescription(`Are you sure you want to demote **${targetUser.tag}**?\n\n*This action will be logged and the user will be notified.*`)
            .addFields({ name: "📉 Rank Change", value: `${currentRank.emoji} **${currentRank.name}** → ${previousRank.emoji} **${previousRank.name}**`, inline: false })
            .addFields({ name: "📝 Reason", value: reason, inline: false })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Click Demote to confirm • Expires in 30 seconds" });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_demote')
                    .setLabel('📉 Demote')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_demote')
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
            if (interaction.customId === 'cancel_demote') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("✅ Demotion Cancelled")
                    .setDescription("The demotion has been cancelled. No changes were made.")
                    .setFooter({ text: "Staff Management System" });

                return interaction.update({ embeds: [cancelEmbed], components: [] });
            }

            const result = await promotionService.demoteUser(
                targetUser.id, 
                message.author.id, 
                reason, 
                message.guild
            );

            if (!result.success) {
                const errorEmbed = new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Demotion Failed!")
                    .setDescription(result.error)
                    .setFooter({ text: "Staff Management System" });

                return interaction.update({ embeds: [errorEmbed], components: [] });
            }

            promotionService.logActivity(targetUser.id, 'DEMOTION', {
                from: result.oldRankKey,
                to: result.newRankKey,
                by: message.author.id,
                reason
            });

            const demotionEmbed = promotionService.generateDemotionEmbed(targetUser, result, message.author.id, reason);
            await interaction.update({ embeds: [demotionEmbed], components: [] });

            const dmEmbed = promotionService.generateDemotionDM(targetUser, result, message.guild.name, reason);
            const dmResult = await promotionService.sendDMNotification(targetUser, dmEmbed);

            if (!dmResult.success) {
                await message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor("#FEE75C")
                        .setDescription(`⚠️ Could not DM ${targetUser.tag} about the rank change (DMs may be disabled)`)
                    ]
                });
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor("#95A5A6")
                    .setTitle("⏱️ Demotion Timed Out")
                    .setDescription("The demotion request has expired. No changes were made.")
                    .setFooter({ text: "Staff Management System" });

                confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    }
};
