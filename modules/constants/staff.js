module.exports = {
    STAFF_RANKS: {
        TRAINEE: {
            name: "Trainee",
            level: 1,
            xpRequired: 0,
            color: "#95A5A6",
            emoji: "🌱",
            perks: ["Basic ticket access", "View handbook"]
        },
        JUNIOR: {
            name: "Junior Staff",
            level: 2,
            xpRequired: 500,
            color: "#3498DB",
            emoji: "⭐",
            perks: ["Close tickets", "Basic moderation", "Bot monitoring"]
        },
        SENIOR: {
            name: "Senior Staff",
            level: 3,
            xpRequired: 2000,
            color: "#9B59B6",
            emoji: "🌟",
            perks: ["Create bots", "Advanced moderation", "Manage junior staff"]
        },
        LEAD: {
            name: "Lead Staff",
            level: 4,
            xpRequired: 5000,
            color: "#E67E22",
            emoji: "💫",
            perks: ["Approve LOA", "Promote trainees", "Full bot access"]
        },
        MANAGER: {
            name: "Manager",
            level: 5,
            xpRequired: 10000,
            color: "#E74C3C",
            emoji: "👑",
            perks: ["Full admin access", "Promote all ranks", "Server management"]
        },
        ADMIN: {
            name: "Administrator",
            level: 6,
            xpRequired: 25000,
            color: "#FFD700",
            emoji: "🔱",
            perks: ["Everything", "System configuration", "Staff oversight"]
        }
    },

    LOA_TYPES: {
        VACATION: { name: "Vacation", emoji: "🏖️", color: "#3498DB", maxDays: 30 },
        SICK: { name: "Sick Leave", emoji: "🤒", color: "#E74C3C", maxDays: 14 },
        PERSONAL: { name: "Personal", emoji: "🏠", color: "#9B59B6", maxDays: 7 },
        EMERGENCY: { name: "Emergency", emoji: "🚨", color: "#E67E22", maxDays: 14 },
        TRAINING: { name: "Training", emoji: "📚", color: "#2ECC71", maxDays: 30 },
        OTHER: { name: "Other", emoji: "📋", color: "#95A5A6", maxDays: 14 }
    },

    LOA_STATUS: {
        PENDING: { name: "Pending Approval", emoji: "⏳", color: "#F1C40F" },
        APPROVED: { name: "Approved", emoji: "✅", color: "#2ECC71" },
        DENIED: { name: "Denied", emoji: "❌", color: "#E74C3C" },
        ACTIVE: { name: "Currently on Leave", emoji: "🌴", color: "#3498DB" },
        COMPLETED: { name: "Returned", emoji: "🎉", color: "#9B59B6" },
        CANCELLED: { name: "Cancelled", emoji: "🚫", color: "#95A5A6" }
    },

    XP_REWARDS: {
        TICKET_CLOSED: { xp: 25, emoji: "🎫", message: "Ticket closed" },
        TICKET_CLAIMED: { xp: 10, emoji: "📥", message: "Ticket claimed" },
        BOT_CREATED: { xp: 100, emoji: "🤖", message: "Bot created" },
        BOT_STARTED: { xp: 15, emoji: "▶️", message: "Bot started" },
        MODERATION_ACTION: { xp: 20, emoji: "🔨", message: "Moderation action" },
        WARN_ISSUED: { xp: 15, emoji: "⚠️", message: "Warning issued" },
        BAN_ISSUED: { xp: 30, emoji: "🔨", message: "Ban issued" },
        HELPFUL_RESPONSE: { xp: 10, emoji: "💬", message: "Helpful response" },
        DAILY_LOGIN: { xp: 5, emoji: "📅", message: "Daily activity" },
        STREAK_BONUS: { xp: 50, emoji: "🔥", message: "Activity streak bonus" },
        WEEK_STREAK: { xp: 100, emoji: "📆", message: "7-day streak" },
        MONTH_STREAK: { xp: 500, emoji: "🗓️", message: "30-day streak" },
        FIRST_TICKET: { xp: 50, emoji: "🏆", message: "First ticket closed!" },
        FIRST_BOT: { xp: 150, emoji: "🎊", message: "First bot created!" },
        MENTOR_BONUS: { xp: 75, emoji: "🎓", message: "Helped train new staff" }
    },

    ACHIEVEMENTS: {
        FIRST_TICKET: {
            id: "first_ticket",
            name: "First Steps",
            description: "Close your first ticket",
            emoji: "👶",
            xpBonus: 50,
            requirement: { type: "tickets_closed", count: 1 }
        },
        TICKET_WARRIOR: {
            id: "ticket_warrior",
            name: "Ticket Warrior",
            description: "Close 50 tickets",
            emoji: "⚔️",
            xpBonus: 200,
            requirement: { type: "tickets_closed", count: 50 }
        },
        TICKET_LEGEND: {
            id: "ticket_legend",
            name: "Ticket Legend",
            description: "Close 500 tickets",
            emoji: "🏆",
            xpBonus: 1000,
            requirement: { type: "tickets_closed", count: 500 }
        },
        BOT_BUILDER: {
            id: "bot_builder",
            name: "Bot Builder",
            description: "Create your first bot",
            emoji: "🔧",
            xpBonus: 100,
            requirement: { type: "bots_created", count: 1 }
        },
        BOT_FACTORY: {
            id: "bot_factory",
            name: "Bot Factory",
            description: "Create 25 bots",
            emoji: "🏭",
            xpBonus: 500,
            requirement: { type: "bots_created", count: 25 }
        },
        PEACEKEEPER: {
            id: "peacekeeper",
            name: "Peacekeeper",
            description: "Issue 10 moderation actions",
            emoji: "⚖️",
            xpBonus: 150,
            requirement: { type: "mod_actions", count: 10 }
        },
        WEEK_WARRIOR: {
            id: "week_warrior",
            name: "Week Warrior",
            description: "7-day activity streak",
            emoji: "🔥",
            xpBonus: 100,
            requirement: { type: "streak", count: 7 }
        },
        MONTH_MASTER: {
            id: "month_master",
            name: "Month Master",
            description: "30-day activity streak",
            emoji: "💎",
            xpBonus: 500,
            requirement: { type: "streak", count: 30 }
        },
        EARLY_BIRD: {
            id: "early_bird",
            name: "Early Bird",
            description: "Be active before 8 AM",
            emoji: "🌅",
            xpBonus: 25,
            requirement: { type: "special", condition: "early_activity" }
        },
        NIGHT_OWL: {
            id: "night_owl",
            name: "Night Owl",
            description: "Be active after midnight",
            emoji: "🦉",
            xpBonus: 25,
            requirement: { type: "special", condition: "late_activity" }
        },
        HELPING_HAND: {
            id: "helping_hand",
            name: "Helping Hand",
            description: "Train 3 new staff members",
            emoji: "🤝",
            xpBonus: 300,
            requirement: { type: "staff_trained", count: 3 }
        },
        DEDICATION: {
            id: "dedication",
            name: "Dedication",
            description: "Reach 10,000 total XP",
            emoji: "💪",
            xpBonus: 1000,
            requirement: { type: "total_xp", count: 10000 }
        }
    },

    CELEBRATION_EMOJIS: ["🎉", "🎊", "🥳", "✨", "🌟", "⭐", "💫", "🏆", "👏", "🙌"],
    
    EXCITEMENT_PHRASES: [
        "Amazing work! 🎉",
        "You're on fire! 🔥",
        "Incredible performance! ⭐",
        "Keep crushing it! 💪",
        "Outstanding! 🏆",
        "You're a superstar! 🌟",
        "Phenomenal job! ✨",
        "Legendary status! 👑",
        "You're unstoppable! 🚀",
        "Absolutely brilliant! 💎"
    ],

    PROMOTION_MESSAGES: [
        "🎉 **HUGE CONGRATULATIONS!** 🎉\n{user} has been promoted to **{rank}**!\nTheir dedication and hard work have truly paid off! Keep shining! ✨",
        "🌟 **PROMOTION ALERT!** 🌟\n{user} has leveled up to **{rank}**!\nThis is what excellence looks like! 🏆",
        "👑 **NEW RANK UNLOCKED!** 👑\n{user} is now a **{rank}**!\nTheir journey continues to inspire us all! 💫",
        "🚀 **RISING STAR!** 🚀\n{user} has achieved **{rank}** status!\nNothing can stop this momentum! 🔥"
    ],

    DEMOTION_MESSAGES: [
        "📋 **Rank Update**\n{user} has been moved to **{rank}**.\nWe believe in your ability to grow! 💪",
        "📝 **Staff Update**\n{user}'s rank has been adjusted to **{rank}**.\nEvery journey has its moments - keep pushing forward! 🌱"
    ],

    AI_PERSONALITY: {
        name: "StaffBot AI",
        traits: ["helpful", "encouraging", "professional", "friendly", "knowledgeable"],
        responseStyle: "exciting, detailed, and emoji-rich",
        greetings: [
            "Hey there! 👋 How can I help you today?",
            "Hello! 🌟 I'm here to assist you!",
            "Hi! ✨ What can I do for you?",
            "Welcome! 🎉 Let's solve something together!"
        ],
        closings: [
            "Hope that helps! Let me know if you need anything else! 💫",
            "There you go! Feel free to ask more questions! 🌟",
            "Glad I could help! I'm always here for you! ✨",
            "That's everything! Don't hesitate to reach out again! 🎉"
        ]
    }
};
