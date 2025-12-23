const { GoogleGenAI } = require("@google/genai");
const staffConstants = require("../constants/staff");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

class AdvancedAIAgent {
    constructor(client) {
        this.client = client;
        this.conversationCache = new Map();
        this.knowledgeBase = new Map();
        this.rateLimits = new Map();
        this.maxConversationHistory = 10;
        this.rateLimitWindow = 60000;
        this.maxRequestsPerWindow = 20;
        this.model = "gemini-2.0-flash";
    }

    async initialize(guildId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return;

        const knowledge = {
            serverName: guild.name,
            memberCount: guild.memberCount,
            rules: await this.fetchRules(guild),
            staffRanks: staffConstants.STAFF_RANKS,
            achievements: staffConstants.ACHIEVEMENTS,
            handbook: this.client.handbook?.get(guildId) || {},
            recentCases: await this.getRecentCases(guildId, 10),
            customEmojis: this.getServerEmojis(guild)
        };

        this.knowledgeBase.set(guildId, knowledge);
        return knowledge;
    }

    getServerEmojis(guild) {
        const emojis = {};
        guild.emojis.cache.forEach(emoji => {
            emojis[emoji.name.toLowerCase()] = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
        });
        return emojis;
    }

    async fetchRules(guild) {
        try {
            const rulesChannel = guild.rulesChannel || 
                guild.channels.cache.find(c => c.name.toLowerCase().includes('rules'));
            if (!rulesChannel) return "No rules channel found";
            
            const messages = await rulesChannel.messages.fetch({ limit: 10 });
            return messages.map(m => m.content).join('\n').substring(0, 2000);
        } catch (e) {
            return "Unable to fetch rules";
        }
    }

    async getRecentCases(guildId, limit) {
        try {
            const cases = this.client.modcases?.get(guildId) || [];
            return cases.slice(-limit);
        } catch (e) {
            return [];
        }
    }

    checkRateLimit(userId) {
        const now = Date.now();
        const userLimit = this.rateLimits.get(userId) || { count: 0, resetAt: now + this.rateLimitWindow };
        
        if (now > userLimit.resetAt) {
            userLimit.count = 0;
            userLimit.resetAt = now + this.rateLimitWindow;
        }
        
        if (userLimit.count >= this.maxRequestsPerWindow) {
            return { limited: true, resetIn: Math.ceil((userLimit.resetAt - now) / 1000) };
        }
        
        userLimit.count++;
        this.rateLimits.set(userId, userLimit);
        return { limited: false };
    }

    getConversationHistory(userId, guildId) {
        const key = `${guildId}-${userId}`;
        return this.conversationCache.get(key) || [];
    }

    addToConversation(userId, guildId, role, content) {
        const key = `${guildId}-${userId}`;
        const history = this.conversationCache.get(key) || [];
        history.push({ role, content, timestamp: Date.now() });
        
        while (history.length > this.maxConversationHistory) {
            history.shift();
        }
        
        this.conversationCache.set(key, history);
    }

    clearConversation(userId, guildId) {
        const key = `${guildId}-${userId}`;
        this.conversationCache.delete(key);
    }

    buildSystemPrompt(guildId, context = {}) {
        const knowledge = this.knowledgeBase.get(guildId) || {};
        const emojis = knowledge.customEmojis || {};
        const emojiList = Object.entries(emojis).slice(0, 20).map(([name, code]) => `${name}: ${code}`).join(', ');

        return `You are StaffBot AI, an advanced, enthusiastic, and helpful assistant for the "${knowledge.serverName || 'Discord'}" server!

YOUR PERSONALITY:
- You are EXCITING, ENGAGING, and POSITIVE in every response
- Use emojis liberally to make responses feel alive and fun
- Give DETAILED, COMPREHENSIVE answers - never short or dry
- Be encouraging and supportive - celebrate user achievements
- Sound like a knowledgeable friend, not a robot

SERVER KNOWLEDGE:
- Server: ${knowledge.serverName || 'Unknown'}
- Members: ${knowledge.memberCount || 'Unknown'}
- Staff Ranks: ${Object.values(staffConstants.STAFF_RANKS).map(r => `${r.emoji} ${r.name}`).join(', ')}

${knowledge.rules ? `SERVER RULES:\n${knowledge.rules.substring(0, 500)}` : ''}

${knowledge.handbook && Object.keys(knowledge.handbook).length > 0 ? 
`STAFF HANDBOOK SECTIONS: ${Object.keys(knowledge.handbook).join(', ')}` : ''}

SERVER EMOJIS YOU CAN USE: ${emojiList || 'Standard Discord emojis'}

${context.isStaff ? `
STAFF CONTEXT:
You're talking to a staff member. You can discuss:
- Moderation advice and best practices
- Ticket handling strategies
- Staff procedures and handbook content
- Server management tips
` : ''}

RESPONSE GUIDELINES:
1. Start responses with a relevant emoji
2. Use bullet points and formatting for clarity
3. Include encouragement and positive reinforcement
4. End with a helpful closing or offer for more help
5. Be thorough - users want FULL answers, not snippets
6. When discussing achievements, celebrate them!
7. Use server-specific emojis when available
8. Never give short, boring replies - make it EXCITING!

Remember: You're not just answering questions, you're creating a memorable, helpful experience!`;
    }

    async chat(userId, guildId, message, options = {}) {
        const rateCheck = this.checkRateLimit(userId);
        if (rateCheck.limited) {
            return {
                success: false,
                error: `Whoa there, speed racer! You've hit the rate limit. Try again in ${rateCheck.resetIn} seconds!`
            };
        }

        try {
            if (!this.knowledgeBase.has(guildId)) {
                await this.initialize(guildId);
            }

            const history = this.getConversationHistory(userId, guildId);
            const systemPrompt = this.buildSystemPrompt(guildId, options);

            const conversationText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
            const fullPrompt = `${systemPrompt}\n\nConversation History:\n${conversationText}\n\nUser: ${message}\n\nAssistant:`;

            const response = await genAI.models.generateContent({
                model: this.model,
                contents: fullPrompt,
            });

            const aiResponse = response.text;

            this.addToConversation(userId, guildId, "user", message);
            this.addToConversation(userId, guildId, "assistant", aiResponse);

            if (this.client.aiconversations) {
                const key = `${guildId}-${userId}`;
                this.client.aiconversations.set(key, {
                    history: this.getConversationHistory(userId, guildId),
                    lastActive: Date.now()
                });
            }

            return {
                success: true,
                response: aiResponse,
                tokensUsed: 0
            };

        } catch (error) {
            console.error("[AdvancedAI] Error:", error);
            
            return {
                success: false,
                error: this.getFallbackResponse(message),
                originalError: error.message
            };
        }
    }

    async analyzeSentiment(text) {
        try {
            const prompt = `Analyze the sentiment of the text. Respond with JSON only: { "sentiment": "positive/negative/neutral", "score": 0-100, "emotions": ["list", "of", "emotions"], "urgency": "low/medium/high" }

Text: ${text}`;

            const response = await genAI.models.generateContent({
                model: this.model,
                contents: prompt,
            });

            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { sentiment: "neutral", score: 50, emotions: [], urgency: "low" };
        } catch (error) {
            return { sentiment: "neutral", score: 50, emotions: [], urgency: "low" };
        }
    }

    async generateModerationAdvice(situation, guildId) {
        const knowledge = this.knowledgeBase.get(guildId) || {};
        
        try {
            const prompt = `You are an expert Discord moderator advisor. Provide detailed, actionable moderation advice.
                        
Server context: ${knowledge.serverName || 'Discord Server'}
Recent cases for reference: ${JSON.stringify(knowledge.recentCases?.slice(-3) || [])}

Provide advice that is:
1. Fair and consistent with past actions
2. Follows Discord ToS
3. Escalates appropriately
4. Documents properly
5. Uses emojis to make it engaging!

Moderation situation: ${situation}`;

            const response = await genAI.models.generateContent({
                model: this.model,
                contents: prompt,
            });

            return {
                success: true,
                advice: response.text
            };
        } catch (error) {
            return {
                success: false,
                advice: this.getDefaultModerationAdvice(situation)
            };
        }
    }

    async analyzeAppeal(caseId, guildId) {
        const cases = this.client.modcases?.get(guildId) || [];
        const targetCase = cases.find(c => c.id === caseId);
        
        if (!targetCase) {
            return { success: false, error: "Case not found" };
        }

        try {
            const prompt = `You are analyzing a ban/moderation appeal. Be fair but thorough.
                        
Provide:
1. Case summary
2. Severity assessment (1-10)
3. Key factors to consider
4. Recommendation (uphold, reduce, or overturn)
5. Suggested response to appellant

Be detailed and use emojis for an engaging analysis!

Case details: ${JSON.stringify(targetCase)}`;

            const response = await genAI.models.generateContent({
                model: this.model,
                contents: prompt,
            });

            return {
                success: true,
                analysis: response.text,
                caseData: targetCase
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async generateHandbook(guildId, sections = []) {
        const knowledge = this.knowledgeBase.get(guildId) || {};
        const defaultSections = [
            "Welcome & Introduction",
            "Staff Roles & Responsibilities", 
            "Ticket Handling Guide",
            "Moderation Guidelines",
            "Bot Management Basics",
            "Communication Standards",
            "Escalation Procedures",
            "Frequently Asked Questions"
        ];

        const sectionsToGenerate = sections.length > 0 ? sections : defaultSections;
        const handbook = {};

        for (const section of sectionsToGenerate) {
            try {
                const prompt = `You are creating a staff handbook section for "${knowledge.serverName || 'a Discord server'}".
                            
The handbook should be:
- Professional yet friendly
- Detailed and comprehensive
- Well-formatted with headers and bullet points
- Include relevant emojis
- Actionable with clear examples
- Encouraging to new staff members

Staff ranks available: ${Object.values(staffConstants.STAFF_RANKS).map(r => `${r.emoji} ${r.name}`).join(', ')}

Write the "${section}" section of the staff handbook. Make it detailed and helpful for new staff members.`;

                const response = await genAI.models.generateContent({
                    model: this.model,
                    contents: prompt,
                });

                handbook[section] = {
                    content: response.text,
                    generatedAt: Date.now(),
                    author: "AI"
                };

            } catch (error) {
                handbook[section] = {
                    content: this.getDefaultHandbookSection(section),
                    generatedAt: Date.now(),
                    author: "Template"
                };
            }
        }

        if (this.client.handbook) {
            this.client.handbook.set(guildId, handbook);
        }

        return handbook;
    }

    async learnFromServer(guildId) {
        const knowledge = await this.initialize(guildId);
        
        return {
            success: true,
            learned: {
                serverName: knowledge.serverName,
                memberCount: knowledge.memberCount,
                customEmojis: Object.keys(knowledge.customEmojis || {}).length,
                handbookSections: Object.keys(knowledge.handbook || {}).length,
                recentCases: (knowledge.recentCases || []).length
            },
            message: `Knowledge base updated! I've learned about ${knowledge.serverName} with ${knowledge.memberCount} members, ${Object.keys(knowledge.customEmojis || {}).length} custom emojis, and ${(knowledge.recentCases || []).length} recent moderation cases!`
        };
    }

    getFallbackResponse(message) {
        const lowercaseMsg = message.toLowerCase();
        
        if (lowercaseMsg.includes('help') || lowercaseMsg.includes('how')) {
            return `I'm having a bit of trouble connecting to my brain right now, but here are some general tips!\n\n` +
                `Check the \`,help\` command for all available commands\n` +
                `Use \`,handbook list\` to see staff guidelines\n` +
                `Ask a senior staff member for assistance\n\n` +
                `I'll be back to full power soon!`;
        }
        
        if (lowercaseMsg.includes('mod') || lowercaseMsg.includes('ban') || lowercaseMsg.includes('warn')) {
            return this.getDefaultModerationAdvice(message);
        }

        return `I'm experiencing some temporary connection issues, but I'm still here for you!\n\n` +
            `While I recover, here are some things you can try:\n` +
            `- Use \`,help\` to see all commands\n` +
            `- Check \`,handbook\` for guidelines\n` +
            `- Ask your fellow staff members\n\n` +
            `I'll be back stronger than ever!`;
    }

    getDefaultModerationAdvice(situation) {
        return `**Moderation Guidance**\n\n` +
            `Based on your situation, here's what I recommend:\n\n` +
            `**1. Assess the Severity**\n` +
            `- First offense? Consider a warning\n` +
            `- Repeat behavior? Escalate appropriately\n` +
            `- Serious violation? Immediate action may be needed\n\n` +
            `**2. Document Everything**\n` +
            `- Take screenshots of evidence\n` +
            `- Note the time and context\n` +
            `- Log the action with \`,warn\`, \`,timeout\`, or \`,ban\`\n\n` +
            `**3. Follow the Escalation Path**\n` +
            `Warning -> Timeout -> Temporary Ban -> Permanent Ban\n\n` +
            `**4. Communicate**\n` +
            `- Explain the reason to the user\n` +
            `- Be professional and fair\n\n` +
            `Need more specific advice? Describe the situation in detail!`;
    }

    getDefaultHandbookSection(section) {
        const defaults = {
            "Welcome & Introduction": `# Welcome to the Staff Team!\n\nCongratulations on joining our amazing staff team! We're thrilled to have you on board.\n\n## What to Expect\n- A supportive team environment\n- Training and mentorship opportunities\n- Room to grow and advance\n\n## Your First Steps\n1. Read through this entire handbook\n2. Introduce yourself in the staff chat\n3. Shadow experienced staff members\n4. Ask questions - we love them!\n\nWelcome aboard!`,
            "Staff Roles & Responsibilities": `# Staff Roles & Responsibilities\n\n## Trainee\n- Learn the ropes\n- Observe ticket handling\n- Ask lots of questions\n\n## Junior Staff\n- Handle basic tickets\n- Assist with moderation\n- Support senior staff\n\n## Senior Staff\n- Create and manage bots\n- Train junior staff\n- Handle complex issues\n\n## Lead Staff\n- Approve LOA requests\n- Promote team members\n- Oversee operations\n\n## Manager\n- Full administrative access\n- Strategic decisions\n- Team leadership`,
            "default": `# ${section}\n\nThis section is being prepared. Check back soon for detailed information!\n\nIn the meantime, feel free to ask senior staff members for guidance on this topic.`
        };

        return defaults[section] || defaults["default"];
    }
}

module.exports = AdvancedAIAgent;
