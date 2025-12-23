const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Favorite = require('../../database/models/Favorite');
const emojis = require('../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('favoriteplay')
        .setDescription('Play all songs from your favorites')
        .addBooleanOption(option =>
            option.setName('append')
                .setDescription('Append the songs to the current queue')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const { client, member, guild, channel } = interaction;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const append = interaction.options.getBoolean('append') || false;
        const userId = interaction.user.id;

        const favorites = await Favorite.findAll({
            where: { userId },
            order: [['createdAt', 'ASC']],
        });

        if (!favorites || favorites.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You don't have any favorite songs yet!`);
            return interaction.editReply({ 
                embeds: [embed] 
            });
        }

        let player = client.poru.players.get(guild.id);
        
        if (player && !append) {
            player.queue.clear();
        }

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

        let added = 0;
        for (const fav of favorites) {
            try {
                const poruTrack = await client.poru.resolve({ query: fav.uri, requester: interaction.user });
                if (poruTrack.tracks && poruTrack.tracks[0]) {
                    player.queue.add(poruTrack.tracks[0]);
                    added++;
                }
            } catch (e) {
            }
        }

        if (!player.isPlaying && player.isConnected) player.play();

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} ${append ? 'Added' : 'Loaded'} **${added}** songs from your favorites to the queue!`);
        
        return interaction.editReply({ 
            embeds: [embed] 
        });
    },
};
