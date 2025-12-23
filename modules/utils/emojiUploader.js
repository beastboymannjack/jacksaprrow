const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const https = require('https');

const emojiData = require('./emojis.json');

async function downloadEmoji(url, filename) {
    return new Promise((resolve, reject) => {
        const filepath = path.join(__dirname, '../temp', filename);
        
        if (!fs.existsSync(path.join(__dirname, '../temp'))) {
            fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
        }
        
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadEmoji(response.headers.location, filename).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download emoji: ${response.statusCode}`));
            }
            
            const file = fs.createWriteStream(filepath);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve(filepath);
            });
            
            file.on('error', reject);
        }).on('error', reject);
    });
}

async function extractEmojiId(emojiString) {
    const match = emojiString.match(/\d{17,19}/);
    return match ? match[0] : null;
}

async function uploadEmojis(guildId, botToken) {
    const rest = new REST({ version: '10' }).setToken(botToken);
    const newEmojiIds = {};
    
    console.log('\n📤 Starting emoji upload process...');
    console.log(`🎯 Target Guild ID: ${guildId}\n`);
    
    let count = 0;
    const total = Object.keys(emojiData).length;
    
    for (const [name, emojiString] of Object.entries(emojiData)) {
        try {
            const oldId = await extractEmojiId(emojiString);
            if (!oldId) {
                console.log(`⏭️  Skipping "${name}" - not a custom emoji`);
                continue;
            }
            
            const discordEmojiUrl = `https://cdn.discordapp.com/emojis/${oldId}.${emojiString.includes('a:') ? 'gif' : 'png'}`;
            const fileExt = emojiString.includes('a:') ? 'gif' : 'png';
            const filename = `${name}_${oldId}.${fileExt}`;
            
            console.log(`⬇️  Downloading emoji: ${name}...`);
            const filepath = await downloadEmoji(discordEmojiUrl, filename);
            
            const emojiImage = fs.readFileSync(filepath);
            const base64Image = emojiImage.toString('base64');
            const imageData = `data:image/${fileExt};base64,${base64Image}`;
            
            console.log(`⬆️  Uploading emoji: ${name}...`);
            const uploadedEmoji = await rest.post(Routes.guildEmojis(guildId), {
                body: {
                    name: name,
                    image: imageData
                }
            });
            
            const newEmojiId = uploadedEmoji.id;
            const isAnimated = emojiString.includes('a:');
            const newEmojiString = isAnimated 
                ? `<a:${name}:${newEmojiId}>`
                : `<:${name}:${newEmojiId}>`;
            
            newEmojiIds[name] = newEmojiString;
            
            console.log(`✅ ${name}: ${newEmojiString}`);
            
            fs.unlinkSync(filepath);
            count++;
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`❌ Error with emoji "${name}": ${error.message}`);
        }
    }
    
    console.log(`\n✨ Emoji upload complete! (${count}/${total} successful)\n`);
    
    return newEmojiIds;
}

async function updateEmojiJson(newEmojiIds) {
    const outputPath = path.join(__dirname, './emojis.json');
    const updatedData = { ...emojiData, ...newEmojiIds };
    
    fs.writeFileSync(outputPath, JSON.stringify(updatedData, null, 2));
    console.log(`📝 Updated emojis.json with new IDs\n`);
    
    return updatedData;
}

module.exports = { uploadEmojis, updateEmojiJson, extractEmojiId, downloadEmoji };
