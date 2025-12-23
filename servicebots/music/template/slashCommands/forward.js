const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasControlPermission, formatDuration } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forward')
        .setDescription('Skip forward in the current song')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Number of seconds to skip forward')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        const { client, member, guild } = interaction;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const player = client.poru.players.get(guild.id);
        
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No music is currently playing!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (member.voice.channel.id !== player.voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You must be in the same voice channel as the bot!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!hasControlPermission(interaction, player)) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Only the requester, admins, or server managers can control the music!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!player.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} There is no track playing!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const seconds = interaction.options.getInteger('seconds');
        const currentPosition = player.position || 0;
        const newPosition = currentPosition + (seconds * 1000);
        const trackDuration = player.currentTrack.info.length;

        if (newPosition >= trackDuration) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Cannot seek beyond track duration! Track length: ${formatDuration(trackDuration)}`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        player.seekTo(newPosition);
        
        const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.seek} Skipped forward **${seconds}s** to **${formatDuration(newPosition)}**.`);
        
        return interaction.reply({ embeds: [embed] });
    },
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
