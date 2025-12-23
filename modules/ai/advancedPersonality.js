const { EmbedBuilder } = require('discord.js');

const PERSONALITY_RESPONSES = {
    greetings: [
        "🌟 **Hey there, superstar!** Ready to make some magic happen?",
        "👋 **Yo!** What's cookin' good lookin'?",
        "✨ **Heyyy!** Your friendly AI buddy is here to help!",
        "🎉 **Ayy!** The wait is over - I'm at your service!",
        "🚀 **Boom!** Your wish is my command!"
    ],
    thinking: [
        "🧠 **Hmm, let me put on my thinking cap...**",
        "⚡ **Processing at the speed of light...**",
        "🔮 **Consulting the digital oracle...**",
        "🎯 **Laser-focusing on your question...**",
        "💭 **Diving deep into the data realm...**"
    ],
    success: [
        "🎊 **Nailed it!** Here's what I found:",
        "✅ **Boom!** Got exactly what you need:",
        "🌈 **Perfect!** Check this out:",
        "🏆 **Winner winner!** Here you go:",
        "💎 **Jackpot!** Found the answer:"
    ],
    encouragement: [
        "💪 You've got this, champ!",
        "🌟 Keep shining bright!",
        "🔥 You're on fire today!",
        "⚡ Nothing can stop you!",
        "🚀 Sky's the limit!"
    ],
    farewell: [
        "👋 Catch you on the flip side!",
        "✌️ Peace out, awesome human!",
        "🌟 Until next time, legend!",
        "💫 Go crush it out there!",
        "🎉 You rock! Bye for now!"
    ]
};

const STAFF_TIPS = [
    "💡 **Pro Tip:** Always document your actions in the modlog - future you will thank you!",
    "🎯 **Staff Wisdom:** When in doubt, escalate to a senior staff member. Teamwork makes the dream work!",
    "📚 **Knowledge Drop:** Check the handbook regularly - it's constantly being updated with new info!",
    "⚡ **Power Move:** Use the AI assistant to help draft professional responses to difficult situations!",
    "🌟 **Reminder:** Take breaks! A refreshed staff member is an effective staff member.",
    "🎮 **Fun Fact:** Consistency is key - apply rules fairly to everyone, including friends!",
    "🔒 **Security Alert:** Never share sensitive information in public channels!",
    "💬 **Communication Tip:** When warning users, explain WHY - it helps them learn!",
    "🏆 **Achievement Unlocked:** Every case you handle teaches you something new!",
    "🤝 **Team Spirit:** Don't hesitate to ask for help - that's what teams are for!"
];

const MILESTONE_CELEBRATIONS = {
    firstAction: {
        emoji: "🎉",
        title: "First Steps!",
        message: "You've taken your first moderation action! Welcome to the team, champion!"
    },
    tenActions: {
        emoji: "⚡",
        title: "Getting Warmed Up!",
        message: "10 moderation actions! You're finding your groove!"
    },
    fiftyActions: {
        emoji: "🔥",
        title: "On Fire!",
        message: "50 actions completed! You're becoming a moderation machine!"
    },
    hundredActions: {
        emoji: "💎",
        title: "Century Club!",
        message: "100 actions! You've officially joined the legends!"
    },
    fiveHundred: {
        emoji: "🏆",
        title: "Master Moderator!",
        message: "500 actions! You're a true guardian of this server!"
    },
    thousand: {
        emoji: "👑",
        title: "LEGENDARY STATUS!",
        message: "1000+ actions! You are THE moderation legend!"
    }
};

const RANK_CELEBRATION_MESSAGES = {
    promote: [
        "🎊 **CELEBRATION TIME!** 🎊\nPop the confetti, ring the bells! A new champion rises!",
        "🌟 **LEVEL UP!** 🌟\nThrough dedication and hard work, greatness has been achieved!",
        "🚀 **PROMOTION INCOMING!** 🚀\nWhen you work this hard, the universe takes notice!",
        "💫 **STAR RISING!** 💫\nFrom good to AMAZING - this promotion was well-earned!",
        "🏆 **VICTORY LAP!** 🏆\nHard work pays off, and today we celebrate YOU!"
    ],
    demote: [
        "📉 Every journey has its bumps. This is a chance to grow and come back stronger!",
        "🌱 Remember: setbacks are setups for comebacks. You've got this!",
        "💪 This isn't the end - it's a new beginning. Learn, grow, and rise again!"
    ],
    welcome: [
        "🎉 **WELCOME TO THE FAMILY!** 🎉\nA new staff member joins our ranks! Let's give them a warm welcome!",
        "👋 **NEW TEAM MEMBER ALERT!** 👋\nThe squad just got stronger! Welcome aboard, friend!",
        "🌟 **FRESH TALENT INCOMING!** 🌟\nOur team grows today! Can't wait to see what you'll accomplish!"
    ]
};

const ACHIEVEMENT_TYPES = {
    first_warn: { emoji: "⚠️", name: "First Warning", description: "Issued your first warning", xp: 10 },
    first_kick: { emoji: "👢", name: "Boot Camp", description: "Your first kick action", xp: 15 },
    first_ban: { emoji: "🔨", name: "Hammer Time", description: "Dropped the ban hammer", xp: 20 },
    helper_5: { emoji: "🤝", name: "Helping Hand", description: "Helped 5 members", xp: 25 },
    helper_25: { emoji: "💝", name: "Community Hero", description: "Helped 25 members", xp: 50 },
    helper_100: { emoji: "🦸", name: "Super Helper", description: "Helped 100 members", xp: 100 },
    streak_7: { emoji: "🔥", name: "Week Warrior", description: "7-day activity streak", xp: 50 },
    streak_30: { emoji: "⚡", name: "Month Master", description: "30-day activity streak", xp: 150 },
    handbook_reader: { emoji: "📚", name: "Bookworm", description: "Read all handbook sections", xp: 30 },
    night_owl: { emoji: "🦉", name: "Night Owl", description: "Active during late hours", xp: 20 },
    early_bird: { emoji: "🐦", name: "Early Bird", description: "Active during early hours", xp: 20 },
    perfect_week: { emoji: "💯", name: "Perfect Week", description: "No missed tasks for a week", xp: 75 },
    team_player: { emoji: "🏆", name: "Team Player", description: "Participated in 10 team events", xp: 60 },
    mentor: { emoji: "🎓", name: "Wise Mentor", description: "Trained a new staff member", xp: 80 },
    veteran: { emoji: "🎖️", name: "Veteran", description: "Staff member for 6+ months", xp: 200 }
};

class PersonalityEngine {
    constructor() {
        this.userMoods = new Map();
    }

    getRandomResponse(category) {
        const responses = PERSONALITY_RESPONSES[category];
        if (!responses) return "";
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getRandomTip() {
        return STAFF_TIPS[Math.floor(Math.random() * STAFF_TIPS.length)];
    }

    getRandomPromotionMessage() {
        const msgs = RANK_CELEBRATION_MESSAGES.promote;
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    getRandomDemoteMessage() {
        const msgs = RANK_CELEBRATION_MESSAGES.demote;
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    getRandomWelcomeMessage() {
        const msgs = RANK_CELEBRATION_MESSAGES.welcome;
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    getMilestone(actionCount) {
        if (actionCount >= 1000) return MILESTONE_CELEBRATIONS.thousand;
        if (actionCount >= 500) return MILESTONE_CELEBRATIONS.fiveHundred;
        if (actionCount >= 100) return MILESTONE_CELEBRATIONS.hundredActions;
        if (actionCount >= 50) return MILESTONE_CELEBRATIONS.fiftyActions;
        if (actionCount >= 10) return MILESTONE_CELEBRATIONS.tenActions;
        if (actionCount >= 1) return MILESTONE_CELEBRATIONS.firstAction;
        return null;
    }

    generateMotivationalEmbed(user, type = 'encouragement') {
        const message = this.getRandomResponse(type);
        return new EmbedBuilder()
            .setColor("#FFD700")
            .setDescription(message)
            .setFooter({ text: `For ${user.tag} • Keep being awesome!` });
    }

    formatExcitingNumber(num) {
        if (num >= 1000000) return `${(num/1000000).toFixed(1)}M 🚀`;
        if (num >= 1000) return `${(num/1000).toFixed(1)}K ⚡`;
        return `${num} ✨`;
    }

    getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "🌅 Good morning";
        if (hour >= 12 && hour < 17) return "☀️ Good afternoon";
        if (hour >= 17 && hour < 21) return "🌆 Good evening";
        return "🌙 Good night";
    }

    generateDailyMessage(staffName) {
        const greeting = this.getTimeGreeting();
        const tip = this.getRandomTip();
        return `${greeting}, **${staffName}**!\n\n${tip}\n\n${this.getRandomResponse('encouragement')}`;
    }
}

module.exports = {
    PersonalityEngine,
    PERSONALITY_RESPONSES,
    STAFF_TIPS,
    MILESTONE_CELEBRATIONS,
    RANK_CELEBRATION_MESSAGES,
    ACHIEVEMENT_TYPES
};
