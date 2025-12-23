const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'roleinfo',
    aliases: ['ri', 'role'],
    category: 'Utility',
    description: 'Get detailed role information',
    usage: ',roleinfo [@role|role_name]',
    
    async execute(message, args, client) {
        if (!args.length && !message.mentions.roles.first()) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Please mention a role or provide a role name.')
                ]
            });
        }
        
        let role = message.mentions.roles.first();
        
        if (!role && args.length) {
            role = message.guild.roles.cache.find(r => 
                r.name.toLowerCase().includes(args.join(' ').toLowerCase())
            );
        }
        
        if (!role) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Role not found.')
                ]
            });
        }
        
        const perms = role.permissions.toArray().slice(0, 10);
        
        const embed = new EmbedBuilder()
            .setColor(role.color || '#808080')
            .setTitle(`🏷️ ${role.name}`)
            .addFields(
                { name: 'Role ID', value: `\`${role.id}\``, inline: true },
                { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Members', value: (role.members.size).toString(), inline: true },
                { name: 'Position', value: `${role.position}/${message.guild.roles.cache.size}`, inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes ✓' : 'No', inline: true },
                { name: 'Hoisted', value: role.hoist ? 'Yes ✓' : 'No', inline: true },
                { name: 'Permissions', value: perms.length > 0 ? perms.join(', ').substring(0, 1024) : 'None', inline: false }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        
        return message.reply({ embeds: [embed] });
    }
};
