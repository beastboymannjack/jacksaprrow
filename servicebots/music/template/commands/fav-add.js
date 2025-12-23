const { EmbedBuilder } = require('discord.js');
const Favorite = require('../../database/models/Favorite');
const config = require('../config');
const emojis = require('../emojis.json');

module.exports = {
    name: 'fav add',
    aliases: ['favadd', 'favoriteadd', 'fav-add'],
    description: 'Add a song to your favorites',

    async execute(message, args) {
        const { client, guild } = message;
        
        const userId = message.author.id;
        const query = args.join(' ');
        let track;

        if (query) {
            const loadingContainer = new EmbedBuilder().setColor(0x00d4aa).setDescription(`${emojis.music} Searching for song...`);
            const loadingMsg = await message.reply({ 
                components: [loadingContainer]
            });

            const res = await client.poru.resolve({ query, requester: message.author });
            if (!res || !res.tracks || res.tracks.length === 0) {
                const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Could not find that song!`);
                return loadingMsg.edit({ 
                    embeds: [embed] 
                });
            }
            track = res.tracks[0];
            
            const existing = await Favorite.findOne({
                where: {
                    userId,
                    identifier: track.info.identifier,
                },
            });

            if (existing) {
                const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} **${track.info.title}** is already in your favorites!`);
                return loadingMsg.edit({ 
                    embeds: [embed] 
                });
            }

            await Favorite.create({
                userId,
                identifier: track.info.identifier,
                title: track.info.title,
                author: track.info.author,
                length: track.info.length,
                uri: track.info.uri,
            });

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.favorite} Added **[${track.info.title}](${track.info.uri})** to your favorites!`);
            
            return loadingMsg.edit({ 
                embeds: [embed] 
            });
        } else {
            const player = client.poru.players.get(guild.id);
            track = player?.currentTrack;

            if (!track) {
                const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No track to add! Either search for a song or play music first.`);
                return message.reply({ 
                    embeds: [embed] 
                });
            }

            const existing = await Favorite.findOne({
                where: {
                    userId,
                    identifier: track.info.identifier,
                },
            });

            if (existing) {
                const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} **${track.info.title}** is already in your favorites!`);
                return message.reply({ 
                    embeds: [embed] 
                });
            }

            await Favorite.create({
                userId,
                identifier: track.info.identifier,
                title: track.info.title,
                author: track.info.author,
                length: track.info.length,
                uri: track.info.uri,
            });

            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.favorite} Added **[${track.info.title}](${track.info.uri})** to your favorites!`);
            
            return message.reply({ 
                embeds: [embed] 
            });
        }
    },
};

/*
: ! Aegis !
    + Discord: deadloom Development
    + Community: https://discord.gg/8wfT8SfB5Z  (deadloom Development )
    + for any queries reach out Community or DM me.
*/
