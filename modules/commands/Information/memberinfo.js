const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "memberinfo",
    description: "Get information about a member",
    usage: "memberinfo [@user optional]",
    aliases: ["uinfo", "whois"],

    run: async (client, message, args) => {
        const targetUser = message.mentions.users.first() || 
            (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
        
        if (!targetUser) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ User Not Found")
                    .setDescription("Could not find that user.")
                ]
            });
        }

        const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!member) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Member Not Found")
                    .setDescription("This user is not a member of this server.")
                ]
            });
        }

        const roles = member.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .slice(0, 10)
            .join(', ') || 'No roles';

        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        const createdAt = Math.floor(targetUser.createdTimestamp / 1000);
        const isBot = targetUser.bot ? 'Yes ✅' : 'No';
        const status = member.presence?.status || 'offline';

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle(`👤 ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: "📛 Username", value: `${targetUser.tag}`, inline: true },
                { name: "🆔 User ID", value: `\`${targetUser.id}\``, inline: true },
                { name: "🤖 Bot Account", value: isBot, inline: true },
                { name: "📅 Account Created", value: `<t:${createdAt}:d>`, inline: true },
                { name: "📝 Joined Server", value: `<t:${joinedAt}:d>`, inline: true },
                { name: "⏰ Days in Server", value: `${Math.floor((Date.now() - member.joinedTimestamp) / 86400000)} days`, inline: true },
                { name: "🟢 Status", value: status, inline: true },
                { name: "👑 Highest Role", value: member.roles.highest.toString(), inline: true },
                { name: "🎯 Roles (" + (member.roles.cache.size - 1) + ")", value: roles, inline: false }
            )
            .setFooter({ text: "Member Info • ID: " + targetUser.id })
            .setTimestamp();

        if (member.user.bot) {
            embed.addFields({ name: "⚙️ Bot Type", value: member.user.system ? 'System Bot' : 'Custom Bot', inline: true });
        }

        await message.reply({ embeds: [embed] });
    }
};
