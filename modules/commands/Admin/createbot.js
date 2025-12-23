const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require('discord.js');
const servicebotCatalog = require('../../servicebotCatalog');
const remoteBotClient = require('../../api/remoteBotClient');
const path = require('path');
const fs = require('fs');
const mainconfig = require('../../../mainconfig');

module.exports = {
    name: 'createbot',
    aliases: ['newbot', 'deploybot', 'hostbot'],
    description: 'Create and deploy a new Discord bot to the hosting server',
    usage: ',createbot',
    category: 'Admin',
    cooldown: 30,
    
    async execute(message, args, client) {
        const hasPermission = 
            message.member.permissions.has("Administrator") ||
            message.member.roles.cache.has(mainconfig.ServerRoles.BotCreatorRoleId) ||
            message.member.roles.cache.has(mainconfig.ServerRoles.FounderId) ||
            message.member.roles.cache.has(mainconfig.ServerRoles.ChiefBotCreatorRoleId) ||
            message.author.id === mainconfig.BotOwnerID;
            
        if (!hasPermission) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('You do not have permission to create bots.')
                ]
            });
        }
        
        let secondaryHealthy = false;
        let secondaryStatus = '🔴 Offline';
        try {
            if (remoteBotClient.isConfigured()) {
                secondaryHealthy = await remoteBotClient.checkHealth();
                secondaryStatus = secondaryHealthy ? '🟢 Online' : '🔴 Offline';
            } else {
                secondaryStatus = '⚠️ Not Configured';
            }
        } catch (e) {
            secondaryStatus = '🔴 Offline';
        }
        
        const templates = servicebotCatalog.getAllTemplates();
        
        const overviewEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤖 Bot Creation Wizard - Advanced')
            .setDescription('Create and deploy a custom Discord bot with full customization options.\n\n**Select a template below to begin:**')
            .addFields(
                {
                    name: '📊 System Status',
                    value: `Hosting Server: ${secondaryStatus}\nAvailable Templates: ${templates.length}`,
                    inline: true
                },
                {
                    name: '⚡ Advanced Features',
                    value: '• Custom status & embed colors\n• Footer text & avatar URL\n• Advanced configuration\n• Ticket bot IDs (optional)',
                    inline: true
                }
            );
        
        if (!secondaryHealthy) {
            overviewEmbed.addFields({
                name: '⚠️ Warning',
                value: 'Secondary hosting server is offline. Bot deployment may not work.',
                inline: false
            });
        }
        
        const templateEmbeds = templates.map((template, index) => {
            return new EmbedBuilder()
                .setColor(template.color || '#5865F2')
                .setTitle(`${template.emoji} ${template.name}`)
                .setDescription(template.description)
                .addFields(
                    {
                        name: '✨ Features',
                        value: template.features.slice(0, 5).map((f, i) => `${i + 1}. ${f}`).join('\n'),
                        inline: false
                    },
                    {
                        name: '📋 Requirements',
                        value: template.requirements.map(r => `• ${r}`).join('\n'),
                        inline: true
                    },
                    {
                        name: '⚙️ Settings',
                        value: `Config Fields: ${template.configFields?.length || 0}\nDefault Prefix: ${template.configFields?.find(f => f.key === 'PREFIX' || f.key === 'prefix')?.default || ','}`,
                        inline: true
                    }
                )
                .setFooter({ text: `Template ${index + 1}/${templates.length}` });
        });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('createbot_prefix_template')
            .setPlaceholder('Choose a bot template to create...')
            .addOptions(templates.map(t => ({
                label: t.name,
                description: t.description.substring(0, 100),
                value: t.id,
                emoji: t.emoji
            })));
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const dashboardButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Use Dashboard Instead')
                .setStyle(ButtonStyle.Link)
                .setURL(client.dashboardURL ? `${client.dashboardURL}/createbot` : 'https://example.com/createbot')
                .setEmoji('🌐')
        );
        
        const allEmbeds = [overviewEmbed, ...templateEmbeds].slice(0, 10);
        
        const sentMessage = await message.reply({
            embeds: allEmbeds,
            components: [row, dashboardButton]
        });
        
        const collector = sentMessage.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000,
            filter: i => i.user.id === message.author.id
        });
        
        collector.on('collect', async (interaction) => {
            const templateId = interaction.values[0];
            const template = servicebotCatalog.getTemplate(templateId);
            
            if (!template) {
                return interaction.reply({
                    content: 'Template not found. Please try again.',
                    ephemeral: true
                });
            }
            
            // Basic Info Modal
            const basicModal = new ModalBuilder()
                .setCustomId(`createbot_basic_${templateId}`)
                .setTitle(`${template.name} - Basic Setup`);
            
            const nameInput = new TextInputBuilder()
                .setCustomId('bot_name')
                .setLabel('Bot Name (letters, numbers, hyphens only)')
                .setPlaceholder('my-awesome-bot')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(32);
            
            const tokenInput = new TextInputBuilder()
                .setCustomId('bot_token')
                .setLabel('Discord Bot Token')
                .setPlaceholder('Paste your bot token from Discord Developer Portal')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const clientIdInput = new TextInputBuilder()
                .setCustomId('client_id')
                .setLabel('Client ID (Application ID)')
                .setPlaceholder('Your bot\'s Application ID from Developer Portal')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const ownerIdInput = new TextInputBuilder()
                .setCustomId('owner_id')
                .setLabel('Owner Discord ID')
                .setPlaceholder(message.author.id)
                .setValue(message.author.id)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const prefixInput = new TextInputBuilder()
                .setCustomId('prefix')
                .setLabel('Command Prefix')
                .setPlaceholder(',')
                .setValue(',')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(5);
            
            basicModal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(tokenInput),
                new ActionRowBuilder().addComponents(clientIdInput),
                new ActionRowBuilder().addComponents(ownerIdInput),
                new ActionRowBuilder().addComponents(prefixInput)
            );
            
            await interaction.showModal(basicModal);
            
            // Wait for modal submission
            const modalCollector = interaction.awaitModalSubmit({ time: 900000, filter: i => i.customId === `createbot_basic_${templateId}` });
            
            modalCollector.then(async (modalSubmit) => {
                const basicData = {
                    botName: modalSubmit.fields.getTextInputValue('bot_name'),
                    botToken: modalSubmit.fields.getTextInputValue('bot_token'),
                    clientId: modalSubmit.fields.getTextInputValue('client_id'),
                    ownerId: modalSubmit.fields.getTextInputValue('owner_id'),
                    prefix: modalSubmit.fields.getTextInputValue('prefix') || ',',
                    templateId: templateId
                };
                
                // Show advanced options
                await modalSubmit.deferReply({ ephemeral: true });
                
                const advancedEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎨 Advanced Customization')
                    .setDescription('Customize your bot with advanced options. Click the button below to continue.')
                    .addFields(
                        {
                            name: '📋 Current Setup',
                            value: `**Bot:** ${basicData.botName}\n**Prefix:** ${basicData.prefix}\n**Template:** ${template.name}`,
                            inline: false
                        },
                        {
                            name: '⚙️ Available Options',
                            value: '• Embed Color\n• Footer Text\n• Status Message & Type\n• Avatar URL\n• Hosting Duration\n' + (templateId === 'ticket' ? '• Category ID\n• Log Channel ID\n• Support Role ID' : ''),
                            inline: false
                        }
                    );
                
                const advancedButton = new ButtonBuilder()
                    .setCustomId(`advanced_options_${templateId}_${Date.now()}`)
                    .setLabel('Configure Advanced Options')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️');
                
                const skipButton = new ButtonBuilder()
                    .setCustomId(`skip_advanced_${templateId}_${Date.now()}`)
                    .setLabel('Skip & Deploy')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚀');
                
                const buttonRow = new ActionRowBuilder().addComponents(advancedButton, skipButton);
                
                await modalSubmit.editReply({
                    embeds: [advancedEmbed],
                    components: [buttonRow]
                });
                
                // Advanced options collector
                const advancedCollector = modalSubmit.channel.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 600000,
                    filter: i => i.user.id === message.author.id && (i.customId.startsWith('advanced_options_') || i.customId.startsWith('skip_advanced_'))
                });
                
                advancedCollector.on('collect', async (btnInteraction) => {
                    if (btnInteraction.customId.startsWith('skip_advanced_')) {
                        await btnInteraction.reply({
                            content: `✅ Bot deployment started with basic configuration!\nBot: **${basicData.botName}**`,
                            ephemeral: true
                        });
                        advancedCollector.stop();
                        return;
                    }
                    
                    // Show advanced modal
                    const advancedModal = new ModalBuilder()
                        .setCustomId(`createbot_advanced_${templateId}_${Date.now()}`)
                        .setTitle(`${template.name} - Advanced Setup`);
                    
                    const colorInput = new TextInputBuilder()
                        .setCustomId('color')
                        .setLabel('Embed Color (hex code)')
                        .setPlaceholder('#5865F2')
                        .setValue('#5865F2')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setMaxLength(7);
                    
                    const footerInput = new TextInputBuilder()
                        .setCustomId('footer_text')
                        .setLabel('Footer Text')
                        .setPlaceholder('Powered by deadloom')
                        .setValue('Powered by deadloom')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setMaxLength(100);
                    
                    const statusInput = new TextInputBuilder()
                        .setCustomId('status_text')
                        .setLabel('Bot Status Text')
                        .setPlaceholder(',help | Serving {servers} servers')
                        .setValue(',help')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setMaxLength(128);
                    
                    const avatarInput = new TextInputBuilder()
                        .setCustomId('avatar_url')
                        .setLabel('Avatar URL (optional)')
                        .setPlaceholder('https://example.com/avatar.png')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);
                    
                    const hostingInput = new TextInputBuilder()
                        .setCustomId('hosting_duration')
                        .setLabel('Hosting Duration (7d/14d/30d/90d/365d)')
                        .setPlaceholder('30d')
                        .setValue('30d')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setMaxLength(10);
                    
                    advancedModal.addComponents(
                        new ActionRowBuilder().addComponents(colorInput),
                        new ActionRowBuilder().addComponents(footerInput),
                        new ActionRowBuilder().addComponents(statusInput),
                        new ActionRowBuilder().addComponents(avatarInput),
                        new ActionRowBuilder().addComponents(hostingInput)
                    );
                    
                    // Add ticket-specific fields if template is ticket
                    if (templateId === 'ticket') {
                        const ticketModal = new ModalBuilder()
                            .setCustomId(`createbot_ticket_${templateId}_${Date.now()}`)
                            .setTitle(`${template.name} - Ticket Configuration`);
                        
                        const categoryIdInput = new TextInputBuilder()
                            .setCustomId('category_id')
                            .setLabel('Category ID (for ticket organization)')
                            .setPlaceholder('Discord channel category ID')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false);
                        
                        const logChannelInput = new TextInputBuilder()
                            .setCustomId('log_channel_id')
                            .setLabel('Log Channel ID (for bot action logging)')
                            .setPlaceholder('Discord channel ID')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false);
                        
                        const supportRoleInput = new TextInputBuilder()
                            .setCustomId('support_role_id')
                            .setLabel('Support Role ID (for support team)')
                            .setPlaceholder('Discord role ID')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false);
                        
                        const guildIdInput = new TextInputBuilder()
                            .setCustomId('guild_id')
                            .setLabel('Guild ID (Server ID)')
                            .setPlaceholder('Discord guild/server ID')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false);
                        
                        const expirationInput = new TextInputBuilder()
                            .setCustomId('expiration_time')
                            .setLabel('Expiration Time (7d/14d/30d/90d/365d/permanent)')
                            .setPlaceholder('30d')
                            .setValue('30d')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false);
                        
                        ticketModal.addComponents(
                            new ActionRowBuilder().addComponents(categoryIdInput),
                            new ActionRowBuilder().addComponents(logChannelInput),
                            new ActionRowBuilder().addComponents(supportRoleInput),
                            new ActionRowBuilder().addComponents(guildIdInput),
                            new ActionRowBuilder().addComponents(expirationInput)
                        );
                        
                        await btnInteraction.showModal(ticketModal);
                    } else {
                        await btnInteraction.showModal(advancedModal);
                    }
                });
                
                advancedCollector.on('end', () => {
                    modalSubmit.editReply({ components: [] }).catch(() => {});
                });
            }).catch(() => {});
        });
        
        collector.on('end', () => {
            sentMessage.edit({
                components: []
            }).catch(() => {});
        });
    }
};
