const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { detectMood, moodKeywords } = require('../utils/nlp');
const emojis = require('../emojis.json');

const moodChoices = Object.keys(moodKeywords).map(mood => ({
    name: mood.charAt(0).toUpperCase() + mood.slice(1),
    value: mood
}));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mood')
        .setDescription('Play music matching a specific mood')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The mood type for your music')
                .setRequired(true)
                .addChoices(...moodChoices)),

    async execute(interaction) {
        const { client, member, guild } = interaction;
        const moodType = interaction.options.getString('type');

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
            const moodData = moodKeywords[moodType];
            if (!moodData) {
                const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Invalid mood type selected.`);
                return interaction.editReply({ embeds: [embed] });
            }

            const allTracks = [];
            const seenIds = new Set();

            for (const searchTerm of moodData.searchTerms) {
                try {
                    const result = await client.poru.resolve({
                        query: searchTerm,
                        source: 'ytmsearch',
                        requester: interaction.user
                    });

                    if (result?.tracks) {
                        for (const track of result.tracks) {
                            if (track.info?.identifier && !seenIds.has(track.info.identifier)) {
                                if (!track.info.isStream && track.info.length > 60000) {
                                    seenIds.add(track.info.identifier);
                                    allTracks.push(track);
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Mood search failed for: ${searchTerm}`, err.message);
                }
            }

            if (allTracks.length === 0) {
                const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Could not find any ${moodType} music. Please try again.`);
                return interaction.editReply({ embeds: [embed] });
            }

            for (let i = allTracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
            }

            const tracksToAdd = allTracks.slice(0, 15);
            const wasEmpty = !player.currentTrack && player.queue.length === 0;

            for (const track of tracksToAdd) {
                player.queue.push(track);
            }

            if (wasEmpty) {
                const firstTrack = player.queue.shift();
                await player.play(firstTrack);
            }

            const moodEmojis = {
                chill: '🌊',
                energetic: '⚡',
                happy: '😊',
                sad: '💙',
                focus: '🎯',
                sleep: '🌙',
                romantic: '💕',
                angry: '🔥'
            };

            const trackList = tracksToAdd.slice(0, 5).map((t, i) => 
                `**${i + 1}.** ${t.info.title.length > 50 ? t.info.title.slice(0, 47) + '...' : t.info.title}`
            ).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setTitle(`${moodEmojis[moodType] || emojis.music} ${moodType.charAt(0).toUpperCase() + moodType.slice(1)} Playlist Started`)
                .setDescription(`Added ${tracksToAdd.length} ${moodType} tracks to the queue:\n\n${trackList}${tracksToAdd.length > 5 ? `\n\n...and ${tracksToAdd.length - 5} more tracks` : ''}`);

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Mood command error:', error);
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} An error occurred while creating the mood playlist. Please try again.`);
            return interaction.editReply({ embeds: [embed] });
        }
    },
};
