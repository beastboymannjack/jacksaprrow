const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, ButtonStyle, TextInputStyle } = require('discord.js');
const mainconfig = require("../../../mainconfig.js");
const fs = require('fs');
const path = require('path');

const BOT_CONFIG_FILE = path.join(__dirname, '../../..', 'data', 'ticketBotConfigs.json');

// Ensure data directory exists
function ensureConfigFile() {
    const dataDir = path.join(__dirname, '../../..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(BOT_CONFIG_FILE)) {
        fs.writeFileSync(BOT_CONFIG_FILE, JSON.stringify({}, null, 2));
    }
}

function readConfigs() {
    ensureConfigFile();
    try {
        return JSON.parse(fs.readFileSync(BOT_CONFIG_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeConfigs(data) {
    ensureConfigFile();
    fs.writeFileSync(BOT_CONFIG_FILE, JSON.stringify(data, null, 2));
}

function isBotCreator(member) {
    const botCreatorRoles = [
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return botCreatorRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("ADMINISTRATOR");
}

// Get all staff roles from mainconfig
function getAllStaffRoles() {
    return {
        "🛡️ Moderator": mainconfig.ServerRoles?.ModRoleId,
        "🎧 Chief Supporter": mainconfig.ServerRoles?.ChiefSupporterRoleId,
        "🎧 Supporter": mainconfig.ServerRoles?.SupporterRoleId,
        "🎧 New Supporter": mainconfig.ServerRoles?.NewSupporterRoleId,
        "🤖 Chief Bot Creator": mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        "🤖 Bot Creator": mainconfig.ServerRoles?.BotCreatorRoleId,
        "👑 Founder": mainconfig.ServerRoles?.FounderId,
        "⚙️ Admin": mainconfig.ServerRoles?.AdminRoleId,
        "💼 Chief HR": mainconfig.ServerRoles?.ChiefHumanResources,
        "💼 HR": mainconfig.ServerRoles?.HumanResources
    };
}

module.exports = {
    name: "botmanagement",
    description: "Manage ticket bot configurations and view staff roles",
    usage: "botmanagement",
    aliases: ["botmgmt", "botconfig"],

    run: async (client, message, args) => {
        if (!isBotCreator(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only Bot Creators and above can access bot management.")
                ]
            });
        }

        const configs = readConfigs();
        const guildConfig = configs[message.guild.id] || { categoryId: null, logChannelId: null, supportRoleId: null };

        // Get staff roles from mainconfig
        const staffRolesMap = getAllStaffRoles();
        const staffRolesDisplay = Object.entries(staffRolesMap)
            .filter(([_, roleId]) => roleId)
            .map(([name, roleId]) => `${name}: <@&${roleId}>`)
            .join('\n');

        const mainEmbed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("🤖 Bot Management Dashboard")
            .setDescription("Configure ticket bot settings - Staff roles are pulled from mainconfig.js")
            .addFields({
                name: "📋 Ticket Bot Configuration",
                value: `**Category:** ${guildConfig.categoryId ? `<#${guildConfig.categoryId}>` : '❌ Not Set'}\n**Log Channel:** ${guildConfig.logChannelId ? `<#${guildConfig.logChannelId}>` : '❌ Not Set'}\n**Support Role:** ${guildConfig.supportRoleId ? `<@&${guildConfig.supportRoleId}>` : '❌ Not Set'}`,
                inline: false
            })
            .addFields({
                name: "👥 Configured Staff Roles (from mainconfig.js)",
                value: staffRolesDisplay || 'No staff roles configured',
                inline: false
            })
            .setFooter({ text: "Click buttons below to manage ticket bot IDs" })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('botmgmt_setup_ids')
                    .setLabel('Setup Bot IDs')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('botmgmt_view_config')
                    .setLabel('View Full Config')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('botmgmt_staff_info')
                    .setLabel('Staff Roles')
                    .setEmoji('👥')
                    .setStyle(ButtonStyle.Secondary)
            );

        const dashboardMsg = await message.reply({ embeds: [mainEmbed], components: [row] });

        const collector = dashboardMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 600000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'botmgmt_setup_ids') {
                const modal = new ModalBuilder()
                    .setCustomId('botmgmt_setup_modal')
                    .setTitle('Setup Ticket Bot IDs');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('category_id')
                            .setLabel('Category Channel ID')
                            .setStyle(TextInputStyle.Short)
                            .setValue(guildConfig.categoryId || '')
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('log_channel_id')
                            .setLabel('Log Channel ID')
                            .setStyle(TextInputStyle.Short)
                            .setValue(guildConfig.logChannelId || '')
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('support_role_id')
                            .setLabel('Support Role ID')
                            .setStyle(TextInputStyle.Short)
                            .setValue(guildConfig.supportRoleId || '')
                            .setRequired(true)
                    )
                );

                await interaction.showModal(modal);

                interaction.awaitModalSubmit({ time: 600000 })
                    .then(modalInteraction => {
                        const categoryId = modalInteraction.fields.getTextInputValue('category_id');
                        const logChannelId = modalInteraction.fields.getTextInputValue('log_channel_id');
                        const supportRoleId = modalInteraction.fields.getTextInputValue('support_role_id');

                        // Validate IDs exist
                        const category = message.guild.channels.cache.get(categoryId);
                        const logChannel = message.guild.channels.cache.get(logChannelId);
                        const role = message.guild.roles.cache.get(supportRoleId);

                        if (!category) {
                            return modalInteraction.reply({ content: '❌ Category channel not found!', ephemeral: true });
                        }
                        if (!logChannel) {
                            return modalInteraction.reply({ content: '❌ Log channel not found!', ephemeral: true });
                        }
                        if (!role) {
                            return modalInteraction.reply({ content: '❌ Support role not found!', ephemeral: true });
                        }

                        // Save config
                        const configs = readConfigs();
                        configs[message.guild.id] = {
                            ...configs[message.guild.id],
                            categoryId,
                            logChannelId,
                            supportRoleId,
                            updatedAt: new Date().toISOString(),
                            updatedBy: message.author.id
                        };
                        writeConfigs(configs);

                        modalInteraction.reply({
                            embeds: [new EmbedBuilder()
                                .setColor("#57F287")
                                .setTitle("✅ Ticket Bot IDs Saved")
                                .setDescription(`**Category:** <#${categoryId}>\n**Log Channel:** <#${logChannelId}>\n**Support Role:** <@&${supportRoleId}>`)
                            ],
                            ephemeral: true
                        });
                    })
                    .catch(() => {});
            }

            else if (interaction.customId === 'botmgmt_view_config') {
                const configs = readConfigs();
                const config = configs[message.guild.id] || guildConfig;

                await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle("📋 Full Configuration")
                        .addFields(
                            { name: "Ticket Bot IDs", value: `**Category:** ${config.categoryId || 'Not Set'}\n**Log Channel:** ${config.logChannelId || 'Not Set'}\n**Support Role:** ${config.supportRoleId || 'Not Set'}`, inline: false },
                            { name: "Last Updated", value: config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'Never', inline: false }
                        )
                    ],
                    components: [row]
                });
            }

            else if (interaction.customId === 'botmgmt_staff_info') {
                const staffRolesMap = getAllStaffRoles();
                let staffDetails = '';
                
                Object.entries(staffRolesMap).forEach(([name, roleId]) => {
                    if (roleId) {
                        staffDetails += `${name}: <@&${roleId}>\n`;
                    }
                });

                await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle("👥 Staff Roles from mainconfig.js")
                        .setDescription(staffDetails || 'No staff roles configured')
                        .addFields({
                            name: "📝 Manage Staff Roles",
                            value: "Edit roles in `mainconfig.js` using these environment variables:\n- MOD_ROLE_ID\n- SUPPORTER_ROLE_ID\n- BOT_CREATOR_ROLE_ID\n- CHIEF_BOT_CREATOR_ROLE_ID\n- FOUNDER_ROLE_ID\n- And more in ServerRoles object",
                            inline: false
                        })
                    ],
                    components: [row]
                });
            }
        });
    }
};
