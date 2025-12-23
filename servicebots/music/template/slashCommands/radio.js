const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { recommendationEngine } = require('../utils/recommendations');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('radio')
        .setDescription('Start an artist radio with similar songs')
        .addStringOption(option =>
            option.setName('artist')
                .setDescription('The artist name to create a radio for')
                .setRequired(true)),

    async execute(interaction) {
        const { client, member, guild } = interaction;
        const artistName = interaction.options.getString('artist');

        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.deferReply();

        let player = client.poru.players.get(guild.id);

        if (!player) {
            player = client.poru.createConnection({
                guildId: guild.id,
                voiceChannel: member.voice.channel.id,
                textChannel: interaction.channel.id,
                deaf: true,
                mute: false,
            });
            if (player.autoplayEnabled === undefined) player.autoplayEnabled = true;
        }

        try {
            const tracks = await recommendationEngine.getArtistRadio(client, artistName, interaction.user, { limit: 15 });

            if (!tracks || tracks.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} Could not find any songs for "${artistName}". Try a different artist name.`);
                return interaction.editReply({ embeds: [embed] });
            }

            const wasEmpty = !player.currentTrack && player.queue.length === 0;

            for (const track of tracks) {
                player.queue.push(track);
            }

            if (wasEmpty) {
                const firstTrack = player.queue.shift();
                await player.play(firstTrack);
            }

            const trackList = tracks.slice(0, 5).map((t, i) => 
                `**${i + 1}.** ${t.info.title.length > 50 ? t.info.title.slice(0, 47) + '...' : t.info.title}`
            ).join('\n');

            const moreText = tracks.length > 5 ? `\n\n...and ${tracks.length - 5} more tracks` : '';

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.autoplay} **${artistName} Radio Started**\n\nAdded ${tracks.length} tracks to the queue:\n${trackList}${moreText}`);

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Radio command error:', error);
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} An error occurred while starting the radio. Please try again.`);
            return interaction.editReply({ embeds: [embed] });
        }
    },
};
