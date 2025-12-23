const { EmbedBuilder } = require('discord.js');
const { queueStateManager } = require('../music/queueState');
const emojis = require('../emojis.json');

module.exports = {
    name: 'undoqueue',
    aliases: ['undo', 'restore'],
    description: 'Restore the previous queue state',

    async execute(message) {
        const { client, member, guild } = message;
        
        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You need to be in a voice channel!`);
            return message.reply({ embeds: [embed] });
        }

        const player = client.poru.players.get(guild.id);
        
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No music is currently playing!`);
            return message.reply({ embeds: [embed] });
        }

        if (member.voice.channel.id !== player.voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} You must be in the same voice channel as the bot!`);
            return message.reply({ embeds: [embed] });
        }

        if (!queueStateManager.hasUndoSnapshot(guild.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} No undo state available! Queue changes need to be made first.`);
            return message.reply({ embeds: [embed] });
        }

        const snapshot = queueStateManager.popUndoSnapshot(guild.id);
        
        if (!snapshot) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} Failed to restore queue state!`);
            return message.reply({ embeds: [embed] });
        }

        player.queue.length = 0;
        
        if (snapshot.queue && snapshot.queue.length > 0) {
            for (const trackData of snapshot.queue) {
                const result = await client.poru.resolve({
                    query: trackData.uri || trackData.identifier,
                    source: 'youtube',
                    requester: trackData.requester
                });
                
                if (result.tracks && result.tracks.length > 0) {
                    player.queue.push(result.tracks[0]);
                }
            }
        }

        const restoredTrackTitle = snapshot.currentTrack?.title || 'Unknown';
        const queueCount = snapshot.queue?.length || 0;
        const undoRemaining = queueStateManager.getUndoCount(guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setDescription(`${emojis.success} **Queue State Restored**\n\n${emojis.nowplaying} **Track at restore:** ${restoredTrackTitle.replace(/[[\]()]/g, '')}\n${emojis.queue} **Queue tracks restored:** ${queueCount}\n\n${emojis.info} **Undo states remaining:** ${undoRemaining}`);

        return message.reply({ embeds: [embed] });
    },
};
