const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const COLORS = {
    success: 0x00d4aa,
    error: 0xff6b6b,
    info: 0x5865F2,
    warning: 0xffcc00,
    music: 0x00d4aa
};

function createEmbed(content, type = 'info') {
    const embed = new EmbedBuilder()
        .setColor(COLORS[type] || COLORS.info)
        .setDescription(content);
    return embed;
}

function successEmbed(content) {
    return createEmbed(content, 'success');
}

function errorEmbed(content) {
    return createEmbed(content, 'error');
}

function infoEmbed(content) {
    return createEmbed(content, 'info');
}

function musicEmbed(content) {
    return createEmbed(content, 'music');
}

async function replyError(interaction, content, ephemeral = true) {
    const embed = errorEmbed(content);
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [embed] });
    }
    return interaction.reply({ embeds: [embed], ephemeral });
}

async function replySuccess(interaction, content, ephemeral = false) {
    const embed = successEmbed(content);
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [embed] });
    }
    return interaction.reply({ embeds: [embed], ephemeral });
}

async function replyInfo(interaction, content, ephemeral = false) {
    const embed = infoEmbed(content);
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [embed] });
    }
    return interaction.reply({ embeds: [embed], ephemeral });
}

module.exports = {
    COLORS,
    createEmbed,
    successEmbed,
    errorEmbed,
    infoEmbed,
    musicEmbed,
    replyError,
    replySuccess,
    replyInfo
};
