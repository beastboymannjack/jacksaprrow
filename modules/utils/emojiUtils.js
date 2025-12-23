const fs = require('fs');
const path = require('path');

const emojiPath = path.join(__dirname, '../../emoji.json');

let emojiCache = null;
let lastModified = 0;

function loadEmojis() {
    try {
        const stats = fs.statSync(emojiPath);
        if (!emojiCache || stats.mtimeMs > lastModified) {
            emojiCache = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
            lastModified = stats.mtimeMs;
        }
        return emojiCache;
    } catch (e) {
        console.error('[EmojiUtils] Failed to load emoji.json:', e.message);
        return {};
    }
}

function getEmoji(name, fallback = '') {
    const emojis = loadEmojis();
    const emoji = emojis[name];
    
    if (!emoji || emoji.includes('EMOJI_ID_HERE')) {
        return fallback || name;
    }
    
    return emoji;
}

function getAllEmojis() {
    return loadEmojis();
}

function hasEmoji(name) {
    const emojis = loadEmojis();
    return emojis[name] && !emojis[name].includes('EMOJI_ID_HERE');
}

function reloadEmojis() {
    emojiCache = null;
    lastModified = 0;
    return loadEmojis();
}

function getEmojiId(name) {
    const emoji = getEmoji(name);
    const match = emoji.match(/\d{17,19}/);
    return match ? match[0] : null;
}

function isAnimated(name) {
    const emoji = getEmoji(name);
    return emoji.includes('a:');
}

module.exports = {
    getEmoji,
    getAllEmojis,
    hasEmoji,
    reloadEmojis,
    getEmojiId,
    isAnimated,
    get: getEmoji,
    e: getEmoji
};
