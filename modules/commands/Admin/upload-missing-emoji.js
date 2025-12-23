const { EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const https = require('https');

const emojiPath = path.join(__dirname, '../../emoji.json');

const missingEmojis = {
    "dl_sparkle": { desc: "Sparkle", color: "#FFD700" },
    "dl_crown": { desc: "Crown", color: "#FFD700" },
    "dl_arrow": { desc: "Arrow", color: "#5865F2" },
    "dl_folder": { desc: "Folder", color: "#FFA500" },
    "dl_music": { desc: "Music", color: "#FF1493" },
    "dl_ticket": { desc: "Ticket", color: "#00CED1" },
    "dl_bot": { desc: "Bot", color: "#5865F2" },
    "dl_stats": { desc: "Stats", color: "#32CD32" },
    "dl_check": { desc: "Check", color: "#00FF00" },
    "dl_rocket": { desc: "Rocket", color: "#FF4500" },
    "dl_info": { desc: "Info", color: "#1E90FF" },
    "dl_select": { desc: "Select", color: "#9370DB" },
    "dl_money": { desc: "Money", color: "#FFD700" },
    "dl_question": { desc: "Question", color: "#FF69B4" },
    "dl_chat": { desc: "Chat", color: "#00CED1" },
    "dl_code": { desc: "Code", color: "#000000" },
    "dl_download": { desc: "Download", color: "#228B22" },
    "dl_file": { desc: "File", color: "#4169E1" },
    "dl_zip": { desc: "ZIP", color: "#FF8C00" },
    "dl_star": { desc: "Star", color: "#FFD700" },
    "dl_youtube": { desc: "YouTube", color: "#FF0000" }
};

async function generateEmojiImage(name, color) {
    const Canvas = require('canvas');
    const canvas = Canvas.createCanvas(128, 128);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, 128, 128);
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = name.replace('dl_', '').substring(0, 3).toUpperCase();
    ctx.fillText(label, 64, 64);
    
    return canvas.toBuffer('image/png');
}

module.exports = {
    name: "upload-missing-emoji",
    aliases: ["uploadmissing", "missing-emoji"],
    description: "📤 Upload the missing placeholder emojis",
    usage: "upload-missing-emoji",
    help: {
        name: "upload-missing-emoji",
        description: "Upload all 22 missing placeholder emojis to the server"
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
            
            const guildId = '1440723119764541534';
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
            
            const msg = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("⏳ Processing")
                    .setDescription(`Generating and uploading 22 missing emojis to guild ${guildId}...\n\n🔄 This may take 1-2 minutes`)
                ]
            });
            
            let synced = 0;
            const emojiData = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
            const newEmojiIds = {};
            
            for (const [name, info] of Object.entries(missingEmojis)) {
                try {
                    const imageBuffer = await generateEmojiImage(name, info.color);
                    const base64 = imageBuffer.toString('base64');
                    const imageData = `data:image/png;base64,${base64}`;
                    
                    const uploaded = await rest.post(Routes.guildEmojis(guildId), {
                        body: { name: name, image: imageData }
                    });
                    
                    const newId = uploaded.id;
                    newEmojiIds[name] = `<:${name}:${newId}>`;
                    emojiData[name] = `<:${name}:${newId}>`;
                    synced++;
                    
                    await new Promise(r => setTimeout(r, 250));
                    
                } catch (error) {
                    if (error.message.includes('50')) {
                        console.log(`⚠️  Guild emoji limit reached at ${synced} emojis`);
                        break;
                    }
                    console.log(`⚠️  Failed to upload "${name}":`, error.message);
                }
            }
            
            if (synced > 0) {
                fs.writeFileSync(emojiPath, JSON.stringify(emojiData, null, 2));
            }
            
            let description = `✅ Missing emoji upload complete!\n\n`;
            description += `**Uploaded:** ${synced}/${Object.keys(missingEmojis).length} emojis\n`;
            description += `**Guild:** ${guildId}\n\n`;
            
            if (synced > 0) {
                description += `✨ Successfully uploaded ${synced} emojis!\n✅ emoji.json updated with new IDs`;
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
            console.error('[Upload Missing Emoji Error]', error);
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
