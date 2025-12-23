// Gemini AI Client - Replaces OpenAI
// Uses blueprint:javascript_gemini integration
const { GoogleGenAI } = require('@google/genai');

class GeminiAdvisor {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.ai = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;
        this.model = "gemini-2.5-flash";
        this.rateLimit = new Map();
        this.maxCallsPerHour = 50;
        this.responseCache = new Map();
        this.enabled = !!this.apiKey;
        this.serverContext = new Map();
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
        if (!this.enabled || !this.ai) {
            return {
                error: "AI features not configured. Please set GEMINI_API_KEY in your environment secrets.",
                answer: null
            };
        }

        try {
            if (!this.checkRateLimit(userHistory.userID || 'default')) {
                return {
                    error: "Rate limit exceeded. You can only make 50 AI requests per hour. Please wait and try again.",
                    answer: null
                };
            }

            const serverCtx = this.getServerContext(guildId);
            
            const prompt = `You are a helpful AI assistant for Discord server staff. You have knowledge about this server:
Server Name: ${serverCtx.serverName || 'Unknown'}
Member Count: ${serverCtx.memberCount || 'Unknown'}
Staff Roles: ${serverCtx.staffRoles?.map(r => r.name).join(', ') || 'None learned'}
Handbook Sections: ${serverCtx.handbookSections?.join(', ') || 'None'}
Server Rules Summary: ${serverCtx.rules?.slice(0, 3).join('\n') || 'Not loaded'}

Recent Moderation Patterns: ${serverCtx.recentCases?.slice(0, 5).map(c => c.type).join(', ') || 'None'}

Provide helpful, concise answers to staff questions. If asked about server-specific things you don't know, say so honestly.

User Question: ${question}`;

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt
            });

            return {
                answer: response.text || "I couldn't generate a response.",
                serverContext: !!serverCtx.serverName,
                timestamp: new Date(),
                source: 'gemini'
            };

        } catch (error) {
            console.error("Gemini AI Question Error:", error);
            return {
                error: `AI Error: ${error.message || 'Unknown error occurred'}`,
                answer: null
            };
        }
    }

    async getSuggestion(situation, serverContext = {}, userHistory = {}) {
        if (!this.enabled || !this.ai) {
            console.warn('[Gemini Advisor] API not enabled or no API key');
            return {
                error: "AI features not configured. Please set GEMINI_API_KEY in your environment secrets.",
                suggestion: null
            };
        }

        try {
            if (!this.checkRateLimit(userHistory.userID || 'default')) {
                console.warn('[Gemini Advisor] Rate limit exceeded for user:', userHistory.userID);
                return {
                    error: "Rate limit exceeded. You can only make 50 AI requests per hour. Please wait and try again.",
                    suggestion: null
                };
            }

            const guildContext = serverContext.guildId ? this.getServerContext(serverContext.guildId) : {};
            
            console.log('[Gemini Advisor] Calling Gemini for situation:', situation.substring(0, 50));

            const prompt = `You are an expert Discord server moderator advisor giving UNIQUE, SPECIFIC advice for EACH situation. NEVER reuse templates. Every response must be different and tailored to the exact situation described. Provide clear, actionable, step-by-step guidance. Format response with numbered steps. Be creative and specific to the situation.

Moderation Situation to Respond To:
${situation}

Server: ${serverContext.serverType || 'general'}

IMPORTANT: Provide UNIQUE advice for THIS SPECIFIC situation. Do NOT provide generic templates. Generate fresh, specific, actionable steps.`;

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt
            });

            const suggestion = response.text;
            
            if (!suggestion) {
                throw new Error('No content in Gemini response');
            }

            console.log('[Gemini Advisor] Successfully generated response');
            
            return {
                suggestion: suggestion,
                serverType: serverContext.serverType,
                timestamp: new Date(),
                source: 'gemini',
                fallback: false
            };

        } catch (error) {
            console.error("[Gemini Advisor] API Error:", error.message);
            let errorMsg = error.message || 'Unknown error';
            if (errorMsg.includes('429')) {
                errorMsg = "Gemini API quota exceeded. Please check your Google AI Studio account for credits/billing.";
            } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
                errorMsg = "Invalid or expired API key. Please check your GEMINI_API_KEY.";
            } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
                errorMsg = "Network error. Unable to connect to Gemini API.";
            }
            return {
                error: errorMsg,
                suggestion: null
            };
        }
    }

    async analyzeAppeal(appealContent, userHistory = {}, caseHistory = []) {
        if (!this.enabled || !this.ai) {
            return {
                error: "AI features not configured. Please set GEMINI_API_KEY in your environment secrets.",
                analysis: null
            };
        }

        try {
            if (!this.checkRateLimit(userHistory.userID || 'default')) {
                return { 
                    error: "Rate limit exceeded. You can only make 50 AI requests per hour. Please wait and try again.",
                    analysis: null
                };
            }

            const prompt = `You are an expert at analyzing ban appeals. Provide fair, balanced analysis considering context and tone. Be objective and professional.

Ban Appeal: "${appealContent}"

User History: ${JSON.stringify(userHistory)}

Analyze this appeal and provide a recommendation.`;

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt
            });

            return {
                analysis: response.text || "Unable to analyze appeal.",
                recommendation: "Review and let staff vote",
                timestamp: new Date(),
                source: 'gemini'
            };

        } catch (error) {
            console.error("Appeal Analysis Error:", error);
            return { 
                error: `AI Error: ${error.message || 'Could not analyze appeal'}`,
                analysis: null
            };
        }
    }

    async generateTaskSteps(taskDescription, staffAvailable = []) {
        if (!this.enabled || !this.ai) {
            return {
                error: "AI features not configured. Please set GEMINI_API_KEY in your environment secrets.",
                steps: null
            };
        }

        try {
            const prompt = `Generate clear, numbered action steps for Discord moderation tasks. Be specific and executable.

Task: ${taskDescription}

Generate numbered action steps to complete this task.`;

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt
            });

            return {
                steps: response.text || "Unable to generate steps.",
                taskID: `TASK-${Date.now()}`,
                timestamp: new Date(),
                source: 'gemini'
            };

        } catch (error) {
            console.error("Task Generation Error:", error);
            return { 
                error: `AI Error: ${error.message || 'Could not generate task steps'}`,
                steps: null
            };
        }
    }

    async chat(message, conversationHistory = []) {
        if (!this.enabled || !this.ai) {
            return {
                error: "AI features not configured",
                response: "AI is not configured. Please set GEMINI_API_KEY."
            };
        }

        try {
            const prompt = conversationHistory.length > 0
                ? `Previous conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${message}`
                : message;

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt
            });

            return {
                response: response.text || "I couldn't generate a response.",
                source: 'gemini'
            };
        } catch (error) {
            console.error("Chat Error:", error);
            return {
                error: error.message,
                response: "Sorry, I encountered an error. Please try again."
            };
        }
    }

}

module.exports = GeminiAdvisor;
