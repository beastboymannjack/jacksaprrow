const { EmbedBuilder } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");

function hasAdminRole(member) {
    const adminRoles = [
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return adminRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("ADMINISTRATOR");
}

module.exports = {
    name: "settings",
    description: "Configure staff management settings",
    usage: "settings <setting> <value>",
    aliases: ["config", "set"],

    run: async (client, message, args) => {
        if (!hasAdminRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only administrators can modify settings.")
                ]
            });
        }

        client.serversettings.ensure(message.guild.id, {
            'strike-threshold': 3,
            'timeout-duration': 604800000,
            'auto-ban-strikes': 5,
            'ai-suggestions': true,
            'ai-sensitivity': 'medium',
            'loa-auto-restore': true,
            'loa-reminder-days': 1
        });

        const setting = args[0]?.toLowerCase();
        const value = args[1];

        if (!setting) {
            const current = client.serversettings.get(message.guild.id);
            
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.color)
                    .setTitle("⚙️ Server Settings")
                    .setDescription("Configure your staff management system.\n\n**Usage:** `settings <setting> <value>`")
                    .addFields({ name: "⚡ Strike Settings", value: `\`strike-threshold\` - Strikes before timeout (${current['strike-threshold']})\n` +
                        `\`timeout-duration\` - Timeout length (${formatDuration(current['timeout-duration'])})\n` +
                        `\`auto-ban-strikes\` - Strikes before ban (${current['auto-ban-strikes']})`, inline: false })
                    .addFields({ name: "🤖 AI Settings", value: `\`ai-suggestions\` - Enable AI suggestions (${current['ai-suggestions']})\n` +
                        `\`ai-sensitivity\` - AI sensitivity level (${current['ai-sensitivity']})`, inline: false })
                    .addFields({ name: "🌴 LOA Settings", value: `\`loa-auto-restore\` - Auto-restore roles (${current['loa-auto-restore']})\n` +
                        `\`loa-reminder-days\` - Days before reminder (${current['loa-reminder-days']})`, inline: false })
                    .addFields({ name: "💡 Example", value: "`settings strike-threshold 5`\n`settings ai-suggestions true`" })
                    .setFooter({ text: "Staff Management System" })
                ]
            });
        }

        if (!value) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing Value")
                    .setDescription(`Please provide a value for \`${setting}\`.\n\n**Usage:** \`settings ${setting} <value>\``)
                ]
            });
        }

        const validSettings = {
            'strike-threshold': { type: 'number', min: 1, max: 10 },
            'timeout-duration': { type: 'duration', options: ['1h', '6h', '12h', '1d', '3d', '7d', '14d', '28d'] },
            'auto-ban-strikes': { type: 'number', min: 2, max: 20 },
            'ai-suggestions': { type: 'boolean' },
            'ai-sensitivity': { type: 'option', options: ['low', 'medium', 'high'] },
            'loa-auto-restore': { type: 'boolean' },
            'loa-reminder-days': { type: 'number', min: 0, max: 7 }
        };

        if (!validSettings[setting]) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Invalid Setting")
                    .setDescription(`\`${setting}\` is not a valid setting.\n\nUse \`settings\` to see all available settings.`)
                ]
            });
        }

        const config = validSettings[setting];
        let parsedValue;

        switch (config.type) {
            case 'number':
                parsedValue = parseInt(value);
                if (isNaN(parsedValue) || parsedValue < config.min || parsedValue > config.max) {
                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("❌ Invalid Value")
                            .setDescription(`Value must be a number between ${config.min} and ${config.max}.`)
                        ]
                    });
                }
                break;

            case 'boolean':
                if (!['true', 'false', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase())) {
                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("❌ Invalid Value")
                            .setDescription("Value must be `true` or `false`.")
                        ]
                    });
                }
                parsedValue = ['true', 'yes', 'on'].includes(value.toLowerCase());
                break;

            case 'option':
                if (!config.options.includes(value.toLowerCase())) {
                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("❌ Invalid Value")
                            .setDescription(`Value must be one of: ${config.options.join(', ')}`)
                        ]
                    });
                }
                parsedValue = value.toLowerCase();
                break;

            case 'duration':
                const durations = {
                    '1h': 3600000,
                    '6h': 21600000,
                    '12h': 43200000,
                    '1d': 86400000,
                    '3d': 259200000,
                    '7d': 604800000,
                    '14d': 1209600000,
                    '28d': 2419200000
                };
                if (!durations[value.toLowerCase()]) {
                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("❌ Invalid Value")
                            .setDescription(`Duration must be one of: ${config.options.join(', ')}`)
                        ]
                    });
                }
                parsedValue = durations[value.toLowerCase()];
                break;
        }

        const oldValue = client.serversettings.get(message.guild.id, setting);
        client.serversettings.set(message.guild.id, parsedValue, setting);

        const displayValue = config.type === 'duration' ? value.toLowerCase() : parsedValue;
        const displayOld = config.type === 'duration' ? formatDuration(oldValue) : oldValue;

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("✅ Setting Updated")
                .addFields({ name: "Setting", value: `\`${setting}\``, inline: true })
                .addFields({ name: "Old Value", value: `${displayOld}`, inline: true })
                .addFields({ name: "New Value", value: `${displayValue}`, inline: true })
                .setFooter({ text: "Staff Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp()
            ]
        });
    }
};

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}
