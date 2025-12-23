const servicebotCatalog = require('../servicebotCatalog');
const remoteBotClient = require('../api/remoteBotClient');
const fs = require('fs');
const path = require('path');

const botOrderStates = new Map();

const ORDER_INTENTS = [
    { keywords: ['music bot', 'music', 'play music', 'lavalink', 'songs'], templateId: 'music' },
    { keywords: ['ticket bot', 'ticket', 'support bot', 'help desk'], templateId: 'ticket' }
];

function detectBotOrderIntent(message) {
    const lowercaseMessage = message.toLowerCase();
    
    if (!lowercaseMessage.includes('bot') && 
        !lowercaseMessage.includes('create') && 
        !lowercaseMessage.includes('order') &&
        !lowercaseMessage.includes('want') &&
        !lowercaseMessage.includes('need')) {
        return null;
    }
    
    for (const intent of ORDER_INTENTS) {
        for (const keyword of intent.keywords) {
            if (lowercaseMessage.includes(keyword)) {
                return servicebotCatalog.getTemplate(intent.templateId);
            }
        }
    }
    
    return null;
}

function getOrderState(userId) {
    return botOrderStates.get(userId) || null;
}

function setOrderState(userId, state) {
    botOrderStates.set(userId, {
        ...state,
        lastUpdated: Date.now()
    });
}

function clearOrderState(userId) {
    botOrderStates.delete(userId);
}

function generateOrderPrompt(template) {
    return `Great! I can help you create a **${template.name}**! ${template.emoji}

**Features:**
${template.features.slice(0, 5).join('\n')}

**What I'll need from you:**
1. **Bot Token** - Get this from the Discord Developer Portal
2. **Client ID** - Your bot's Application ID
3. **Bot Name** - A unique name for your bot

Would you like to proceed with creating this bot? Reply with **yes** to continue or **no** to cancel.`;
}

function generateTokenRequestPrompt(template) {
    return `Perfect! Let's set up your **${template.name}**.

**Step 1: Bot Token**
Please paste your Discord Bot Token below.

> **How to get a token:**
> 1. Go to https://discord.com/developers/applications
> 2. Create a new application or select an existing one
> 3. Go to the "Bot" section
> 4. Click "Reset Token" and copy it

⚠️ **Never share your token publicly!** Just paste it here and I'll handle it securely.`;
}

function generateClientIdRequestPrompt() {
    return `Got it! Now I need your **Client ID**.

> **How to get your Client ID:**
> 1. Go to your Discord application at https://discord.com/developers/applications
> 2. Go to "OAuth2" section
> 3. Copy the "Client ID"

Please paste your Client ID below:`;
}

function generateBotNameRequestPrompt() {
    return `Almost there! Now please provide a **unique name** for your bot.

This name will be used to identify your bot in our system.

**Requirements:**
- Only letters, numbers, underscores, and hyphens
- Maximum 32 characters
- Must be unique

Please type a name for your bot:`;
}

async function processOrderMessage(userId, message, template, currentState) {
    if (!currentState) {
        return {
            response: generateOrderPrompt(template),
            newState: { step: 'confirm', templateId: template.id }
        };
    }
    
    const lowercaseMessage = message.toLowerCase().trim();
    
    switch (currentState.step) {
        case 'confirm':
            if (lowercaseMessage === 'yes' || lowercaseMessage === 'y') {
                return {
                    response: generateTokenRequestPrompt(template),
                    newState: { ...currentState, step: 'token' }
                };
            } else if (lowercaseMessage === 'no' || lowercaseMessage === 'n' || lowercaseMessage === 'cancel') {
                clearOrderState(userId);
                return {
                    response: '❌ Bot creation cancelled. Let me know if you need anything else!',
                    newState: null
                };
            } else {
                return {
                    response: 'Please reply with **yes** to proceed or **no** to cancel.',
                    newState: currentState
                };
            }
        
        case 'token':
            if (message.length < 50 || !message.includes('.')) {
                return {
                    response: '⚠️ That doesn\'t look like a valid Discord bot token. Bot tokens are usually 70+ characters long and contain periods. Please paste your full token.',
                    newState: currentState
                };
            }
            return {
                response: generateClientIdRequestPrompt(),
                newState: { ...currentState, step: 'clientId', token: message.trim() }
            };
        
        case 'clientId':
            if (!/^\d{17,19}$/.test(message.trim())) {
                return {
                    response: '⚠️ That doesn\'t look like a valid Client ID. Client IDs are 17-19 digit numbers. Please check and try again.',
                    newState: currentState
                };
            }
            return {
                response: generateBotNameRequestPrompt(),
                newState: { ...currentState, step: 'name', clientId: message.trim() }
            };
        
        case 'name':
            const botName = message.trim().replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32);
            if (botName.length < 3) {
                return {
                    response: '⚠️ Bot name must be at least 3 characters long. Please choose a longer name.',
                    newState: currentState
                };
            }
            
            return {
                response: null,
                newState: { 
                    ...currentState, 
                    step: 'deploying', 
                    botName,
                    ownerId: userId
                },
                readyToDeploy: true
            };
        
        default:
            clearOrderState(userId);
            return {
                response: 'Something went wrong. Let\'s start over. What kind of bot would you like to create?',
                newState: null
            };
    }
}

async function deployBotFromOrder(orderState) {
    const template = servicebotCatalog.getTemplate(orderState.templateId);
    if (!template) {
        throw new Error('Template not found');
    }
    
    const config = servicebotCatalog.createBotConfig(orderState.templateId, {
        BOT_TOKEN: orderState.token,
        CLIENT_ID: orderState.clientId,
        OWNER_ID: orderState.ownerId,
        token: orderState.token
    });
    
    const templateFiles = readTemplateFilesRecursively(template.templatePath);
    
    if (templateFiles['botconfig/config.json']) {
        const existingConfig = JSON.parse(templateFiles['botconfig/config.json']);
        const mergedConfig = { ...existingConfig, ...config };
        templateFiles['botconfig/config.json'] = JSON.stringify(mergedConfig, null, 2);
    }
    
    const result = await remoteBotClient.deployBot(
        orderState.botName, 
        orderState.templateId, 
        templateFiles, 
        config
    );
    
    return result;
}

const BINARY_EXTENSIONS = ['.db', '.sqlite', '.sqlite3', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz', '.pdf'];

function isBinaryFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return BINARY_EXTENSIONS.includes(ext);
}

function readTemplateFilesRecursively(dir, baseDir = dir) {
    const files = {};
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'package-lock.json') {
            continue;
        }
        
        if (entry.isDirectory()) {
            const subFiles = readTemplateFilesRecursively(fullPath, baseDir);
            Object.assign(files, subFiles);
        } else {
            try {
                if (isBinaryFile(entry.name)) {
                    const buffer = fs.readFileSync(fullPath);
                    files[relativePath] = { __binary: true, data: buffer.toString('base64') };
                } else {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    files[relativePath] = content;
                }
            } catch (e) {
                console.error(`[AITicketHandler] Error reading file ${fullPath}:`, e.message);
            }
        }
    }
    
    return files;
}

function getAvailableBotTypes() {
    const templates = servicebotCatalog.getAllTemplates();
    return templates.map(t => `${t.emoji} **${t.name}** - ${t.description}`).join('\n');
}

module.exports = {
    detectBotOrderIntent,
    getOrderState,
    setOrderState,
    clearOrderState,
    processOrderMessage,
    deployBotFromOrder,
    getAvailableBotTypes
};
