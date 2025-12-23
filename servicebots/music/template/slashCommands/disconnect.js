const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasControlPermission } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Disconnect the bot from the voice channel'),

    async execute(interaction) {
        const { client, member, guild } = interaction;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const player = client.poru.players.get(guild.id);
        const voiceConnection = guild.members.me?.voice?.channel;
        
        if (!player && !voiceConnection) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} I'm not connected to any voice channel!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (player && member.voice.channel.id !== player.voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You must be in the same voice channel as the bot!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (voiceConnection && member.voice.channel.id !== voiceConnection.id) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You must be in the same voice channel as the bot!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (player && !hasControlPermission(interaction, player)) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Only the requester, admins, or server managers can control the music!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (player) {
            player.destroy();
        } else if (voiceConnection) {
            voiceConnection.disconnect();
        }
        
        const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`👋 Disconnected from the voice channel.`);
        
        return interaction.reply({ embeds: [embed] });
    },
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
