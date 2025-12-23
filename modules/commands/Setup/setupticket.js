const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require("discord.js");
const mainconfig = require("../../../mainconfig.js");
const emoji = require("../../../emoji.json");

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

module.exports = {
    name: "setupticket",
    description: "Setup the ticket support message in the ticket channel",
    category: "Setup",
    aliases: ["ticketsetup"],
    run: async (client, message, args, prefix) => {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.error || '❌'} You don't have permission to use this command.`)
                ]
            });
        }

        const menuoptions = require("../../../settings.json").ticketsystem;
        const onlineStaff = await getOnlineStaff(message.guild, mainconfig);

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

        let embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ 
                name: 'DeadLoom Support', 
                iconURL: client.user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`${emoji.dl_ticket || '🎫'} Ticket Support`)
            .setDescription(
                `Need help? Open a ticket below!\n\n` +
                `**${emoji.online || '🟢'} Staff Online:**\n${staffText}\n\n` +
                `Select your concern from the dropdown to create a ticket.`
            )
            .addFields(
                { 
                    name: `ℹ️ Response Time`, 
                    value: `Average: **< 2 hours**`, 
                    inline: true 
                },
                { 
                    name: `💬 Contact`, 
                    value: `support@deadloom.com`, 
                    inline: true 
                }
            )
            .setFooter({ 
                text: 'DeadLoom Support System',
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        let Selection = new StringSelectMenuBuilder()
            .setCustomId('TicketSupportSelection')
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder(`${emoji.dl_select || '📋'} Choose your concern...`)
            .addOptions(menuoptions.map(option => {
                let Obj = {};
                Obj.label = option.label ? option.label.substring(0, 25) : option.value.substring(0, 25);
                Obj.value = option.value.substring(0, 25);
                Obj.description = option.description ? option.description.substring(0, 50) : 'Select this option';
                if (option.emoji) Obj.emoji = option.emoji;
                return Obj;
            }));

        let row = new ActionRowBuilder().addComponents([Selection]);
        let ticketChannel = client.channels.cache.get(`${mainconfig.OrdersChannelID.TicketChannelID}`);

        if (ticketChannel) {
            await ticketChannel.send({
                embeds: [embed],
                components: [row]
            });
            
            message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setDescription(`${emoji.Check || '✅'} Ticket panel sent to <#${mainconfig.OrdersChannelID.TicketChannelID}>`)
                ]
            });
        } else {
            message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.error || '❌'} Ticket channel not found! Please check your config.`)
                ]
            });
        }
    }
};
