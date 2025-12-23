const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const raidDetection = new Map();

module.exports = {
    name: "antiraid",
    description: "Configure anti-raid protection settings",
    usage: "antiraid <on|off|settings|status>",
    aliases: ["raid", "raidprotection"],

    run: async (client, message, args) => {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only administrators can configure anti-raid settings.")
                ]
            });
        }

        const subcommand = args[0]?.toLowerCase();
        const settingsKey = `${message.guild.id}-antiraid`;

        client.serversettings.ensure(settingsKey, {
            enabled: false,
            joinThreshold: 10,
            joinTimeframe: 10,
            action: 'kick',
            alertChannel: null,
            newAccountAge: 7
        });

        const settings = client.serversettings.get(settingsKey);

        if (!subcommand || subcommand === 'status') {
            const embed = new EmbedBuilder()
                .setColor(settings.enabled ? "#57F287" : "#ED4245")
                .setTitle("🛡️ Anti-Raid Protection")
                .setDescription(settings.enabled ? "**Status: ACTIVE** ✅" : "**Status: DISABLED** ❌")
                .addFields({ name: "📊 Current Settings", value: [
                    `**Join Threshold:** ${settings.joinThreshold} members`,
                    `**Timeframe:** ${settings.joinTimeframe} seconds`,
                    `**Action:** ${settings.action.toUpperCase()}`,
                    `**New Account Filter:** ${settings.newAccountAge} days`,
                    `**Alert Channel:** ${settings.alertChannel ? `<#${settings.alertChannel}>` : 'Not set'}`
                ].join('\n') })
                .addFields({ name: "📋 Commands", value: [
                    "`antiraid on` - Enable protection",
                    "`antiraid off` - Disable protection",
                    "`antiraid settings` - Configure settings"
                ].join('\n') })
                .setFooter({ text: "Staff Management System" })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        if (subcommand === 'on' || subcommand === 'enable') {
            settings.enabled = true;
            client.serversettings.set(settingsKey, settings);

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("🛡️ Anti-Raid Enabled")
                    .setDescription("Protection is now active. The bot will monitor for suspicious join patterns.")
                    .addFields({ name: "⚙️ Current Trigger", value: `${settings.joinThreshold} joins in ${settings.joinTimeframe} seconds` })
                ]
            });
        }

        if (subcommand === 'off' || subcommand === 'disable') {
            settings.enabled = false;
            client.serversettings.set(settingsKey, settings);

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("🛡️ Anti-Raid Disabled")
                    .setDescription("Protection has been turned off.")
                ]
            });
        }

        if (subcommand === 'settings' || subcommand === 'config') {
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('antiraid_setting')
                        .setPlaceholder('Select a setting to change')
                        .addOptions([
                            {
                                label: 'Join Threshold',
                                description: `Currently: ${settings.joinThreshold} members`,
                                value: 'threshold'
                            },
                            {
                                label: 'Timeframe',
                                description: `Currently: ${settings.joinTimeframe} seconds`,
                                value: 'timeframe'
                            },
                            {
                                label: 'Action',
                                description: `Currently: ${settings.action}`,
                                value: 'action'
                            },
                            {
                                label: 'New Account Age',
                                description: `Currently: ${settings.newAccountAge} days`,
                                value: 'accountage'
                            },
                            {
                                label: 'Alert Channel',
                                description: 'Set where raid alerts are sent',
                                value: 'alertchannel'
                            }
                        ])
                );

            const settingsMsg = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("⚙️ Anti-Raid Settings")
                    .setDescription("Select a setting to modify:")
                ],
                components: [row]
            });

            const collector = settingsMsg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000
            });

            collector.on('collect', async (interaction) => {
                const setting = interaction.values[0];
                
                await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor("#FEE75C")
                        .setTitle(`⚙️ Set ${setting}`)
                        .setDescription(getSettingPrompt(setting))
                    ],
                    components: []
                });

                const msgCollector = message.channel.createMessageCollector({
                    filter: m => m.author.id === message.author.id,
                    time: 30000,
                    max: 1
                });

                msgCollector.on('collect', async (msg) => {
                    const value = msg.content;
                    let success = false;

                    if (setting === 'threshold') {
                        const num = parseInt(value);
                        if (num >= 3 && num <= 50) {
                            settings.joinThreshold = num;
                            success = true;
                        }
                    } else if (setting === 'timeframe') {
                        const num = parseInt(value);
                        if (num >= 5 && num <= 60) {
                            settings.joinTimeframe = num;
                            success = true;
                        }
                    } else if (setting === 'action') {
                        const actions = ['kick', 'ban', 'timeout'];
                        if (actions.includes(value.toLowerCase())) {
                            settings.action = value.toLowerCase();
                            success = true;
                        }
                    } else if (setting === 'accountage') {
                        const num = parseInt(value);
                        if (num >= 0 && num <= 30) {
                            settings.newAccountAge = num;
                            success = true;
                        }
                    } else if (setting === 'alertchannel') {
                        const channel = msg.mentions.channels.first();
                        if (channel) {
                            settings.alertChannel = channel.id;
                            success = true;
                        }
                    }

                    if (success) {
                        client.serversettings.set(settingsKey, settings);
                        await msg.reply({
                            embeds: [new EmbedBuilder()
                                .setColor("#57F287")
                                .setTitle("✅ Setting Updated")
                                .setDescription(`${setting} has been updated successfully.`)
                            ]
                        });
                    } else {
                        await msg.reply({
                            embeds: [new EmbedBuilder()
                                .setColor("#ED4245")
                                .setTitle("❌ Invalid Value")
                                .setDescription("Please try again with a valid value.")
                            ]
                        });
                    }
                });
            });
        }
    }
};

function getSettingPrompt(setting) {
    const prompts = {
        threshold: "Enter the number of joins to trigger raid detection (3-50):",
        timeframe: "Enter the timeframe in seconds (5-60):",
        action: "Enter the action to take: `kick`, `ban`, or `timeout`:",
        accountage: "Enter minimum account age in days (0-30, 0 to disable):",
        alertchannel: "Mention the channel for raid alerts:"
    };
    return prompts[setting] || "Enter a value:";
}
