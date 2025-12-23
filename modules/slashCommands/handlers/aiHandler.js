const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const GeminiAdvisor = require('../../ai/geminiClient');
const { GoogleGenAI } = require('@google/genai');

function getAIClient() {
    console.log('[AI Handler] Creating fresh GeminiAdvisor instance, API key present:', !!process.env.GEMINI_API_KEY);
    return new GeminiAdvisor();
}

async function callGemini(messages, maxTokens = 1000) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { error: 'GEMINI_API_KEY is not configured. Please add it to your environment secrets.' };
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        
        let prompt = '';
        if (systemMessage) {
            prompt = `Instructions: ${systemMessage.content}\n\n`;
        }
        prompt += userMessages.map(m => {
            if (typeof m.content === 'string') {
                return `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`;
            }
            const textPart = m.content.find(p => p.type === 'text');
            return textPart ? `${m.role === 'user' ? 'User' : 'Assistant'}: ${textPart.text}` : '';
        }).join('\n\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return { content: response.text || "No response generated." };
    } catch (error) {
        console.error('Gemini API Error:', error);
        let errorMsg = error.message || 'Unknown error';
        if (errorMsg.includes('429')) {
            errorMsg = 'Gemini API quota exceeded. Please check your Google AI Studio account for credits/billing.';
        } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
            errorMsg = 'Invalid or expired API key. Please check your GEMINI_API_KEY.';
        } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
            errorMsg = 'Network error. Unable to connect to Gemini API.';
        }
        return { error: errorMsg };
    }
}

async function handleAICommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply();

    switch (subcommand) {
        case 'chat': {
            const message = interaction.options.getString('message');
            
            const conversationKey = `${interaction.guild.id}-${interaction.user.id}`;
            client.aiconversations.ensure(conversationKey, { messages: [], lastUsed: 0 });
            
            const conversation = client.aiconversations.get(conversationKey);
            
            if (Date.now() - conversation.lastUsed > 30 * 60 * 1000) {
                conversation.messages = [];
            }
            
            conversation.messages.push({ role: 'user', content: message });
            if (conversation.messages.length > 20) {
                conversation.messages = conversation.messages.slice(-20);
            }

            const systemPrompt = `You are an advanced AI assistant for a Discord server called "${interaction.guild.name}". 
You are helpful, friendly, and knowledgeable. You can help with:
- Server moderation advice
- Bot management questions
- General programming help
- Creative tasks and brainstorming
- Answering questions

Keep responses concise but helpful. Use Discord markdown formatting.
Current user: ${interaction.user.username}
Server member count: ${interaction.guild.memberCount}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversation.messages
            ];

            const result = await callGemini(messages, 1500);

            if (result.error) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('AI Error')
                        .setDescription(result.error)
                        .setFooter({ text: 'Contact the bot owner if this issue persists' })
                    ]
                });
            }

            conversation.messages.push({ role: 'assistant', content: result.content });
            conversation.lastUsed = Date.now();
            client.aiconversations.set(conversationKey, conversation);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: 'AI Assistant', iconURL: client.user.displayAvatarURL() })
                .setDescription(result.content.substring(0, 4000))
                .setFooter({ text: `Asked by ${interaction.user.username} • Conversation active for 30 mins` })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ai_continue')
                        .setLabel('Continue')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💬'),
                    new ButtonBuilder()
                        .setCustomId('ai_clear')
                        .setLabel('Clear History')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🗑️')
                );

            await interaction.editReply({ embeds: [embed], components: [row] });
            break;
        }

        case 'code': {
            const code = interaction.options.getString('code');
            const language = interaction.options.getString('language') || 'auto-detect';

            const result = await callGemini([
                {
                    role: 'system',
                    content: `You are an expert code reviewer and programming assistant. 
Analyze the provided code and:
1. Identify any bugs or issues
2. Suggest improvements
3. Explain what the code does
4. Rate code quality (1-10)

Format your response with clear sections using Discord markdown.
Language hint: ${language}`
                },
                { role: 'user', content: `Review this code:\n\`\`\`\n${code}\n\`\`\`` }
            ], 2000);

            if (result.error) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('Code Review Error')
                        .setDescription(result.error)
                        .setFooter({ text: 'Contact the bot owner if this issue persists' })
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Code Review')
                .setDescription(result.content.substring(0, 4000))
                .addFields({ name: 'Code Submitted', value: `\`\`\`${language !== 'auto-detect' ? language : ''}\n${code.substring(0, 500)}${code.length > 500 ? '...' : ''}\n\`\`\`` })
                .setFooter({ text: `Reviewed for ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
        }

        case 'translate': {
            const text = interaction.options.getString('text');
            const targetLang = interaction.options.getString('language');

            const langNames = {
                en: 'English', es: 'Spanish', fr: 'French', de: 'German',
                zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic',
                hi: 'Hindi', pt: 'Portuguese'
            };

            const result = await callGemini([
                {
                    role: 'system',
                    content: `You are a professional translator. Translate the following text to ${langNames[targetLang]}. 
Only output the translation, nothing else. Preserve formatting and tone.`
                },
                { role: 'user', content: text }
            ], 1000);

            if (result.error) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('Translation Error')
                        .setDescription(result.error)
                        .setFooter({ text: 'Contact the bot owner if this issue persists' })
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`Translation to ${langNames[targetLang]}`)
                .addFields(
                    { name: 'Original', value: text.substring(0, 1000) },
                    { name: `${langNames[targetLang]}`, value: result.content.substring(0, 1000) }
                )
                .setFooter({ text: `Translated for ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
        }

        case 'summarize': {
            const text = interaction.options.getString('text');
            const messageCount = interaction.options.getInteger('messages');

            let contentToSummarize = text;

            if (!text && messageCount) {
                const messages = await interaction.channel.messages.fetch({ limit: Math.min(messageCount, 100) });
                contentToSummarize = messages
                    .filter(m => !m.author.bot)
                    .map(m => `${m.author.username}: ${m.content}`)
                    .reverse()
                    .join('\n');
            }

            if (!contentToSummarize) {
                return interaction.editReply({
                    content: 'Please provide text to summarize or specify a number of messages!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const result = await callGemini([
                {
                    role: 'system',
                    content: 'You are a skilled summarizer. Create a concise but comprehensive summary. Include key points as bullet points. Use Discord markdown formatting.'
                },
                { role: 'user', content: `Summarize this:\n\n${contentToSummarize.substring(0, 10000)}` }
            ], 1000);

            if (result.error) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('Summary Error')
                        .setDescription(result.error)
                        .setFooter({ text: 'Contact the bot owner if this issue persists' })
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Summary')
                .setDescription(result.content.substring(0, 4000))
                .setFooter({ text: messageCount ? `Summarized ${messageCount} messages` : 'Text summary' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
        }

        case 'advisor': {
            const situation = interaction.options.getString('situation');

            const ai = getAIClient();
            await ai.learnFromServer(interaction.guild, client);

            const result = await ai.getSuggestion(situation, {
                guildId: interaction.guild.id,
                serverType: 'discord'
            }, { userID: interaction.user.id });

            if (result.error && result.error.includes('429')) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('Gemini Quota Exceeded')
                    .setDescription('Your Gemini API key has no credits/quota remaining. Please check your Google AI Studio account.')
                    .addFields({ name: 'Situation', value: situation.substring(0, 500) })
                    .setFooter({ text: 'Error: ' + result.error })
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
                break;
            }

            if (result.error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('Moderation Advisor Error')
                    .setDescription(result.error)
                    .addFields({ name: 'Situation', value: situation.substring(0, 500) })
                    .setFooter({ text: 'Contact the bot owner if this issue persists' })
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
                break;
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Moderation Advisor')
                .setDescription(result.suggestion || 'No advice available.')
                .addFields({ name: 'Situation', value: situation.substring(0, 500) })
                .setFooter({ text: 'AI-Powered advice' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
        }

        case 'image': {
            const imageUrl = interaction.options.getString('url');
            const question = interaction.options.getString('question') || 'Describe this image in detail';

            const result = await callGemini([
                {
                    role: 'system',
                    content: 'You are an expert at analyzing images. Describe what you see clearly and answer any questions about the image.'
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `${question}\n\nImage URL: ${imageUrl}` }
                    ]
                }
            ], 1000);

            if (result.error) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('Image Analysis Error')
                        .setDescription(result.error)
                        .setFooter({ text: 'Make sure the image URL is valid and accessible' })
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Image Analysis')
                .setDescription(result.content.substring(0, 4000))
                .setThumbnail(imageUrl)
                .addFields({ name: 'Question', value: question })
                .setFooter({ text: `Analyzed for ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
        }
    }
}

async function handleQuizCommand(interaction, client) {
    await interaction.deferReply();

    const topic = interaction.options.getString('topic') || 'general knowledge';
    const difficulty = interaction.options.getString('difficulty') || 'medium';

    const result = await callGemini([
        {
            role: 'system',
            content: `Generate a quiz question about ${topic} at ${difficulty} difficulty.
Format EXACTLY like this (use this exact format):
QUESTION: [question text]
A) [option 1]
B) [option 2]
C) [option 3]
D) [option 4]
CORRECT: [A, B, C, or D]
EXPLANATION: [brief explanation]`
        },
        { role: 'user', content: 'Generate a quiz question' }
    ], 500);

    if (result.error) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('Quiz Error')
                .setDescription(result.error)
                .setFooter({ text: 'Contact the bot owner if this issue persists' })
            ]
        });
    }

    const content = result.content;
    const questionMatch = content.match(/QUESTION:\s*(.+?)(?=\nA\))/s);
    const optionA = content.match(/A\)\s*(.+?)(?=\nB\))/s);
    const optionB = content.match(/B\)\s*(.+?)(?=\nC\))/s);
    const optionC = content.match(/C\)\s*(.+?)(?=\nD\))/s);
    const optionD = content.match(/D\)\s*(.+?)(?=\nCORRECT:)/s);
    const correctMatch = content.match(/CORRECT:\s*([ABCD])/);
    const explanationMatch = content.match(/EXPLANATION:\s*(.+)/s);

    const question = questionMatch?.[1]?.trim() || 'Question not parsed';
    const options = {
        A: optionA?.[1]?.trim() || 'Option A',
        B: optionB?.[1]?.trim() || 'Option B',
        C: optionC?.[1]?.trim() || 'Option C',
        D: optionD?.[1]?.trim() || 'Option D'
    };
    const correct = correctMatch?.[1] || 'A';
    const explanation = explanationMatch?.[1]?.trim() || 'No explanation available';

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`Quiz Time! - ${topic}`)
        .setDescription(`**${question}**`)
        .addFields(
            { name: 'Options', value: `A) ${options.A}\nB) ${options.B}\nC) ${options.C}\nD) ${options.D}` },
            { name: 'Difficulty', value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1), inline: true },
            { name: 'Time Limit', value: '30 seconds', inline: true }
        )
        .setFooter({ text: 'Click a button to answer!' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('quiz_A').setLabel('A').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quiz_B').setLabel('B').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quiz_C').setLabel('C').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quiz_D').setLabel('D').setStyle(ButtonStyle.Primary)
        );

    const quizMessage = await interaction.editReply({ embeds: [embed], components: [row] });

    const answered = new Set();
    const scores = {};

    const collector = quizMessage.createMessageComponentCollector({
        filter: (i) => i.customId.startsWith('quiz_'),
        time: 30000
    });

    collector.on('collect', async (i) => {
        if (answered.has(i.user.id)) {
            return i.reply({ content: 'You already answered!', flags: MessageFlags.Ephemeral });
        }

        answered.add(i.user.id);
        const answer = i.customId.replace('quiz_', '');
        const isCorrect = answer === correct;

        if (isCorrect) {
            scores[i.user.id] = true;
            
            client.levels.ensure(`${interaction.guild.id}-${i.user.id}`, { xp: 0, level: 0, messages: 0, lastMessage: 0, voiceTime: 0 });
            const data = client.levels.get(`${interaction.guild.id}-${i.user.id}`);
            data.xp += 25;
            client.levels.set(`${interaction.guild.id}-${i.user.id}`, data);

            await i.reply({ 
                content: `Correct! You earned **25 XP**!`, 
                flags: MessageFlags.Ephemeral 
            });
        } else {
            await i.reply({ 
                content: `Wrong! The correct answer was **${correct}**.`, 
                flags: MessageFlags.Ephemeral 
            });
        }
    });

    collector.on('end', async () => {
        const winners = Object.keys(scores);
        
        const resultEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('Quiz Results!')
            .setDescription(`**Question:** ${question}\n\n**Correct Answer:** ${correct}) ${options[correct]}`)
            .addFields(
                { name: 'Explanation', value: explanation },
                { name: 'Winners', value: winners.length > 0 
                    ? winners.map(id => `<@${id}>`).join(', ') + ' (+25 XP each)'
                    : 'No correct answers!'
                }
            )
            .setTimestamp();

        await quizMessage.edit({ embeds: [resultEmbed], components: [] });
    });
}

async function handlePersonalityCommand(interaction, client) {
    const style = interaction.options.getString('style');

    client.serversettings.ensure(interaction.guild.id, { aiPersonality: 'helpful' });
    const settings = client.serversettings.get(interaction.guild.id);
    settings.aiPersonality = style;
    client.serversettings.set(interaction.guild.id, settings);

    const styles = {
        professional: 'Professional - Formal and business-like responses',
        friendly: 'Friendly - Warm and approachable tone',
        funny: 'Funny - Includes humor and jokes',
        serious: 'Serious - Direct and to-the-point',
        helpful: 'Helpful - Detailed and supportive'
    };

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('AI Personality Updated')
        .setDescription(`The AI will now respond in a **${style}** manner.`)
        .addFields({ name: 'Style Description', value: styles[style] })
        .setFooter({ text: `Changed by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = { handleAICommand, handleQuizCommand, handlePersonalityCommand, callGemini };
