const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mainconfig = require('../../mainconfig.js');

module.exports = (client) => {
    // Store sticky messages config per guild
    const stickyConfig = new Map();

    // Handle member join - send sticky message
    client.on('guildMemberAdd', async (member) => {
        try {
            const config = stickyConfig.get(member.guild.id) || {};
            
            if (!config.enabled || !config.channelId) {
                return;
            }

            const channel = member.guild.channels.cache.get(config.channelId) || 
                           await member.guild.channels.fetch(config.channelId).catch(() => null);
            
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`👋 Welcome ${member.user.username}!`)
                .setDescription(config.message || `Welcome to **${member.guild.name}**! Please read the rules and verify to access more channels.`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'This message will auto-delete in 2 seconds' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('sticky_verify')
                    .setLabel('✅ I Read the Rules')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('sticky_support')
                    .setLabel('❓ Need Help?')
                    .setStyle(ButtonStyle.Secondary)
            );

            const sentMessage = await channel.send({
                content: `<@${member.id}>`,
                embeds: [embed],
                components: [row]
            }).catch(() => null);

            // Auto-delete after 2 seconds
            if (sentMessage) {
                setTimeout(() => {
                    sentMessage.delete().catch(() => {});
                }, 2000);
            }
        } catch (e) {
            console.error('[StickyMessages] Error:', e.message);
        }
    });

    // Handle button interactions from sticky messages
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'sticky_verify') {
            const verifyRole = mainconfig.MemberRoleID || mainconfig.ServerRoles?.MemberRoleId;
            
            if (!verifyRole) {
                return interaction.reply({
                    content: '❌ Verification is not configured.',
                    ephemeral: true
                });
            }

            try {
                if (!interaction.member.roles.cache.has(verifyRole)) {
                    await interaction.member.roles.add(verifyRole);
                }
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('✅ Verified!')
                        .setDescription('You have been verified and can now access all channels.')
                        .setTimestamp()
                    ],
                    ephemeral: true
                });
            } catch (e) {
                await interaction.reply({
                    content: '❌ Could not verify you. Contact an admin.',
                    ephemeral: true
                });
            }
        } else if (interaction.customId === 'sticky_support') {
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('❓ Need Help?')
                    .setDescription('Please create a support ticket or contact staff for assistance.')
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    });

    // Command: setup sticky messages
    return {
        setupSticky: async (guild, channelId, message) => {
            stickyConfig.set(guild.id, {
                enabled: true,
                channelId: channelId,
                message: message
            });
        },
        disableSticky: (guildId) => {
            stickyConfig.delete(guildId);
        }
    };
};
