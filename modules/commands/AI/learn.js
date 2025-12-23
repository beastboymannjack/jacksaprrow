const { EmbedBuilder } = require('discord.js');
const GeminiAdvisor = require('../../ai/geminiClient');
const mainconfig = require("../../../mainconfig.js");

let aiClient = null;

function getAIClient() {
    if (!aiClient) {
        aiClient = new GeminiAdvisor();
    }
    return aiClient;
}

module.exports = {
    name: "ailearn",
    description: "Make the AI learn from your server's current state",
    usage: "ailearn",
    aliases: ["learnserver", "refreshai"],

    run: async (client, message, args) => {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only administrators can refresh the AI's server knowledge.")
                ]
            });
        }

        const loadingMsg = await message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#FEE75C")
                .setTitle("🧠 Learning...")
                .setDescription("Analyzing server structure, rules, and moderation history...")
            ]
        });

        const ai = getAIClient();

        try {
            const context = await ai.learnFromServer(message.guild, client);

            const embed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("🧠 AI Knowledge Updated")
                .setDescription("The AI assistant has learned from your server!")
                .addFields({ name: "📊 Server Info", value: [
                    `**Name:** ${context.serverName}`,
                    `**Members:** ${context.memberCount}`
                ].join('\n'), inline: true })
                .addFields({ name: "👥 Staff Roles Found", value: context.staffRoles.length > 0 
                        ? context.staffRoles.map(r => `${r.name} (${r.members})`).join('\n')
                        : 'None detected', 
                    inline: true })
                .addFields({ name: "📋 Data Collected", value: [
                    `**Rules Loaded:** ${context.rules?.length || 0} messages`,
                    `**Recent Cases:** ${context.recentCases?.length || 0}`,
                    `**Handbook Sections:** ${context.handbookSections?.length || 0}`
                ].join('\n') })
                .setFooter({ text: "Staff can now use ,ask to get context-aware answers!" })
                .setTimestamp();

            await loadingMsg.edit({ embeds: [embed] });

        } catch (error) {
            console.error('[AI Learn] Error:', error);
            await loadingMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Error")
                    .setDescription("Could not update AI knowledge. Please try again later.")
                ]
            });
        }
    }
};
