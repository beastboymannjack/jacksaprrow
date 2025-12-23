const { EmbedBuilder } = require('discord.js');
const { formatWelcomeMessage, createWelcomeEmbed } = require('../handlers/welcomeHandler');

async function handleGuildMemberAdd(member, client) {
    const guildId = member.guild.id;
    const settings = client.serversettings?.get(guildId);

    if (!settings?.welcome?.enabled) return;

    if (settings.welcome.autorole) {
        const role = member.guild.roles.cache.get(settings.welcome.autorole);
        if (role) {
            await member.roles.add(role).catch(e => console.log('[Welcome] Failed to add autorole:', e.message));
        }
    }

    if (settings.welcome.channel) {
        const channel = member.guild.channels.cache.get(settings.welcome.channel);
        if (channel) {
            const message = formatWelcomeMessage(settings.welcome.message, member, member.guild);

            if (settings.welcome.embed?.enabled) {
                const embed = createWelcomeEmbed(settings.welcome.embed, member, member.guild);
                await channel.send({ content: message, embeds: [embed] }).catch(() => {});
            } else {
                await channel.send(message).catch(() => {});
            }
        }
    }

    if (settings.welcome.dm?.enabled) {
        const dmMessage = formatWelcomeMessage(settings.welcome.dm.message, member, member.guild);
        try {
            await member.send({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`Welcome to ${member.guild.name}!`)
                    .setDescription(dmMessage)
                    .setThumbnail(member.guild.iconURL({ dynamic: true }))
                    .setTimestamp()
                ]
            });
        } catch (e) {}
    }
}

async function handleGuildMemberRemove(member, client) {
    const guildId = member.guild.id;
    const settings = client.serversettings?.get(guildId);

    if (!settings?.goodbye?.enabled || !settings.goodbye.channel) return;

    const channel = member.guild.channels.cache.get(settings.goodbye.channel);
    if (!channel) return;

    const message = settings.goodbye.message
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, member.guild.name);

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('Member Left')
        .setDescription(message)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Member count: ${member.guild.memberCount}` })
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { handleGuildMemberAdd, handleGuildMemberRemove };
