const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DEFAULT_HANDBOOK_SECTIONS = {
    "Welcome to the Team": {
        content: `🎉 **WELCOME TO THE STAFF TEAM!** 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Congratulations on joining our amazing staff team! We're thrilled to have you aboard! 🌟

**📋 Your First Steps:**
1️⃣ Read through all handbook sections carefully
2️⃣ Introduce yourself in the staff chat
3️⃣ Shadow a senior staff member for your first week
4️⃣ Ask questions - there are no dumb questions!
5️⃣ Start with simple tasks and work your way up

**🎯 Your Goals:**
• Learn our server rules inside and out
• Understand our moderation procedures
• Build relationships with the team
• Provide excellent service to our members

**💪 Remember:**
• We all started where you are now
• Mistakes happen - learn from them!
• Teamwork makes the dream work
• Have fun while helping others!

**🆘 Need Help?**
Use \`,ask <question>\` to get AI-powered assistance, or reach out to any senior staff member. We're all here to support you!

Welcome to the family! 🎊`,
        author: "System",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    "Moderation Guidelines": {
        content: `🔨 **MODERATION GUIDELINES** 🔨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⚖️ THE PUNISHMENT LADDER:**

1️⃣ **Verbal Warning** - For minor first-time offenses
   • Use when someone might not know the rules
   • Be polite and educational

2️⃣ **Written Warning** (\`,warn @user reason\`)
   • For repeat minor offenses
   • When verbal warning was ignored
   • Adds a strike to their record

3️⃣ **Timeout** (\`,timeout @user 1h reason\`)
   • After 3 warnings/strikes
   • For heated situations needing cool-down
   • Duration: 1 hour to 7 days based on severity

4️⃣ **Kick** (\`,kick @user reason\`)
   • For serious violations
   • When timeouts haven't worked
   • They can rejoin but should be monitored

5️⃣ **Ban** (\`,ban @user reason\`)
   • For severe violations
   • After repeated serious offenses
   • Raids, illegal content, threats

**🛑 IMMEDIATE BAN OFFENSES:**
• Raids or coordinated attacks
• NSFW content in non-NSFW channels
• Doxxing or real-life threats
• Scams, phishing, or malware
• Extreme hate speech

**📝 ALWAYS DOCUMENT:**
• Use clear, professional language
• Include evidence when possible
• Be consistent with all members

**❓ UNSURE?**
Ask a senior staff member before acting!`,
        author: "System",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    "Ticket Handling": {
        content: `🎫 **TICKET HANDLING GUIDE** 🎫

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📨 WHEN A TICKET OPENS:**

1️⃣ **Respond Quickly!** (Within 5-10 minutes)
   "Hey there! 👋 Thanks for reaching out! How can I help you today?"

2️⃣ **Read Carefully**
   • Understand the full issue before responding
   • Ask clarifying questions if needed

3️⃣ **Be Professional & Friendly**
   • Use their name when possible
   • Stay calm even if they're frustrated
   • Show empathy and understanding

**🎯 DURING THE TICKET:**

✅ **DO:**
• Keep them informed of progress
• Provide clear, step-by-step instructions
• Use professional language
• Follow up if waiting on something

❌ **DON'T:**
• Leave them hanging
• Argue or get defensive
• Share personal opinions
• Promise things you can't deliver

**🔧 TICKET COMMANDS:**
• \`,close\` - Close completed tickets
• \`,priority high\` - Set priority level
• \`,escalate @senior\` - Escalate to senior staff
• \`,assign @staff\` - Assign to specific person

**✨ CLOSING THE TICKET:**
1. Make sure the issue is fully resolved
2. Ask "Is there anything else I can help with?"
3. Thank them for their patience
4. Use \`,close\` to close the ticket

**💡 PRO TIP:**
Great ticket handling = happy members = server growth!`,
        author: "System",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    "Communication Tips": {
        content: `💬 **COMMUNICATION TIPS** 💬

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🌟 THE GOLDEN RULES:**

1️⃣ **Be Professional**
   • You represent the entire team
   • Your words carry weight
   • Think before you type

2️⃣ **Be Friendly**
   • People respond better to kindness
   • Use a warm, welcoming tone
   • Don't be robotic!

3️⃣ **Be Clear**
   • Avoid jargon when possible
   • Break complex info into steps
   • Confirm they understand

**✅ GREAT PHRASES TO USE:**
• "Hey! How can I help you today?"
• "I understand your frustration, let me help!"
• "Great question! Here's how that works..."
• "Thanks for your patience!"
• "Is there anything else I can help with?"

**❌ PHRASES TO AVOID:**
• "That's not my problem"
• "You're wrong"
• "I don't know" (say "Let me find out!")
• "That's obvious"
• "Calm down"

**🔥 DEALING WITH DIFFICULT USERS:**

1. Stay calm - Don't take it personally
2. Acknowledge their feelings
3. Focus on solutions, not blame
4. Know when to escalate
5. Document everything

**💡 REMEMBER:**
How you say something is just as important as what you say!`,
        author: "System",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    "Using the AI Assistant": {
        content: `🤖 **USING THE AI ASSISTANT** 🤖

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🧠 WHAT CAN THE AI DO?**

The AI assistant is your smart helper that learns from our server! It can:

• Answer questions about our rules
• Suggest moderation actions
• Help draft professional responses
• Analyze ban appeals
• Provide guidance on tricky situations

**📋 AI COMMANDS:**

\`,ask <question>\` - Ask anything!
\`,ai help <situation>\` - Get moderation advice
\`,ai suggest <problem>\` - Get suggestions
\`,ai analyze-appeal <id>\` - Analyze ban appeals
\`,ailearn\` - Update AI's knowledge

**💡 GREAT QUESTIONS TO ASK:**

• "How do I handle a user who keeps breaking rules?"
• "What's the punishment for advertising?"
• "Help me respond to this ban appeal"
• "Who's on LOA right now?"
• "What are our rules about self-promo?"

**🎯 PRO TIPS:**

1. Be specific with your questions
2. Include relevant details
3. The AI learns from our server context
4. Use it to draft responses, then personalize them

**⚠️ REMEMBER:**
The AI is a helper, not a replacement for your judgment! Always review AI suggestions before acting.

**🚀 TRY IT NOW:**
Use \`,ask how do I warn someone?\` to see it in action!`,
        author: "System",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    "Staff Commands Cheatsheet": {
        content: `⌨️ **STAFF COMMANDS CHEATSHEET** ⌨️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🔨 MODERATION:**
\`,warn @user reason\` - Issue warning
\`,kick @user reason\` - Kick user
\`,ban @user reason\` - Ban user
\`,timeout @user 1h reason\` - Timeout
\`,unban userId reason\` - Unban user
\`,history @user\` - View mod history
\`,strikes @user\` - Check strikes

**🎫 TICKETS:**
\`,close\` - Close ticket
\`,priority high/medium/low\` - Set priority
\`,escalate @senior\` - Escalate ticket
\`,assign @staff\` - Assign ticket

**👥 STAFF MANAGEMENT:**
\`,loa start 1w\` - Start leave of absence
\`,loa end\` - End LOA early
\`,handbook list\` - View handbook
\`,leaderboard\` - Staff rankings
\`,milestone\` - Your achievements
\`,dailytip\` - Get motivation!

**🤖 AI ASSISTANT:**
\`,ask question\` - Ask AI anything
\`,ai help situation\` - Get advice
\`,quickguide topic\` - Quick guides

**🛡️ SECURITY:**
\`,lockdown\` - Lock channel
\`,lockdown end\` - Unlock channel
\`,antiraid on/off\` - Toggle raid protection
\`,verify @user\` - Verify member

**📊 INFO:**
\`,staffstats\` - Team stats
\`,staffinfo @user\` - Staff info
\`,xp @user\` - Check XP

**💡 TIP:** Bookmark this section for quick reference!`,
        author: "System",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
};

module.exports = {
    name: "inithandbook",
    description: "📚 Initialize the handbook with pre-built sections for new staff!",
    usage: "inithandbook",
    aliases: ["setuphandbook", "handbookinit", "createhandbook"],

    run: async (client, message, args) => {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied!")
                    .setDescription("Only administrators can initialize the handbook!")
                ]
            });
        }

        const guildId = message.guild.id;
        client.handbook.ensure(guildId, {});
        const existingHandbook = client.handbook.get(guildId);
        const existingSections = Object.keys(existingHandbook).length;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('handbook_init_confirm')
                    .setLabel('📚 Initialize Handbook')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('handbook_init_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const sectionList = Object.keys(DEFAULT_HANDBOOK_SECTIONS)
            .map((name, i) => `${i + 1}. 📖 **${name}**`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("📚 ━━━ HANDBOOK INITIALIZATION ━━━ 📚")
            .setDescription(`This will create **${Object.keys(DEFAULT_HANDBOOK_SECTIONS).length} pre-built handbook sections** designed to train new staff members!\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `**📋 Sections to be created:**\n${sectionList}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                (existingSections > 0 
                    ? `⚠️ You already have **${existingSections} existing sections**. New sections will be added alongside them (existing ones won't be overwritten).`
                    : `✨ Your handbook is currently empty. Let's fill it with amazing content!`))
            .setFooter({ text: "Click Initialize to create all sections!" })
            .setTimestamp();

        const confirmMsg = await message.reply({ embeds: [embed], components: [row] });

        const collector = confirmMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000,
            max: 1
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'handbook_init_cancel') {
                return interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor("#95A5A6")
                        .setTitle("❌ Cancelled")
                        .setDescription("Handbook initialization was cancelled.")
                    ],
                    components: []
                });
            }

            let addedCount = 0;
            let skippedCount = 0;

            for (const [sectionName, sectionData] of Object.entries(DEFAULT_HANDBOOK_SECTIONS)) {
                if (!existingHandbook[sectionName]) {
                    existingHandbook[sectionName] = sectionData;
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }

            client.handbook.set(guildId, existingHandbook);

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("✅ ━━━ HANDBOOK INITIALIZED ━━━ ✅")
                .setDescription(`🎉 **Handbook setup complete!**\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `📚 **Sections Added:** ${addedCount}\n` +
                    `⏭️ **Sections Skipped (already exist):** ${skippedCount}\n` +
                    `📖 **Total Sections:** ${Object.keys(existingHandbook).length}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
                .addFields({ name: "🚀 What's Next?", value: "• Use `, inline: handbook list` to see all sections\n" +
                    "• Use `,handbook read <section>` to read any section\n" +
                    "• Use `,handbook add <section>` to add custom sections\n" +
                    "• Share with new staff members!" })
                .addFields({ name: "💡 Pro Tip", value: "Tell new staff to start with **Welcome to the Team** and read through all sections in order!" })
                .setFooter({ text: "Your new staff members will thank you! 🌟" })
                .setTimestamp();

            await interaction.update({ embeds: [successEmbed], components: [] });
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirmMsg.edit({
                    embeds: [new EmbedBuilder()
                        .setColor("#95A5A6")
                        .setTitle("⏱️ Timed Out")
                        .setDescription("The initialization request has expired.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }
};
