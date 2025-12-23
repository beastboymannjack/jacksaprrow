const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { hasControlPermission } = require('../helpers/musicHelpers');
const { GuildSettings } = require('../../database/models');
const { startVote, addVote, checkVoteThreshold, clearVote, getVote } = require('../utils/voteManager');
const emojis = require('../emojis.json');

module.exports = {
    name: 'skip',
    aliases: ['s', 'next'],
    description: 'Skip the current song',

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

        if (!player.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setDescription(`${emojis.error} There is no track to skip!`);
            return message.reply({ embeds: [embed] });
        }

        let settings = await GuildSettings.findByPk(guild.id);
        if (!settings) {
            settings = { djModeEnabled: false, skipVoteThreshold: 50 };
        }

        if (!settings.djModeEnabled || hasControlPermission(message, player)) {
            player.skip();
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.skip} Skipped the current track.`);
            return message.reply({ embeds: [embed] });
        }

        const existingVote = getVote(guild.id, 'skip');
        
        if (existingVote) {
            const result = addVote(guild.id, 'skip', member.id);
            
            if (result.alreadyVoted) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} You have already voted to skip!`);
                return message.reply({ embeds: [embed] });
            }
            
            const voteCheck = checkVoteThreshold(guild.id, 'skip', member.voice.channel, settings.skipVoteThreshold);
            
            if (voteCheck.passed) {
                clearVote(guild.id, 'skip');
                player.skip();
                const embed = new EmbedBuilder()
                    .setColor(0x00d4aa)
                    .setDescription(`${emojis.skip} Vote passed! Skipping the current track. (${voteCheck.currentVotes}/${voteCheck.requiredVotes} votes)`);
                return message.reply({ embeds: [embed] });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.autoplay} Vote added! (${voteCheck.currentVotes}/${voteCheck.requiredVotes} votes needed)`);
            return message.reply({ embeds: [embed] });
        }

        const vote = startVote(guild.id, 'skip', member.id);
        const voteCheck = checkVoteThreshold(guild.id, 'skip', member.voice.channel, settings.skipVoteThreshold);

        if (voteCheck.passed) {
            clearVote(guild.id, 'skip');
            player.skip();
            const embed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setDescription(`${emojis.skip} Skipped the current track.`);
            return message.reply({ embeds: [embed] });
        }

        const voteButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('vote_skip_prefix')
                .setLabel(`Vote Skip (${voteCheck.currentVotes}/${voteCheck.requiredVotes})`)
                .setEmoji(emojis.skip)
                .setStyle(ButtonStyle.Primary)
        );

        const embed = new EmbedBuilder()
            .setColor(0x00d4aa)
            .setTitle(`${emojis.autoplay} Vote Skip Started`)
            .setDescription(`${member.displayName} wants to skip. Votes needed: ${voteCheck.requiredVotes}`);

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

            const result = addVote(guild.id, 'skip', buttonInteraction.member.id);
            
            if (result.alreadyVoted) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} You have already voted!`);
                return buttonInteraction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const newVoteCheck = checkVoteThreshold(guild.id, 'skip', buttonInteraction.member.voice.channel, settings.skipVoteThreshold);

            if (newVoteCheck.passed) {
                collector.stop('passed');
                clearVote(guild.id, 'skip');
                player.skip();
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00d4aa)
                    .setDescription(`${emojis.skip} Vote passed! Skipped. (${newVoteCheck.currentVotes}/${newVoteCheck.requiredVotes})`);
                return buttonInteraction.update({ embeds: [successEmbed], components: [] });
            }

            const updatedButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('vote_skip_prefix')
                    .setLabel(`Vote Skip (${newVoteCheck.currentVotes}/${newVoteCheck.requiredVotes})`)
                    .setEmoji(emojis.skip)
                    .setStyle(ButtonStyle.Primary)
            );

            const updatedEmbed = new EmbedBuilder()
                .setColor(0x00d4aa)
                .setTitle(`${emojis.autoplay} Vote Skip in Progress`)
                .setDescription(`Votes: ${newVoteCheck.currentVotes}/${newVoteCheck.requiredVotes}`);

            await buttonInteraction.update({ embeds: [updatedEmbed], components: [updatedButton] });
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'passed') {
                clearVote(guild.id, 'skip');
                const expiredEmbed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setDescription(`${emojis.error} Vote skip expired.`);
                msg.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
            }
        });
    },
};
