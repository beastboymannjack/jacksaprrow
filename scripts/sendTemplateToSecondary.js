const fs = require('fs');
const path = require('path');
const remoteBotClient = require('../modules/api/remoteBotClient');

async function readTemplateFilesRecursively(dir, basePath = '') {
    const files = {};
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            const subFiles = await readTemplateFilesRecursively(fullPath, relativePath);
            Object.assign(files, subFiles);
        } else {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                files[relativePath] = content;
            } catch (e) {
                console.log(`Could not read file: ${relativePath}`);
            }
        }
    }
    
    return files;
}

async function sendTemplateToSecondary() {
    console.log('='.repeat(60));
    console.log('  Sending Fixed Ticket Template to Secondary Replit');
    console.log('='.repeat(60));
    
    if (!remoteBotClient.isConfigured()) {
        console.error('ERROR: Remote bot client not configured!');
        console.error('Make sure REMOTE_LOG_URL and REMOTE_LOG_API_KEY are set.');
        process.exit(1);
    }
    
    console.log('Checking secondary server health...');
    const isHealthy = await remoteBotClient.checkHealth();
    
    if (!isHealthy) {
        console.error('ERROR: Secondary server is not responding!');
        console.error('Please make sure the secondary Replit is running.');
        process.exit(1);
    }
    
    console.log('Secondary server is healthy!');
    console.error('ERROR: Bot creation system has been removed. New servicebot integration coming soon.');
    process.exit(1);
    
    console.log(`Reading template files from: ${templateDir}`);
    const files = await readTemplateFilesRecursively(templateDir);
    console.log(`Found ${Object.keys(files).length} files to send`);
    
    const instructions = `
FIXED TICKET BOT TEMPLATE - Updated ${new Date().toISOString()}

Changes made:
1. Removed cluster/sharding dependency - bot now starts directly with index.js
2. Updated to Discord.js v14 compatible client initialization
3. Added in-memory storage fallback when MongoDB is not configured
4. Fixed handler to gracefully handle missing MongoDB
5. Updated package.json with compatible dependencies

When deploying new bots via /createbot new or ,createbot:
- Bots will now start directly and work immediately
- No clustering issues - works standalone
- Handles missing MongoDB gracefully
- Uses proper Discord.js v14 intents and partials
`;
    
    console.log('Sending template to secondary server...');
    
    try {
        const result = await remoteBotClient.updateTemplate('ticket', files, instructions);
        console.log('');
        console.log('='.repeat(60));
        console.log('  SUCCESS! Template sent to secondary Replit');
        console.log('='.repeat(60));
        console.log(`  Files updated: ${result.filesUpdated?.length || Object.keys(files).length}`);
        console.log(`  Template path: ${result.templatePath || 'servicebots/ticket/template'}`);
        console.log('='.repeat(60));
        console.log('');
        console.log('The secondary Replit now has the fixed ticket template.');
        console.log('New bots created with /createbot new will use this fixed version.');
        console.log('');
    } catch (err) {
        console.error('ERROR sending template:', err.message);
        process.exit(1);
    }
}

sendTemplateToSecondary().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
