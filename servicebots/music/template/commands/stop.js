const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { hasControlPermission } = require('../helpers/musicHelpers');
const { GuildSettings } = require('../../database/models');
const { startVote, addVote, checkVoteThreshold, clearVote, getVote } = require('../utils/voteManager');
const { queueStateManager } = require('../music/queueState');
const emojis = require('../emojis.json');

module.exports = {
    name: 'stop',
    aliases: ['st', 'end'],
    description: 'Stop music and clear the queue',

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

        let settings = await GuildSettings.findByPk(guild.id);
        if (!settings) {
            settings = { djModeEnabled: false, skipVoteThreshold: 50 };
        }

        if (!settings.djModeEnabled || hasControlPermission(message, player)) {
            queueStateManager.saveQueueSnapshot(guild.id, player);
            player.queue.clear();
            player.destroy();
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.stop} Stopped music and cleared the queue.`);
            return message.reply({ embeds: [embed] });
        }

        const existingVote = getVote(guild.id, 'stop');
        
        if (existingVote) {
            const result = addVote(guild.id, 'stop', member.id);
            
            if (result.alreadyVoted) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} You have already voted to stop!`);
                return message.reply({ embeds: [embed] });
            }
            
            const voteCheck = checkVoteThreshold(guild.id, 'stop', member.voice.channel, settings.skipVoteThreshold);
            
            if (voteCheck.passed) {
                clearVote(guild.id, 'stop');
                queueStateManager.saveQueueSnapshot(guild.id, player);
                player.queue.clear();
                player.destroy();
                const embed = new EmbedBuilder()
                    .setColor(0x00d4aa)
                    .setDescription(`${emojis.stop} Vote passed! Stopped music. (${voteCheck.currentVotes}/${voteCheck.requiredVotes})`);
                return message.reply({ embeds: [embed] });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.autoplay} Vote added! (${voteCheck.currentVotes}/${voteCheck.requiredVotes} votes needed)`);
            return message.reply({ embeds: [embed] });
        }

        const vote = startVote(guild.id, 'stop', member.id);
        const voteCheck = checkVoteThreshold(guild.id, 'stop', member.voice.channel, settings.skipVoteThreshold);

        if (voteCheck.passed) {
            clearVote(guild.id, 'stop');
            queueStateManager.saveQueueSnapshot(guild.id, player);
            player.queue.clear();
            player.destroy();
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.stop} Stopped music and cleared the queue.`);
            return message.reply({ embeds: [embed] });
        }

        const voteButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('vote_stop_prefix')
                .setLabel(`Vote Stop (${voteCheck.currentVotes}/${voteCheck.requiredVotes})`)
                .setEmoji(emojis.stop)
                .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setTitle(`${emojis.autoplay} Vote Stop Started`)
            .setDescription(`${member.displayName} wants to stop. Votes needed: ${voteCheck.requiredVotes}`);

        const msg = await message.reply({ 
            embeds: [embed],
            components: [voteButton],
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (buttonInteraction) => {
            if (!buttonInteraction.member.voice.channelId || buttonInteraction.member.voice.channelId !== player.voiceChannel) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} You must be in the voice channel to vote!`);
                return buttonInteraction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const result = addVote(guild.id, 'stop', buttonInteraction.member.id);
            
            if (result.alreadyVoted) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} You have already voted!`);
                return buttonInteraction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const newVoteCheck = checkVoteThreshold(guild.id, 'stop', buttonInteraction.member.voice.channel, settings.skipVoteThreshold);

            if (newVoteCheck.passed) {
                collector.stop('passed');
                clearVote(guild.id, 'stop');
                queueStateManager.saveQueueSnapshot(guild.id, player);
                player.queue.clear();
                player.destroy();
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00d4aa)
                    .setDescription(`${emojis.stop} Vote passed! Stopped music. (${newVoteCheck.currentVotes}/${newVoteCheck.requiredVotes})`);
                return buttonInteraction.update({ embeds: [successEmbed], components: [] });
            }

            const updatedButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('vote_stop_prefix')
                    .setLabel(`Vote Stop (${newVoteCheck.currentVotes}/${newVoteCheck.requiredVotes})`)
                    .setEmoji(emojis.stop)
                    .setStyle(ButtonStyle.Danger)
            );

            const updatedEmbed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setTitle(`${emojis.autoplay} Vote Stop in Progress`)
                .setDescription(`Votes: ${newVoteCheck.currentVotes}/${newVoteCheck.requiredVotes}`);

            await buttonInteraction.update({ embeds: [updatedEmbed], components: [updatedButton] });
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'passed') {
                clearVote(guild.id, 'stop');
                const expiredEmbed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} Vote stop expired.`);
                msg.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
            }
        });
    },
};
