const { EmbedBuilder } = require('discord.js');
const { PersonalityEngine, STAFF_TIPS } = require('../../ai/advancedPersonality.js');

module.exports = {
    name: "dailytip",
    description: "🌟 Get an inspiring daily tip for staff members!",
    usage: "dailytip",
    aliases: ["tip", "motivation", "inspire"],

    run: async (client, message, args) => {
        const personality = new PersonalityEngine();
        const greeting = personality.getTimeGreeting();
        const tip = personality.getRandomTip();
        const encouragement = personality.getRandomResponse('encouragement');

        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("💫 Daily Staff Inspiration 💫")
            .setDescription(`${greeting}, **${message.author.username}**!\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `${tip}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `${encouragement}`)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .addFields({ name: "🎯 Today's Challenge", value: "Try to help at least one member who's struggling. Small acts make big differences!", inline: false })
            .setFooter({ text: "✨ You're doing amazing! Keep up the great work! ✨" })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
