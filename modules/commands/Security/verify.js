const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: "verify",
    description: "Verification system for new members",
    usage: "verify setup / verify panel / verify @user",
    aliases: ["verification"],

    run: async (client, message, args) => {
        const subcommand = args[0]?.toLowerCase();
        const settingsKey = `${message.guild.id}-verify`;

        client.serversettings.ensure(settingsKey, {
            enabled: false,
            role: null,
            channel: null,
            message: "Click the button below to verify and gain access to the server!"
        });

        const settings = client.serversettings.get(settingsKey);

        if (subcommand === 'setup') {
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Permission Denied")
                        .setDescription("Only administrators can set up verification.")
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("⚙️ Verification Setup")
                .setDescription("Please mention the **verified role** that users should receive after verifying:")
                .setFooter({ text: "Reply within 60 seconds" });

            await message.reply({ embeds: [embed] });

            const roleCollector = message.channel.createMessageCollector({
                filter: m => m.author.id === message.author.id,
                time: 60000,
                max: 1
            });

            roleCollector.on('collect', async (roleMsg) => {
                const role = roleMsg.mentions.roles.first();
                if (!role) {
                    return roleMsg.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("❌ Invalid Role")
                            .setDescription("Please mention a valid role. Run the command again.")
                        ]
                    });
                }

                settings.role = role.id;

                await roleMsg.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle("⚙️ Verification Setup")
                        .setDescription(`Role set to ${role}. Now mention the **verification channel**:`)
                    ]
                });

                const channelCollector = message.channel.createMessageCollector({
                    filter: m => m.author.id === message.author.id,
                    time: 60000,
                    max: 1
                });

                channelCollector.on('collect', async (channelMsg) => {
                    const channel = channelMsg.mentions.channels.first();
                    if (!channel) {
                        return channelMsg.reply({
                            embeds: [new EmbedBuilder()
                                .setColor("#ED4245")
                                .setTitle("❌ Invalid Channel")
                                .setDescription("Please mention a valid channel. Run the command again.")
                            ]
                        });
                    }

                    settings.channel = channel.id;
                    settings.enabled = true;
                    client.serversettings.set(settingsKey, settings);

                    await channelMsg.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("✅ Verification Setup Complete")
                            .setDescription(`**Role:** ${role}\n**Channel:** ${channel}\n\nUse \`verify panel\` to send the verification panel!`)
                        ]
                    });
                });
            });

        } else if (subcommand === 'panel') {
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Permission Denied")
                        .setDescription("Only administrators can send the verification panel.")
                    ]
                });
            }

            if (!settings.role || !settings.channel) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Not Configured")
                        .setDescription("Please run `verify setup` first to configure verification.")
                    ]
                });
            }

            const channel = message.guild.channels.cache.get(settings.channel);
            if (!channel) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Channel Not Found")
                        .setDescription("The verification channel no longer exists. Run `verify setup` again.")
                    ]
                });
            }

            const panelEmbed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("✅ Verification Required")
                .setDescription(settings.message)
                .addFields({ name: "📋 Instructions", value: "Click the button below to verify your account and gain access to the server." })
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify_button')
                        .setLabel('Verify')
                        .setEmoji('✅')
                        .setStyle(ButtonStyle.Success)
                );

            await channel.send({ embeds: [panelEmbed], components: [row] });
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("✅ Panel Sent")
                    .setDescription(`Verification panel has been sent to ${channel}`)
                ]
            });

        } else if (message.mentions.users.first()) {
            if (!message.member.permissions.has("MANAGE_ROLES")) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Permission Denied")
                        .setDescription("You need `Manage Roles` permission to manually verify users.")
                    ]
                });
            }

            const targetUser = message.mentions.users.first();
            const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
            
            if (!member) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Member Not Found")
                        .setDescription("Could not find that member in the server.")
                    ]
                });
            }

            if (!settings.role) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Not Configured")
                        .setDescription("No verification role configured. Run `verify setup` first.")
                    ]
                });
            }

            try {
                await member.roles.add(settings.role);
                await message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("✅ User Verified")
                        .setDescription(`${targetUser.tag} has been manually verified.`)
                    ]
                });
            } catch (error) {
                await message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Error")
                        .setDescription("Could not add the verification role. Check bot permissions.")
                    ]
                });
            }

        } else {
            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("✅ Verification System")
                .setDescription(settings.enabled ? "**Status: Active**" : "**Status: Not configured**")
                .addFields({ name: "📋 Commands", value: [
                    "`verify setup` - Configure verification",
                    "`verify panel` - Send verification panel",
                    "`verify @user` - Manually verify a user"
                ].join('\n') });

            if (settings.role) {
                const role = message.guild.roles.cache.get(settings.role);
                embed.addFields({ name: "⚙️ Current Settings", value: `**Role:** ${role || 'Deleted'}\n**Channel:** ${settings.channel ? `<#${settings.channel}>` : 'Not set'}` });
            }

            return message.reply({ embeds: [embed] });
        }
    }
};
