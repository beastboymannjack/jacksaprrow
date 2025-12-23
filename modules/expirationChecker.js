const remoteBotClient = require('./api/remoteBotClient');

async function recoverBot(botKey, days = 30) {
    try {
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + days);
        
        const result = await remoteBotClient.setExpiration(botKey, newExpiration.toISOString(), days, 'recovery');
        
        if (result && result.success) {
            await remoteBotClient.startBot(botKey);
            return { success: true, newExpiration };
        }
        
        return { success: false, error: result?.error || 'Failed to recover bot' };
    } catch (err) {
        console.error('[ExpirationChecker] Recovery failed:', err.message);
        return { success: false, error: err.message };
    }
}

async function getExpirationStatus(botKey) {
    try {
        const result = await remoteBotClient.getExpiration(botKey);
        return result;
    } catch (err) {
        console.error('[ExpirationChecker] Get expiration failed:', err.message);
        return { exists: false, error: err.message };
    }
}

async function findBotByName(botName) {
    try {
        const bots = await remoteBotClient.listBots();
        return bots.find(bot => 
            bot.botKey === botName || 
            bot.name === botName || 
            bot.displayName === botName
        );
    } catch (err) {
        console.error('[ExpirationChecker] Find bot failed:', err.message);
        return null;
    }
}

async function checkAllExpirations() {
    try {
        const bots = await remoteBotClient.listBots();
        const expiredBots = [];
        const warningBots = [];
        const now = new Date();
        
        for (const bot of bots) {
            if (bot.expirationDate) {
                const expDate = new Date(bot.expirationDate);
                const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
                
                if (daysLeft <= 0) {
                    expiredBots.push({ ...bot, daysLeft });
                } else if (daysLeft <= 7) {
                    warningBots.push({ ...bot, daysLeft });
                }
            }
        }
        
        return { expiredBots, warningBots };
    } catch (err) {
        console.error('[ExpirationChecker] Check expirations failed:', err.message);
        return { expiredBots: [], warningBots: [] };
    }
}

module.exports = {
    recoverBot,
    getExpirationStatus,
    findBotByName,
    checkAllExpirations
};
