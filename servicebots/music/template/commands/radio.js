const { EmbedBuilder } = require('discord.js');
const { recommendationEngine } = require('../utils/recommendations');
const emojis = require('../emojis.json');

module.exports = {
    name: 'radio',
    aliases: ['artistradio', 'ar'],
    description: 'Start an artist radio with similar songs',
    usage: 'radio <artist name>',
    
    async execute(message, args) {
        const { client, member, guild, channel } = message;
        const artistName = args.join(' ');

        if (!artistName) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Please provide an artist name! Usage: \`,radio <artist>\``);
            return message.reply({ embeds: [embed] });
        }

        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return message.reply({ embeds: [embed] });
        }

        const loadingEmbed = new EmbedBuilder().setColor(0x00d4aa).setDescription(`${emojis.loading || '⏳'} Starting ${artistName} radio...`);
        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        let player = client.poru.players.get(guild.id);

        if (!player) {
            player = client.poru.createConnection({
                guildId: guild.id,
                voiceChannel: member.voice.channel.id,
                textChannel: channel.id,
                deaf: true,
                mute: false,
            });
            if (player.autoplayEnabled === undefined) player.autoplayEnabled = true;
        }

        try {
            const tracks = await recommendationEngine.getArtistRadio(client, artistName, message.author, { limit: 15 });

            if (!tracks || tracks.length === 0) {
                const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Could not find any songs for "${artistName}". Try a different artist name.`);
                return loadingMsg.edit({ embeds: [embed] });
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

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.autoplay} **${artistName} Radio Started**\n\nAdded ${tracks.length} tracks to the queue:\n${trackList}${tracks.length > 5 ? `\n\n...and ${tracks.length - 5} more tracks` : ''}`);

            return loadingMsg.edit({ embeds: [embed] });

        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} An error occurred while starting the radio. Please try again.`);
            return loadingMsg.edit({ embeds: [embed] });
        }
    },
};
