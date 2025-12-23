const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "lockdown",
    description: "Lock or unlock channels during emergencies",
    usage: "lockdown [channel] / lockdown end [channel]",
    aliases: ["lock", "unlock"],

    run: async (client, message, args) => {
        if (!message.member.permissions.has("ManageChannels")) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("You need `Manage Channels` permission to use this command.")
                ]
            });
        }

        const subcommand = args[0]?.toLowerCase();
        const targetChannel = message.mentions.channels.first() || message.channel;

        if (subcommand === 'end' || subcommand === 'unlock') {
            try {
                await targetChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: null
                });

                const embed = new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("🔓 Lockdown Ended")
                    .setDescription(`${targetChannel} has been unlocked.`)
                    .addFields({ name: "👤 Unlocked By", value: `${message.author.tag}`, inline: true })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
                
                if (targetChannel.id !== message.channel.id) {
                    await targetChannel.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("🔓 Channel Unlocked")
                            .setDescription("This channel is no longer in lockdown. You may resume normal activity.")
                        ]
                    });
                }
            } catch (error) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Error")
                        .setDescription("Could not unlock the channel. Check bot permissions.")
                    ]
                });
            }
        } else if (subcommand === 'server' || subcommand === 'all') {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('lockdown_confirm')
                        .setLabel('Confirm Server Lockdown')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('lockdown_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            const confirmMsg = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("⚠️ Server Lockdown Confirmation")
                    .setDescription("This will lock ALL text channels in the server. Are you sure?")
                ],
                components: [row]
            });

            const collector = confirmMsg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'lockdown_confirm') {
                    await interaction.update({
                        embeds: [new EmbedBuilder()
                            .setColor("#FEE75C")
                            .setTitle("🔒 Locking Server...")
                            .setDescription("Please wait...")
                        ],
                        components: []
                    });

                    let locked = 0;
                    for (const [, channel] of message.guild.channels.cache) {
                        if (channel.isText() && channel.permissionsFor(message.guild.me).has('ManageChannels')) {
                            try {
                                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                                    SendMessages: false
                                });
                                locked++;
                            } catch (e) {}
                        }
                    }

                    await confirmMsg.edit({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("🔒 SERVER LOCKDOWN ACTIVE")
                            .setDescription(`${locked} channels have been locked.`)
                            .addFields({ name: "👤 Locked By", value: message.author.tag, inline: true })
                            .addFields({ name: "📋 To Unlock", value: "`lockdown end` in each channel\nor wait for admin to unlock", inline: true })
                            .setTimestamp()
                        ]
                    });
                } else {
                    await interaction.update({
                        embeds: [new EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("✅ Cancelled")
                            .setDescription("Server lockdown was cancelled.")
                        ],
                        components: []
                    });
                }
            });
        } else {
            try {
                await targetChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });

                const embed = new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("🔒 Channel Locked")
                    .setDescription(`${targetChannel} is now in lockdown.`)
                    .addFields({ name: "👤 Locked By", value: `${message.author.tag}`, inline: true })
                    .addFields({ name: "📋 To Unlock", value: "`lockdown end`", inline: true })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

                if (targetChannel.id !== message.channel.id) {
                    await targetChannel.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("🔒 Channel Locked")
                            .setDescription("This channel has been locked by staff. Please wait for further instructions.")
                        ]
                    });
                }
            } catch (error) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Error")
                        .setDescription("Could not lock the channel. Check bot permissions.")
                    ]
                });
            }
        }
    }
};
