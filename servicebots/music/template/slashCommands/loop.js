const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasControlPermission } = require('../helpers/musicHelpers');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('🔁 Set repeat mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Choose repeat mode')
                .setRequired(true)
                .addChoices(
                    { name: `${emojis.loopOff} Off`, value: 'none' },
                    { name: `${emojis.loopTrack} Track`, value: 'track' },
                    { name: `${emojis.loopQueue} Queue`, value: 'queue' }
                )
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

        const mode = options.getString('mode');
        let loopText = '';
        
        if (mode === 'none') {
            player.setLoop('NONE');
            loopText = `${emojis.error} Loop mode disabled.`;
        } else if (mode === 'track') {
            player.setLoop('TRACK');
            loopText = `${emojis.loopTrack} Loop track enabled.`;
        } else if (mode === 'queue') {
            player.setLoop('QUEUE');
            loopText = `${emojis.loop} Queue repeat enabled.`;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(loopText);
        
        return interaction.reply({ embeds: [embed] });
    },
};
