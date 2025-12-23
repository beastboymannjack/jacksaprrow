const { EmbedBuilder } = require('discord.js');
const inviteTracking = require('../../inviteTracking');
const mainconfig = require('../../../mainconfig');

module.exports = {
    name: "invitestats",
    aliases: ["invites", "myinvites", "invite-status"],
    category: "Utility",
    description: "Check your available invites for bot creation",
    usage: ",invitestats",
    run: async (client, message, args, cmduser, text, prefix) => {
        try {
            const userId = message.author.id;
            const userStats = inviteTracking.getUserInviteStats(userId);
            const requiredInvites = mainconfig.InviteRequirements.RequiredInvites || 5;

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📊 Your Invite Statistics')
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .addFields(
                    { name: '📈 Total Invites', value: `${userStats.total}`, inline: true },
                    { name: '✅ Used Invites', value: `${userStats.used}`, inline: true },
                    { name: '🔓 Available Invites', value: `${userStats.available}`, inline: true },
                    { name: 'Required Per Bot', value: `${requiredInvites} invites`, inline: true },
                    { name: 'Bots You Can Create', value: `${Math.floor(userStats.available / requiredInvites)}`, inline: true },
                    { name: 'Status', value: userStats.available >= requiredInvites ? '✅ Ready to create a bot!' : '❌ Not enough invites', inline: true }
                );

            if (userStats.available >= requiredInvites) {
                embed.setColor('#57F287');
                embed.addFields({
                    name: '💡 Next Step',
                    value: `You can create a bot now! Use \`${prefix}createbot new\` to get started.`
                });
            } else {
                const needed = requiredInvites - userStats.available;
                embed.setColor('#FF0000');
                embed.addFields({
                    name: '⚠️ Action Required',
                    value: `You need **${needed}** more invite${needed !== 1 ? 's' : ''} to create a bot.\n\n💡 **Tip:** Invite new members to the server who haven't been invited by you before.`
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[InviteStats Command] Error:', error);
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Error')
                    .setDescription(`An error occurred: ${error.message}`)
                ]
            });
        }
    }
};
