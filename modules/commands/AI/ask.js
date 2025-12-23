const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GeminiAdvisor = require('../../ai/geminiClient');
const mainconfig = require("../../../mainconfig.js");
const { PersonalityEngine } = require('../../ai/advancedPersonality.js');
const { truncateForEmbed, truncateForField } = require('../../utilfunctions');

let aiClient = null;

function getAIClient() {
    if (!aiClient) {
        aiClient = new GeminiAdvisor();
    }
    return aiClient;
}

function hasStaffRole(member) {
    const staffRoles = [
        mainconfig.ServerRoles?.SupporterRoleId,
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return staffRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("ADMINISTRATOR");
}

const THINKING_MESSAGES = [
    "🧠 **Hmm, let me put on my thinking cap...**",
    "⚡ **Processing at the speed of light...**",
    "🔮 **Consulting the digital oracle...**",
    "🎯 **Laser-focusing on your question...**",
    "💭 **Diving deep into the knowledge realm...**",
    "🚀 **Activating maximum brain power...**",
    "✨ **Channeling cosmic wisdom...**"
];

const SUCCESS_PREFIXES = [
    "🎊 **Boom!** Here's what I found:",
    "✅ **Nailed it!** Check this out:",
    "🌟 **Got it!** Here's your answer:",
    "💎 **Jackpot!** Found exactly what you need:",
    "🏆 **Winner!** Here you go:"
];

module.exports = {
    name: "ask",
    description: "🤖 Ask the AI assistant any question - it learns from your server!",
    usage: "ask <question>",
    aliases: ["question", "aiask", "ai"],

    run: async (client, message, args) => {
        if (!hasStaffRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Oops! Staff Only Zone!")
                    .setDescription("Hey there! 👋 The AI assistant is exclusively for staff members!\n\n" +
                        "If you need help, feel free to open a ticket and our amazing staff will assist you! 💬")
                    .setFooter({ text: "We're here to help! 🌟" })
                ]
            });
        }

        const question = args.join(' ');
        const personality = new PersonalityEngine();

        if (!question) {
            const greeting = personality.getTimeGreeting();
            
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("🤖 ━━━ AI ASSISTANT ━━━ 🤖")
                    .setDescription(`${greeting}, **${message.author.username}**! 👋\n\n` +
                        "I'm your super-smart AI assistant that learns from your server! Ask me anything and I'll do my best to help!\n\n" +
                        "**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**")
                    .addFields({ name: "💡 Example Questions", value: "```\n" +
                        "• How do I warn someone?\n" +
                        "• What's the process for ban appeals?\n" +
                        "• Who's on LOA right now?\n" +
                        "• How do I use the handbook?\n" +
                        "• What should I do if someone is spamming?\n" +
                        "```" })
                    .addFields({ name: "🧠 I Know About", value: "📜 Server rules and guidelines\n" +
                        "🔨 Moderation commands and procedures\n" +
                        "📋 Recent cases and patterns\n" +
                        "📚 Staff handbook sections\n" +
                        "👥 Team structure & roles" })
                    .addFields({ name: "✨ Pro Tip", value: "The more specific your question, inline: the better I can help! Try asking things like:\n" +
                        "*\"What should I do if a user is advertising in DMs?\"*" })
                    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "🚀 Use ,ask <question> to ask me something amazing!" })
                ]
            });
        }

        const thinkingMessage = THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];

        const loadingMsg = await message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#FEE75C")
                .setTitle("🤖 AI Assistant")
                .setDescription(`${thinkingMessage}\n\n*Analyzing server context and finding the best answer for you...*`)
                .setFooter({ text: "This usually takes just a moment! ⚡" })
            ]
        });

        const ai = getAIClient();

        try {
            await ai.learnFromServer(message.guild, client);
        } catch (e) {
            console.log(`[AI] Could not learn from server: ${e.message}`);
        }

        const result = await ai.askQuestion(question, message.guild.id, {
            userID: message.author.id
        });

        const successPrefix = SUCCESS_PREFIXES[Math.floor(Math.random() * SUCCESS_PREFIXES.length)];
        const encouragement = personality.getRandomResponse('encouragement');

        const embed = new EmbedBuilder()
            .setColor(result.fallback ? "#FEE75C" : "#57F287")
            .setTitle("🤖 ━━━ AI ASSISTANT ━━━ 🤖")
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

        embed.addFields({ name: "❓ Your Question", value: truncateForField(question, 200) });

        if (result.answer) {
            const answerText = result.fallback 
                ? result.answer 
                : `${successPrefix}\n\n${result.answer}`;
            
            embed.setDescription(truncateForEmbed(answerText));
        } else {
            embed.setDescription("🤔 Hmm, I couldn't find a specific answer to that question. Try rephrasing or check the handbook!");
        }

        if (result.serverContext) {
            embed.addFields({ name: "📊 Context Used", value: "✅ Server rules\n✅ Moderation history\n✅ Handbook sections", inline: true });
        }

        if (!result.fallback && !result.error) {
            embed.addFields({ name: "💪 Quick Reminder", value: encouragement || "You're doing amazing! Keep up the great work! 🌟", inline: true });
        }

        if (result.error && !result.fallback) {
            embed.addFields({ name: "⚠️ Note", value: result.error });
        }

        embed.setFooter({ 
            text: result.serverContext 
                ? "🧠 Using server context • AI-Powered" 
                : (result.fallback ? "📋 Template response" : "🤖 AI-Powered Response")
        })
        .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ask_helpful')
                    .setLabel('👍 Helpful!')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('ask_followup')
                    .setLabel('❓ Follow-up')
                    .setStyle(ButtonStyle.Primary)
            );

        await loadingMsg.edit({ embeds: [embed], components: [row] });

        const collector = loadingMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'ask_helpful') {
                await interaction.reply({ 
                    content: "🎉 Yay! I'm glad I could help! If you have more questions, just ask! 💪", 
                    ephemeral: true 
                });
            } else if (interaction.customId === 'ask_followup') {
                await interaction.reply({ 
                    content: "💬 Got a follow-up question? Just use `,ask <your question>` and I'll help you out! 🚀", 
                    ephemeral: true 
                });
            }
        });

        collector.on('end', () => {
            loadingMsg.edit({ components: [] }).catch(() => {});
        });
    }
};
