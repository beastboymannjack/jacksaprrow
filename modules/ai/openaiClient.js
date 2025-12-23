const { GoogleGenAI } = require("@google/genai");

class AIAdvisor {
    constructor(apiKey, model = "gemini-2.0-flash") {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY;
        this.model = model;
        this.rateLimit = new Map();
        this.maxCallsPerHour = 20;
        this.responseCache = new Map();
        this.enabled = !!this.apiKey;
        this.serverContext = new Map();
        
        if (this.enabled) {
            this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
        }
    }

    checkRateLimit(userID) {
        const now = Date.now();
        const userCalls = this.rateLimit.get(userID) || [];
        const recentCalls = userCalls.filter(time => now - time < 3600000);
        
        if (recentCalls.length >= this.maxCallsPerHour) {
            return false;
        }
        
        recentCalls.push(now);
        this.rateLimit.set(userID, recentCalls);
        return true;
    }

    setServerContext(guildId, context) {
        this.serverContext.set(guildId, {
            ...this.serverContext.get(guildId),
            ...context,
            lastUpdated: new Date()
        });
    }

    getServerContext(guildId) {
        return this.serverContext.get(guildId) || {};
    }

    async learnFromServer(guild, client) {
        const context = {
            serverName: guild.name,
            memberCount: guild.memberCount,
            rules: [],
            staffRoles: [],
            recentCases: [],
            handbookSections: []
        };

        const rulesChannel = guild.channels.cache.find(c => 
            c.name.toLowerCase().includes('rule') || c.name.toLowerCase().includes('info')
        );
        if (rulesChannel && rulesChannel.isTextBased && rulesChannel.isTextBased()) {
            try {
                const messages = await rulesChannel.messages.fetch({ limit: 10 });
                context.rules = messages.map(m => m.content.substring(0, 500)).filter(c => c.length > 20);
            } catch (e) {}
        }

        const staffRoleNames = ['staff', 'mod', 'admin', 'support', 'helper', 'creator'];
        context.staffRoles = guild.roles.cache
            .filter(r => staffRoleNames.some(name => r.name.toLowerCase().includes(name)))
            .map(r => ({ name: r.name, members: r.members.size }));

        if (client.modcases) {
            const allCases = client.modcases.fetchEverything();
            const guildCases = [];
            allCases.forEach((data, key) => {
                if (key !== 'counter' && !key.includes('-counter') && data.guild === guild.id) {
                    guildCases.push({ type: data.type, reason: data.reason?.substring(0, 100) });
                }
            });
            context.recentCases = guildCases.slice(-20);
        }

        if (client.handbook) {
            const handbook = client.handbook.get(guild.id) || {};
            context.handbookSections = Object.keys(handbook);
        }

        this.setServerContext(guild.id, context);
        return context;
    }

    async askQuestion(question, guildId, userHistory = {}) {
        if (!this.enabled) {
            return {
                error: "AI features not configured",
                fallback: true,
                answer: this.getFallbackAnswer(question)
            };
        }

        try {
            if (!this.checkRateLimit(userHistory.userID || 'default')) {
                return {
                    error: "Rate limit exceeded. Max 20 API calls per hour.",
                    fallback: true,
                    answer: this.getFallbackAnswer(question)
                };
            }

            const serverCtx = this.getServerContext(guildId);
            
            const systemPrompt = `You are a helpful AI assistant for Discord server staff. You have knowledge about this server:
Server Name: ${serverCtx.serverName || 'Unknown'}
Member Count: ${serverCtx.memberCount || 'Unknown'}
Staff Roles: ${serverCtx.staffRoles?.map(r => r.name).join(', ') || 'None learned'}
Handbook Sections: ${serverCtx.handbookSections?.join(', ') || 'None'}
Server Rules Summary: ${serverCtx.rules?.slice(0, 3).join('\n') || 'Not loaded'}

Recent Moderation Patterns: ${serverCtx.recentCases?.slice(0, 5).map(c => c.type).join(', ') || 'None'}

Provide helpful, concise answers to staff questions. If asked about server-specific things you don't know, say so honestly.`;

            const response = await this.genAI.models.generateContent({
                model: this.model,
                contents: `${systemPrompt}\n\nUser Question: ${question}`,
            });

            return {
                answer: response.text,
                serverContext: !!serverCtx.serverName,
                timestamp: new Date(),
                source: 'gemini'
            };

        } catch (error) {
            console.error("AI Question Error:", error);
            return {
                error: "AI temporarily unavailable",
                fallback: true,
                answer: this.getFallbackAnswer(question)
            };
        }
    }

    async getSuggestion(situation, serverContext = {}, userHistory = {}) {
        if (!this.enabled || !this.apiKey) {
            console.warn('[AI Advisor] API not enabled or no API key');
            return {
                error: "AI features not configured",
                fallback: true,
                fallbackMessage: this.getFallbackSuggestion(situation)
            };
        }

        try {
            if (!this.checkRateLimit(userHistory.userID || 'default')) {
                console.warn('[AI Advisor] Rate limit exceeded for user:', userHistory.userID);
                return {
                    error: "Rate limit exceeded. Max 20 API calls per hour.",
                    fallback: true,
                    fallbackMessage: this.getFallbackSuggestion(situation)
                };
            }

            const guildContext = serverContext.guildId ? this.getServerContext(serverContext.guildId) : {};
            
            console.log('[AI Advisor] Calling Gemini for situation:', situation.substring(0, 50));

            const prompt = `You are an expert Discord server moderator advisor giving UNIQUE, SPECIFIC advice for EACH situation. NEVER reuse templates. Every response must be different and tailored to the exact situation described. Provide clear, actionable, step-by-step guidance. Format response with numbered steps. Be creative and specific to the situation.

Moderation Situation to Respond To:
${situation}

Server: ${serverContext.serverType || 'general'}

IMPORTANT: Provide UNIQUE advice for THIS SPECIFIC situation. Do NOT provide generic templates. Generate fresh, specific, actionable steps.`;

            const response = await this.genAI.models.generateContent({
                model: this.model,
                contents: prompt,
            });

            const suggestion = response.text;
            
            if (!suggestion) {
                throw new Error('No content in Gemini response');
            }

            console.log('[AI Advisor] Successfully generated response');
            
            const result = {
                suggestion: suggestion,
                serverType: serverContext.serverType,
                timestamp: new Date(),
                source: 'gemini',
                fallback: false
            };

            return result;

        } catch (error) {
            console.error("[AI Advisor] Gemini API Error:", error.message);
            console.error("[AI Advisor] Full error:", error);
            return {
                error: error.message,
                fallback: true,
                fallbackMessage: this.getFallbackSuggestion(situation)
            };
        }
    }

    async analyzeAppeal(appealContent, userHistory = {}, caseHistory = []) {
        if (!this.enabled) {
            return {
                error: "AI features not configured",
                fallback: true,
                analysis: this.getFallbackAppealAnalysis(appealContent)
            };
        }

        try {
            if (!this.checkRateLimit(userHistory.userID || 'default')) {
                return { 
                    error: "Rate limit exceeded",
                    fallback: true,
                    analysis: this.getFallbackAppealAnalysis(appealContent)
                };
            }

            const prompt = `You are an expert at analyzing ban appeals. Provide fair, balanced analysis considering context and tone. Be objective and professional.

Ban Appeal: "${appealContent}"

User History: ${JSON.stringify(userHistory)}

Analyze this appeal and provide a recommendation.`;

            const response = await this.genAI.models.generateContent({
                model: this.model,
                contents: prompt,
            });

            return {
                analysis: response.text,
                recommendation: "Review and let staff vote",
                timestamp: new Date(),
                source: 'gemini'
            };

        } catch (error) {
            console.error("Appeal Analysis Error:", error);
            return { 
                error: "Could not analyze appeal",
                fallback: true,
                analysis: this.getFallbackAppealAnalysis(appealContent)
            };
        }
    }

    async generateTaskSteps(taskDescription, staffAvailable = []) {
        if (!this.enabled) {
            return {
                error: "AI features not configured",
                fallback: true,
                steps: this.getFallbackTaskSteps(taskDescription)
            };
        }

        try {
            const prompt = `Generate clear, numbered action steps for Discord moderation tasks. Be specific and executable.

Task: ${taskDescription}

Generate numbered action steps to complete this task.`;

            const response = await this.genAI.models.generateContent({
                model: this.model,
                contents: prompt,
            });

            return {
                steps: response.text,
                taskID: `TASK-${Date.now()}`,
                timestamp: new Date(),
                source: 'gemini'
            };

        } catch (error) {
            console.error("Task Generation Error:", error);
            return { 
                error: "Could not generate task steps",
                fallback: true,
                steps: this.getFallbackTaskSteps(taskDescription)
            };
        }
    }

    getFallbackAnswer(question) {
        const questionLower = question.toLowerCase();
        
        if (questionLower.includes('warn') || questionLower.includes('warning')) {
            return "To warn a user, use `,warn @user <reason>`. Warnings are tracked and contribute to the strike system. After 3 strikes, a user gets timed out. After 5 strikes, they get banned automatically.";
        }
        if (questionLower.includes('ban') || questionLower.includes('unban')) {
            return "Use `,ban @user <reason>` to ban and `,unban <userId> [reason]` to unban. Check case history with `,history @user` before making decisions.";
        }
        if (questionLower.includes('loa') || questionLower.includes('leave')) {
            return "Use `,loa start 1w personal` to start a leave. You can use durations like `1d`, `3d`, `1w`, `2w`. Use `,loa end` when you return and `,loa status` to see who's away.";
        }
        if (questionLower.includes('handbook') || questionLower.includes('guide')) {
            return "Check the staff handbook with `,handbook list` to see available sections. Use `,handbook read <section>` to read a specific section.";
        }
        
        return "I don't have enough context to answer that question. Please ask a senior staff member or check the handbook with `,handbook list`.";
    }

    getFallbackSuggestion(situation) {
        const situationLower = situation.toLowerCase();
        
        const fallbacks = {
            raid: `**Raid Response Protocol:**
1. **Immediately** enable slowmode (10-30 seconds) on affected channels
2. **Lock** the channels being targeted using channel permissions
3. **Ban** accounts that are clearly raid bots (new accounts, similar names)
4. Use \`/purge\` to remove spam messages if available
5. **Monitor** for continued activity for the next 30 minutes
6. Consider temporarily restricting new member permissions
7. Document the incident for future reference`,

            spam: `**Spam Response Protocol:**
1. **Delete** the spam messages immediately
2. **Warn** the user with a clear explanation
3. **Enable** slowmode if they continue (5-10 seconds)
4. **Timeout** if warnings are ignored (1-24 hours)
5. **Monitor** the user's future behavior
6. Consider adding a word filter for common spam patterns`,

            toxic: `**Toxicity Response Protocol:**
1. **Document** the toxic messages (screenshot if needed)
2. **Warn** the user and explain which rule was broken
3. **Delete** harmful messages to prevent escalation
4. If severe, apply an immediate **timeout** (1-24 hours)
5. Consider whether other users need support/reassurance
6. Escalate to senior staff for repeat offenders`,

            appeal: `**Appeal Review Protocol:**
1. **Review** the original case and reason for punishment
2. **Check** the user's overall history and behavior pattern
3. **Analyze** the appeal tone - is it sincere or deflecting?
4. **Consider** the severity of the original offense
5. **Discuss** with other staff members if unsure
6. **Vote** on the appeal decision as a team
7. **Respond** to the user with a clear decision and reasoning`,

            harassment: `**Harassment Response Protocol:**
1. **Document** all harassment evidence
2. **Remove** the user from channels where harassment occurred
3. **Support** the victim privately via DM if appropriate
4. Issue a **warning** or **timeout** based on severity
5. **Ban** for severe or repeated harassment
6. Inform the victim of actions taken (if they wish)`,

            default: `**General Moderation Guidance:**
1. **Assess** the situation calmly and objectively
2. **Document** evidence before taking action
3. **Warn** for minor first-time offenses
4. **Escalate** punishments for repeat offenders
5. **Communicate** clearly with all parties involved
6. **Consult** senior staff for complex situations
7. **Log** all actions taken for transparency`
        };

        for (const [key, response] of Object.entries(fallbacks)) {
            if (situationLower.includes(key)) {
                return response;
            }
        }

        return fallbacks.default;
    }

    getFallbackAppealAnalysis(appealContent) {
        return `**Appeal Analysis (Template):**

**Appeal Content:** "${appealContent.substring(0, 200)}${appealContent.length > 200 ? '...' : ''}"

**Considerations:**
- Check if the user acknowledges their mistake
- Review their account history and previous behavior
- Consider the time elapsed since the offense
- Evaluate the sincerity of their appeal

**Recommendation:** Review this appeal manually with your staff team. Consider the context and make a collective decision.`;
    }

    getFallbackTaskSteps(taskDescription) {
        return `**Task: ${taskDescription}**

**Suggested Steps:**
1. Review the current situation and gather all relevant information
2. Identify the specific actions needed to complete this task
3. Assign responsibilities if multiple staff members are involved
4. Execute the plan step by step
5. Document the outcome and any lessons learned
6. Follow up to ensure the task was completed successfully`;
    }
}

module.exports = AIAdvisor;
