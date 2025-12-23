const { EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const https = require('https');

const emojiPath = path.join(__dirname, '../../../emoji.json');

async function downloadEmoji(url, filename) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '../../temp-emojis');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const filepath = path.join(tempDir, filename);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadEmoji(response.headers.location, filename).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) return reject(new Error(`Failed: ${response.statusCode}`));
            
            const file = fs.createWriteStream(filepath);
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(filepath); });
            file.on('error', reject);
        }).on('error', reject);
    });
}

async function extractEmojiId(emojiString) {
    const match = emojiString.match(/\d{17,19}/);
    return match ? match[0] : null;
}

module.exports = {
    name: "setup-server-emoji",
    aliases: ["setupemoji", "upload-emoji"],
    description: "📤 Upload emojis to a specific server",
    usage: "setup-server-emoji <guildId>",
    help: {
        name: "setup-server-emoji",
        description: "Upload all emojis from emoji.json to a specific server"
    },
    
    run: async (client, message, args) => {
        try {
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Permission Denied")
                        .setDescription("You need Administrator permission")
                    ]
                });
            }
            
            const guildId = args[0];
            if (!guildId) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Usage Error")
                        .setDescription("Usage: `,setup-server-emoji <guildId>`")
                    ]
                });
            }
            
            const emojiData = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
            
            const msg = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("⏳ Processing")
                    .setDescription(`Starting emoji upload to guild ${guildId}...\n\n🔄 This may take a few minutes`)
                ]
            });
            
            let synced = 0;
            let skipped = 0;
            const newEmojiIds = {};
            
            for (const [name, emojiString] of Object.entries(emojiData)) {
                try {
                    if (emojiString.includes('EMOJI_ID_HERE') || emojiString === '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') {
                        skipped++;
                        continue;
                    }
                    
                    const oldId = await extractEmojiId(emojiString);
                    if (!oldId) {
                        skipped++;
                        continue;
                    }
                    
                    const isAnimated = emojiString.includes('a:');
                    const ext = isAnimated ? 'gif' : 'png';
                    const url = `https://cdn.discordapp.com/emojis/${oldId}.${ext}`;
                    const filename = `${name}_${oldId}.${ext}`;
                    
                    const filepath = await downloadEmoji(url, filename);
                    const emojiImage = fs.readFileSync(filepath);
                    const base64 = emojiImage.toString('base64');
                    const imageData = `data:image/${ext};base64,${base64}`;
                    
                    const uploaded = await rest.post(Routes.guildEmojis(guildId), {
                        body: { name: name, image: imageData }
                    });
                    
                    const newId = uploaded.id;
                    newEmojiIds[name] = isAnimated ? `<a:${name}:${newId}>` : `<:${name}:${newId}>`;
                    synced++;
                    
                    fs.unlinkSync(filepath);
                    await new Promise(r => setTimeout(r, 300));
                    
                } catch (error) {
                    console.log(`⚠️  Skipped "${name}":`, error.message);
                    skipped++;
                }
            }
            
            let description = `✅ Emoji upload complete!\n\n`;
            description += `**Synced:** ${synced} emojis\n`;
            description += `**Skipped:** ${skipped} emojis\n`;
            description += `**Guild:** ${guildId}\n\n`;
            
            if (synced > 0) {
                description += `✨ Successfully uploaded ${synced} emojis to the target guild!`;
            } else {
                description += `⚠️  No emojis were uploaded.`;
            }
            
            await msg.edit({
                embeds: [new EmbedBuilder()
                    .setColor("#57F287")
                    .setTitle("✅ Upload Complete")
                    .setDescription(description)
                ]
            });
            
        } catch (error) {
            console.error('[Setup Server Emoji Error]', error);
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Error")
                    .setDescription(`Error: ${error.message}`)
                ]
            });
        }
    }
};
