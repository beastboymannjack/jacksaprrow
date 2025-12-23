const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GeminiAdvisor = require('../../ai/geminiClient');
const mainconfig = require("../../../mainconfig.js");
const { truncateForEmbed, truncateForField } = require('../../utilfunctions');

let aiClient = null;

function getAIClient() {
    if (!aiClient) {
        aiClient = new GeminiAdvisor();
    }
    return aiClient;
}

function hasModRole(member) {
    const modRoles = [
        mainconfig.ServerRoles?.SupporterRoleId,
        mainconfig.ServerRoles?.BotCreatorRoleId,
        mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
        mainconfig.ServerRoles?.FounderId
    ].filter(Boolean);
    
    return modRoles.some(roleId => member.roles.cache.has(roleId)) || 
           member.permissions.has("ADMINISTRATOR");
}

module.exports = {
    name: "ai",
    description: "AI-powered moderation advisor",
    usage: "ai <help|suggest|analyze> [situation]",
    aliases: ["advisor", "aihelp"],

    run: async (client, message, args) => {
        if (!hasModRole(message.member)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Permission Denied")
                    .setDescription("Only staff members can use the AI advisor.")
                ]
            });
        }

        const subcommand = args[0]?.toLowerCase();
        const ai = getAIClient();

        if (!subcommand || subcommand === 'help') {
            const situation = args.slice(1).join(' ');

            if (!situation) {
                const menuEmbed = new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("🤖 AI Moderation Advisor")
                    .setDescription("Get real-time AI-powered advice for moderation situations.\n\n**What's happening?**\nSelect a situation below or describe it yourself.")
                    .addFields({ name: "💡 Quick Help", value: "`ai help <situation>` - Describe your situation\n`ai suggest <situation>` - Get suggestions\n`ai analyze-appeal <case_id>` - Analyze an appeal" })
                    .setFooter({ text: "Powered by AI • Staff Management System" });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('ai_raid')
                            .setLabel('Raid')
                            .setEmoji('🚨')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('ai_spam')
                            .setLabel('Spam')
                            .setEmoji('📢')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('ai_toxic')
                            .setLabel('Toxic Behavior')
                            .setEmoji('😡')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('ai_appeal')
                            .setLabel('Appeal Help')
                            .setEmoji('❓')
                            .setStyle(ButtonStyle.Secondary)
                    );

                const menuMsg = await message.reply({ embeds: [menuEmbed], components: [row] });

                const collector = menuMsg.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 60000
                });

                collector.on('collect', async (interaction) => {
                    const situations = {
                        'ai_raid': 'We are being raided by multiple accounts',
                        'ai_spam': 'A user is spamming in our channels',
                        'ai_toxic': 'A user is being toxic and harassing others',
                        'ai_appeal': 'How should I handle a ban appeal'
                    };

                    const situationText = situations[interaction.customId];
                    
                    await interaction.update({
                        embeds: [new EmbedBuilder()
                            .setColor("#FEE75C")
                            .setTitle("🤖 Processing...")
                            .setDescription("Getting AI advice for your situation...")
                        ],
                        components: []
                    });

                    const result = await ai.getSuggestion(situationText, {
                        serverType: 'community'
                    }, {
                        userID: message.author.id
                    });

                    const responseEmbed = new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("🤖 AI Advice")
                        .setDescription(truncateForEmbed(result.suggestion || result.fallbackMessage))
                        .setFooter({ text: result.fallback ? "Fallback Response" : "Powered by AI" })
                        .setTimestamp();

                    if (result.error) {
                        responseEmbed.addFields({ name: "⚠️ Note", value: truncateForField(result.error) });
                    }

                    await menuMsg.edit({ embeds: [responseEmbed], components: [] });
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        const disabledRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId('ai_raid').setLabel('Raid').setEmoji('🚨').setStyle(ButtonStyle.Danger).setDisabled(true),
                                new ButtonBuilder().setCustomId('ai_spam').setLabel('Spam').setEmoji('📢').setStyle(ButtonStyle.Primary).setDisabled(true),
                                new ButtonBuilder().setCustomId('ai_toxic').setLabel('Toxic Behavior').setEmoji('😡').setStyle(ButtonStyle.Primary).setDisabled(true),
                                new ButtonBuilder().setCustomId('ai_appeal').setLabel('Appeal Help').setEmoji('❓').setStyle(ButtonStyle.Secondary).setDisabled(true)
                            );
                        menuMsg.edit({ components: [disabledRow] }).catch(() => {});
                    }
                });

                return;
            }

            const loadingMsg = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("🤖 Processing...")
                    .setDescription("Getting AI advice for your situation...")
                ]
            });

            const result = await ai.getSuggestion(situation, {
                serverType: 'community'
            }, {
                userID: message.author.id
            });

            const responseEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle("🤖 AI Advice")
                .addFields({ name: "📝 Your Situation", value: truncateForField(situation, 200) })
                .setDescription(truncateForEmbed(result.suggestion || result.fallbackMessage))
                .setFooter({ text: result.fallback ? "Fallback Response • May not be fully accurate" : "Powered by AI" })
                .setTimestamp();

            if (result.error && !result.fallback) {
                responseEmbed.setColor("#ED4245");
                responseEmbed.addFields({ name: "⚠️ Error", value: result.error });
            }

            await loadingMsg.edit({ embeds: [responseEmbed] });
        }

        else if (subcommand === 'suggest') {
            const situation = args.slice(1).join(' ');

            if (!situation) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Missing Situation")
                        .setDescription("Please describe the situation you need suggestions for.\n\n**Usage:** `ai suggest <situation>`\n\n**Example:** `ai suggest user keeps evading bans`")
                    ]
                });
            }

            const loadingMsg = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("🤖 Generating Suggestions...")
                    .setDescription("AI is analyzing the situation...")
                ]
            });

            const result = await ai.getSuggestion(situation, {
                serverType: 'community'
            }, {
                userID: message.author.id
            });

            const responseEmbed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("💡 AI Suggestions")
                .addFields({ name: "📝 Situation", value: truncateForField(situation, 200) })
                .setDescription(truncateForEmbed(result.suggestion || result.fallbackMessage))
                .setFooter({ text: result.fallback ? "Fallback Response" : "Powered by AI" })
                .setTimestamp();

            await loadingMsg.edit({ embeds: [responseEmbed] });
        }

        else if (subcommand === 'analyze-appeal') {
            const caseId = args[1]?.toUpperCase();

            if (!caseId) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Missing Case ID")
                        .setDescription("Please provide a case ID to analyze.\n\n**Usage:** `ai analyze-appeal MOD-001`")
                    ]
                });
            }

            const caseData = client.modcases.get(caseId);
            if (!caseData || caseId === 'counter') {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Case Not Found")
                        .setDescription(`No case found with ID \`${caseId}\`.`)
                    ]
                });
            }

            const loadingMsg = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("🤖 Analyzing Appeal...")
                    .setDescription("AI is reviewing the case and appeal...")
                ]
            });

            const warningsKey = `${message.guild.id}-${caseData.user}`;
            const warnings = client.warnings.get(warningsKey) || [];
            
            const userHistory = {
                userID: caseData.user,
                totalWarnings: warnings.length,
                caseType: caseData.type,
                reason: caseData.reason
            };

            const appealContent = `Case ${caseId}: User was ${caseData.type}ed for: ${caseData.reason}. They have ${warnings.length} total infractions on record.`;

            const result = await ai.analyzeAppeal(appealContent, userHistory, []);

            const targetUser = await client.users.fetch(caseData.user).catch(() => null);

            const responseEmbed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(`🔍 Appeal Analysis: ${caseId}`)
                .addFields({ name: "👤 User", value: targetUser ? targetUser.tag : `<@${caseData.user}>`, inline: true })
                .addFields({ name: "📝 Original Action", value: caseData.type.toUpperCase(), inline: true })
                .addFields({ name: "⚠️ Total Infractions", value: `${warnings.length}`, inline: true })
                .addFields({ name: "📋 Original Reason", value: truncateForField(caseData.reason) })
                .setDescription(truncateForEmbed(result.analysis || "Unable to generate analysis"))
                .setFooter({ text: result.fallback ? "Template Analysis • Review manually" : "AI Analysis • Staff vote required" })
                .setTimestamp();

            if (result.recommendation) {
                responseEmbed.addFields({ name: "💡 Recommendation", value: truncateForField(result.recommendation) });
            }

            await loadingMsg.edit({ embeds: [responseEmbed] });
        }

        else {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Unknown Command")
                    .setDescription("**Available AI commands:**\n`ai help [situation]` - Get moderation advice\n`ai suggest <situation>` - Get suggestions\n`ai analyze-appeal <case_id>` - Analyze a ban appeal")
                ]
            });
        }
    }
};
