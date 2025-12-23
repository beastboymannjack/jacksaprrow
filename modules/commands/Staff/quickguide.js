const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');

const QUICK_GUIDES = {
    moderation: {
        emoji: "🔨",
        title: "Moderation Basics",
        color: "#ED4245",
        content: `
**🔨 MODERATION QUICK GUIDE 🔨**

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⚠️ Warnings**
\`warn @user reason\` - Issue a warning
• Use for minor rule violations
• Warnings add strikes to their record
• 3 strikes = automatic timeout

**👢 Kicks**
\`kick @user reason\` - Remove from server
• Use for moderate violations
• They can rejoin with an invite
• Always provide a clear reason

**🔨 Bans**
\`ban @user reason\` - Permanent removal
• Use for severe violations only
• They cannot rejoin unless unbanned
• Document thoroughly!

**🤐 Timeouts**
\`timeout @user 1h reason\` - Mute temporarily
• Use: 1m, 1h, 1d, 7d, etc.
• Good for cooling-off periods

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **Pro Tips:**
• Always warn before kick/ban (unless severe)
• Keep a professional tone
• Document your reasoning
• When in doubt, ask a senior staff!
`
    },
    tickets: {
        emoji: "🎫",
        title: "Ticket Handling",
        color: "#00D9FF",
        content: `
**🎫 TICKET HANDLING GUIDE 🎫**

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 Opening a Ticket**
• Greet the user warmly!
• Ask how you can help
• Be patient and professional

**📋 During the Ticket**
• Read the issue carefully
• Ask clarifying questions
• Keep the user informed
• Don't leave them waiting!

**✅ Closing a Ticket**
\`close\` - Close the current ticket
• Make sure the issue is resolved
• Ask if they need anything else
• Thank them for their patience!

**📊 Ticket Priority**
\`priority high\` - Set priority level
\`escalate @senior\` - Escalate to senior staff
\`assign @staff\` - Assign to specific person

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **Golden Rules:**
• Respond within 5-10 minutes
• One issue at a time
• Never argue with users
• If stuck, escalate!
`
    },
    communication: {
        emoji: "💬",
        title: "Communication",
        color: "#57F287",
        content: `
**💬 COMMUNICATION GUIDE 💬**

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🌟 Tone & Approach**
• Be friendly but professional
• Use their name when possible
• Show empathy and understanding
• Stay calm, even if they're angry

**✅ DO:**
• "Hey! How can I help you today?"
• "I understand your frustration, let me help!"
• "Great question! Here's how that works..."
• "Thanks for your patience!"

**❌ DON'T:**
• "That's not my problem"
• "You're wrong"
• "I don't know" (say "Let me find out!")
• Use excessive caps or emojis

**🔥 Dealing with Difficult Users**
1. Stay calm and professional
2. Acknowledge their feelings
3. Focus on solutions, not blame
4. Know when to escalate

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **Remember:**
Your words represent the whole team!
`
    },
    rules: {
        emoji: "📜",
        title: "Rule Enforcement",
        color: "#FEE75C",
        content: `
**📜 RULE ENFORCEMENT GUIDE 📜**

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📋 Punishment Ladder**
1️⃣ **Verbal Warning** - Minor first offense
2️⃣ **Written Warning** - Repeat minor offense
3️⃣ **Timeout** - Multiple warnings
4️⃣ **Kick** - Serious or repeated violations
5️⃣ **Ban** - Severe violations or raids

**⚖️ Be Consistent**
• Same rules for everyone
• Document every action
• Check user's history first
• Consider context

**🛡️ Immediate Bans for:**
• Raids/coordinated attacks
• NSFW content
• Doxxing/threats
• Extreme hate speech
• Scams/phishing

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **The Golden Question:**
"Is this punishment fair if applied to everyone equally?"
`
    },
    ai: {
        emoji: "🤖",
        title: "AI Assistant",
        color: "#5865F2",
        content: `
**🤖 AI ASSISTANT GUIDE 🤖**

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 What Can AI Do?**
• Answer questions about rules
• Suggest moderation actions
• Help draft professional responses
• Analyze ban appeals
• Learn from your server!

**📋 Commands**
\`ask <question>\` - Ask anything!
\`ai help <situation>\` - Get advice
\`ai suggest <problem>\` - Get suggestions
\`ai analyze-appeal <id>\` - Analyze appeals
\`ailearn\` - Update AI's knowledge

**💡 Great Questions to Ask:**
• "How do I handle a user who..."
• "What's the punishment for..."
• "Help me respond to this appeal"
• "Who's on LOA right now?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **Pro Tip:**
The AI learns from your server's rules, 
moderation history, and handbook!
`
    }
};

module.exports = {
    name: "quickguide",
    description: "📖 Quick reference guides for common staff tasks!",
    usage: "quickguide [topic]",
    aliases: ["guide", "qg", "howto", "tutorial"],

    run: async (client, message, args) => {
        const topic = args[0]?.toLowerCase();

        if (topic && QUICK_GUIDES[topic]) {
            const guide = QUICK_GUIDES[topic];
            const embed = new EmbedBuilder()
                .setColor(guide.color)
                .setTitle(`${guide.emoji} ${guide.title}`)
                .setDescription(guide.content)
                .setFooter({ text: "Quick Guide • Use ,quickguide to see all topics" })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('quickguide_select')
            .setPlaceholder('📖 Choose a topic...')
            .addOptions([
                { label: '🔨 Moderation Basics', value: 'moderation', description: 'Warnings, kicks, bans, and timeouts' },
                { label: '🎫 Ticket Handling', value: 'tickets', description: 'How to handle support tickets' },
                { label: '💬 Communication', value: 'communication', description: 'Professional communication tips' },
                { label: '📜 Rule Enforcement', value: 'rules', description: 'Punishment ladder and consistency' },
                { label: '🤖 AI Assistant', value: 'ai', description: 'How to use the AI helper' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("📖 ━━━ QUICK GUIDES ━━━ 📖")
            .setDescription("**Welcome to Staff Quick Guides!**\n\n" +
                "Select a topic from the dropdown below to get instant, helpful information!\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "**Available Topics:**\n" +
                "🔨 **Moderation** - Warnings, kicks, bans\n" +
                "🎫 **Tickets** - Handling support tickets\n" +
                "💬 **Communication** - Professional tips\n" +
                "📜 **Rules** - Enforcement guidelines\n" +
                "🤖 **AI** - Using the AI assistant\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            .setFooter({ text: "💡 Tip: Use ,quickguide <topic> for direct access!" })
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        const msg = await message.reply({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            const selected = interaction.values[0];
            const guide = QUICK_GUIDES[selected];

            const guideEmbed = new EmbedBuilder()
                .setColor(guide.color)
                .setTitle(`${guide.emoji} ${guide.title}`)
                .setDescription(guide.content)
                .setFooter({ text: "Quick Guide • Select another topic above!" })
                .setTimestamp();

            await interaction.update({ embeds: [guideEmbed], components: [row] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder()
                .addComponents(selectMenu.setDisabled(true));
            msg.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
