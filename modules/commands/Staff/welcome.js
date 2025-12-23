const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { PersonalityEngine, RANK_CELEBRATION_MESSAGES } = require('../../ai/advancedPersonality.js');

module.exports = {
    name: "welcome",
    description: "🎉 Welcome a new staff member with style!",
    usage: "welcome <@user>",
    aliases: ["welcomestaff", "newstaff", "greet"],

    run: async (client, message, args) => {
        if (!message.member.permissions.has("MANAGE_ROLES")) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Oops!")
                    .setDescription("You need **Manage Roles** permission to welcome new staff members!")
                ]
            });
        }

        const targetUser = message.mentions.users.first();

        if (!targetUser) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Missing User!")
                    .setDescription("Please mention the new staff member to welcome!\n\n**Usage:** `welcome @user`")
                    .addFields({ name: "💡 Example", value: "`welcome @NewStaff` - Sends a beautiful welcome message!" })
                ]
            });
        }

        const personality = new PersonalityEngine();
        const welcomeMsg = personality.getRandomWelcomeMessage();

        const guildId = message.guild.id;
        client.staffstats.ensure(`${guildId}-${targetUser.id}`, {
            actions: 0,
            warnings: 0,
            kicks: 0,
            bans: 0,
            mutes: 0,
            helpedUsers: 0,
            ticketsResolved: 0,
            activityStreak: 0,
            longestStreak: 0,
            lastActive: null,
            joinedStaff: new Date().toISOString()
        });

        const embed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle("🎊 ━━━ NEW STAFF MEMBER ━━━ 🎊")
            .setDescription(welcomeMsg + `\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `Please welcome <@${targetUser.id}> to our amazing team!\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields({ name: "📚 Getting Started", value: `📖 Read the \`handbook\` to learn the ropes\n` +
                `💡 Check \`dailytip\` for inspiration\n` +
                `🏆 Track progress with \`milestone\`\n` +
                `❓ Use \`ask\` to get AI-powered help`, inline: true })
            .addFields({ name: "🎯 First Goals", value: `🤝 Introduce yourself to the team\n` +
                `📋 Complete training materials\n` +
                `👀 Shadow a senior staff member\n` +
                `✨ Take your first moderation action`, inline: true })
            .addFields({ name: "🌟 Tips for Success", value: `💬 Don't be afraid to ask questions!\n` +
                `📝 Document everything you do\n` +
                `🤝 Teamwork makes the dream work\n` +
                `🎮 Have fun while helping others!`, inline: false })
            .setImage("https://i.imgur.com/AfFp7pu.png")
            .setFooter({ text: `Welcomed by ${message.author.tag} • We're so glad you're here!` })
            .setTimestamp();

        await message.channel.send({ content: `🎉 <@${targetUser.id}>`, embeds: [embed] });

        try {
            const dmEmbed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(`🎉 Welcome to ${message.guild.name}!`)
                .setDescription(`Congratulations on becoming a staff member!\n\n` +
                    `You've been officially welcomed to the team by **${message.author.tag}**!\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**📚 Quick Start Guide:**\n` +
                    `1️⃣ Read the staff handbook\n` +
                    `2️⃣ Introduce yourself in staff chat\n` +
                    `3️⃣ Shadow a senior staff member\n` +
                    `4️⃣ Ask questions whenever you need help!\n\n` +
                    `We're thrilled to have you on the team! 🌟`)
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({ text: "Your staff journey begins now! 🚀" });

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setDescription(`⚠️ Couldn't DM ${targetUser.tag} (DMs may be disabled)`)
                ]
            });
        }
    }
};
