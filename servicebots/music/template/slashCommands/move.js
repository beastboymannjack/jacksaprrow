const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hexToDecimal } = require('../helpers/colorHelper');
const { hasControlPermission } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('🔀 Move a track to a different position in the queue')
        .addIntegerOption(option =>
            option.setName('from')
                .setDescription('Current position of the track')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(option =>
            option.setName('to')
                .setDescription('New position for the track')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        const { client, member, guild, options } = interaction;
        
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

        if (player.queue.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} The queue is empty!`);
            return interaction.reply({ embeds: [embed] });
        }

        const fromPos = options.getInteger('from');
        const toPos = options.getInteger('to');

        if (fromPos > player.queue.length || toPos > player.queue.length) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Invalid position! Queue has **${player.queue.length}** tracks.`);
            return interaction.reply({ embeds: [embed] });
        }

        if (fromPos === toPos) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Source and destination positions are the same!`);
            return interaction.reply({ embeds: [embed] });
        }

        const track = player.queue[fromPos - 1];
        player.queue.splice(fromPos - 1, 1);
        player.queue.splice(toPos - 1, 0, track);
        
        const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.move} Moved **[${track.info.title}](${track.info.uri})** from position ${fromPos} to ${toPos}.`);
        
        return interaction.reply({ embeds: [embed] });
    },
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
