const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");
const emoji = require("../../../emoji.json");
const fs = require("fs");
const path = require("path");
const CronJob = require('cron').CronJob;

async function getOnlineStaff(guild, mainconfig) {
    const staffRoles = [
        mainconfig.ServerRoles?.ModRoleId,
        mainconfig.ServerRoles?.SupporterRoleId
    ].filter(Boolean);

    const onlineStaff = [];
    
    try {
        await guild.members.fetch({ withPresences: true }).catch(() => guild.members.fetch());
        
        for (const [id, member] of guild.members.cache) {
            if (member.user.bot) continue;
            
            const hasStaffRole = member.roles.cache.some(role => staffRoles.includes(role.id));
            if (!hasStaffRole) continue;
            
            const status = member.presence?.status;
            if (status && (status === 'online' || status === 'idle' || status === 'dnd')) {
                onlineStaff.push({
                    name: member.displayName,
                    status: status
                });
            }
        }
    } catch (err) {
        return [];
    }
    
    return onlineStaff.slice(0, 5);
}

function getAvailableBots() {
    const botsPath = path.join(__dirname, '../../../servicebots');
    const bots = [];
    
    try {
        if (fs.existsSync(botsPath)) {
            const botFolders = fs.readdirSync(botsPath);
            
            for (const folder of botFolders) {
                const templatePath = path.join(botsPath, folder, 'template');
                const configPath = path.join(templatePath, 'botconfig', 'config.json');
                
                if (fs.existsSync(configPath)) {
                    try {
                        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        bots.push({
                            name: folder.charAt(0).toUpperCase() + folder.slice(1),
                            type: folder,
                            available: true
                        });
                    } catch (e) {
                        bots.push({
                            name: folder.charAt(0).toUpperCase() + folder.slice(1),
                            type: folder,
                            available: true
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[SetupOrder] Error reading servicebots:', err.message);
    }
    
    return bots;
}

module.exports = {
    name: "setuporder",
    description: "Setup the bot order panel in the order channel",
    category: "Setup",
    aliases: ["ordersetup", "orderpanel"],
    run: async (client, message, args, prefix) => {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.error || '❌'} You don't have permission to use this command.`)
                ]
            });
        }

        const menuoptions = require("../../../settings.json").ordersystem;
        const availableBots = getAvailableBots();
        const onlineStaff = await getOnlineStaff(message.guild, mainconfig);

        // Create bot list from servicebots folder
        let botListText = '';
        if (availableBots.length > 0) {
            botListText = availableBots.map(bot => 
                `${emoji.dl_check || '✅'} **${bot.name} Bot** - Available`
            ).join('\n');
        } else {
            botListText = 'Contact staff for available options';
        }

        // Create staff online text
        let staffText = '';
        if (onlineStaff.length > 0) {
            const statusEmoji = { online: '🟢', idle: '🟡', dnd: '🔴' };
            staffText = onlineStaff.map(s => 
                `${statusEmoji[s.status] || '⚪'} ${s.name}`
            ).join('\n');
        } else {
            staffText = '⚪ No staff currently online';
        }

        // Single clean embed
        const mainEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ 
                name: 'DeadLoom Bot Services', 
                iconURL: client.user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`${emoji.dl_bot || '🤖'} Order Your Bot`)
            .setDescription(
                `Welcome to **DeadLoom Bot Services**!\n` +
                `Select a service below to place an order.\n\n` +
                `**${emoji.dl_folder || '📂'} Available Bots:**\n${botListText}\n\n` +
                `**${emoji.online || '🟢'} Staff Online:**\n${staffText}`
            )
            .addFields(
                { 
                    name: `${emoji.dl_rocket || '🚀'} Quick Facts`, 
                    value: `• 24/7 Hosting`, 
                    inline: true 
                },
                { 
                    name: `${emoji.dl_star || '⭐'} Why Us?`, 
                    value: `• 99% Uptime\n• Custom Features\n• Secure & Fast\n• We Create Our Own Bot Uniquely Coded`, 
                    inline: true 
                }
            )
            .setFooter({ 
                text: 'Select a service from the dropdown to get started',
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        let Selection = new StringSelectMenuBuilder()
            .setCustomId('OrderSystemSelection')
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder(`${emoji.dl_select || '📋'} Choose a service...`)
            .addOptions(menuoptions.map(option => {
                let Obj = {};
                Obj.label = option.label ? option.label.substring(0, 25) : option.value.substring(0, 25);
                Obj.value = option.value.substring(0, 25);
                Obj.description = option.description ? option.description.substring(0, 50) : 'Select this option';
                if (option.emoji) Obj.emoji = option.emoji;
                return Obj;
            }));

        let selectRow = new ActionRowBuilder().addComponents([Selection]);

        let buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('order_info_pricing')
                .setLabel('Pricing')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💰'),
            new ButtonBuilder()
                .setCustomId('order_info_faq')
                .setLabel('FAQ')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❓'),
            new ButtonBuilder()
                .setCustomId('order_info_contact')
                .setLabel('Contact')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💬')
        );

        let orderChannel = client.channels.cache.get(`${mainconfig.OrdersChannelID.OrderChannelID}`);

        if (orderChannel) {
            const sentMessage = await orderChannel.send({
                embeds: [mainEmbed],
                components: [selectRow, buttonRow]
            });
            
            // Set up auto-refresh every 5 minutes
            if (!client.orderPanelRefreshJob) {
                client.orderPanelRefreshJob = new CronJob('0 */5 * * * *', async function() {
                    try {
                        const guild = await client.guilds.fetch(mainconfig.ServerID);
                        const updatedStaff = await getOnlineStaff(guild, mainconfig);
                        
                        // Recreate staff online text
                        let staffText = '';
                        if (updatedStaff.length > 0) {
                            const statusEmoji = { online: '🟢', idle: '🟡', dnd: '🔴' };
                            staffText = updatedStaff.map(s => 
                                `${statusEmoji[s.status] || '⚪'} ${s.name}`
                            ).join('\n');
                        } else {
                            staffText = '⚪ No staff currently online';
                        }
                        
                        // Update the embed with fresh staff data
                        const updatedEmbed = new EmbedBuilder()
                            .setColor('#5865F2')
                            .setAuthor({ 
                                name: 'DeadLoom Bot Services', 
                                iconURL: client.user.displayAvatarURL({ dynamic: true })
                            })
                            .setTitle(`${emoji.dl_bot || '🤖'} Order Your Bot`)
                            .setDescription(
                                `Welcome to **DeadLoom Bot Services**!\n` +
                                `Select a service below to place an order.\n\n` +
                                `**${emoji.dl_folder || '📂'} Available Bots:**\n${botListText}\n\n` +
                                `**${emoji.online || '🟢'} Staff Online:**\n${staffText}`
                            )
                            .addFields(
                                { 
                                    name: `${emoji.dl_rocket || '🚀'} Quick Facts`, 
                                    value: `• 24/7 Hosting`, 
                                    inline: true 
                                },
                                { 
                                    name: `${emoji.dl_star || '⭐'} Why Us?`, 
                                    value: `• 99% Uptime\n• Custom Features\n• Secure & Fast\n• We Create Our Own Bot Uniquely Coded`, 
                                    inline: true 
                                }
                            )
                            .setFooter({ 
                                text: 'Select a service from the dropdown to get started',
                                iconURL: client.user.displayAvatarURL()
                            })
                            .setTimestamp();
                        
                        // Try to find and update the message
                        try {
                            const lastMessages = await orderChannel.messages.fetch({ limit: 10 });
                            const orderMessage = lastMessages.find(m => m.embeds.length > 0 && m.embeds[0].title?.includes('Order Your Bot'));
                            if (orderMessage) {
                                await orderMessage.edit({ embeds: [updatedEmbed] });
                            }
                        } catch (e) {
                            console.error('[OrderPanel] Failed to update message:', e.message);
                        }
                    } catch (err) {
                        console.error('[OrderPanel Refresh] Error:', err.message);
                    }
                });
                client.orderPanelRefreshJob.start();
            }
            
            message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setDescription(`${emoji.Check || '✅'} Order panel sent to <#${mainconfig.OrdersChannelID.OrderChannelID}> (Auto-refreshes every 5 min)`)
                ]
            });
        } else {
            message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.error || '❌'} Order channel not found! Please check your config.`)
                ]
            });
        }
    }
};
