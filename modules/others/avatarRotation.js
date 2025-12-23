const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { CronJob } = require('cron');

const AVATAR_CONFIG_PATH = path.join(process.cwd(), 'dbs', 'avatar_rotation.json');

const MEME_SUBREDDITS = [
    'memes',
    'dankmemes',
    'me_irl',
    'wholesomememes',
    'AdviceAnimals',
    'MemeEconomy',
    'PrequelMemes',
    'funny',
    'reactiongifs',
    'gifs',
    'animatedmemes',
    'highqualitygifs',
    'perfectloops',
    'BetterEveryLoop'
];

const GIF_SUBREDDITS = [
    'reactiongifs',
    'gifs',
    'animatedmemes',
    'highqualitygifs',
    'perfectloops',
    'BetterEveryLoop',
    'gifsthatkeepongiving'
];

const BLOCKED_KEYWORDS = [
    'bts', 'kpop', 'k-pop', 'korean', 'blackpink', 'twice', 'exo', 'nct', 
    'stray kids', 'straykids', 'seventeen', 'enhypen', 'txt', 'ateez',
    'itzy', 'aespa', 'ive', 'newjeans', 'le sserafim', 'gidle', '(g)i-dle',
    'red velvet', 'mamamoo', 'monsta x', 'got7', 'bigbang', 'super junior',
    'shinee', 'snsd', 'girls generation', 'army', 'blink', 'once', 'exol',
    'jungkook', 'jimin', 'taehyung', 'suga', 'rm', 'jin', 'j-hope', 'jhope',
    'lisa', 'jennie', 'rose', 'jisoo', 'idol', 'bangtan', 'hallyu', 'kdrama'
];

function containsBlockedContent(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return BLOCKED_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

async function fetchRandomMemeFromReddit(preferGif = false, retryCount = 0) {
    if (retryCount > 5) {
        return null;
    }
    
    const subreddits = preferGif ? GIF_SUBREDDITS : MEME_SUBREDDITS;
    const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
    
    try {
        const response = await fetch(`https://meme-api.com/gimme/${subreddit}`, { timeout: 15000 });
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.nsfw || data.spoiler) {
            return fetchRandomMemeFromReddit(preferGif, retryCount + 1);
        }
        
        if (containsBlockedContent(data.title) || containsBlockedContent(data.subreddit)) {
            return fetchRandomMemeFromReddit(preferGif, retryCount + 1);
        }
        
        const isAnimated = data.url.endsWith('.gif') || data.url.includes('.gif');
        
        return {
            url: data.url,
            title: data.title,
            subreddit: data.subreddit,
            author: data.author,
            upvotes: data.ups,
            isAnimated
        };
    } catch (e) {
        console.error('[AvatarRotation] Reddit API error:', e.message);
        return null;
    }
}

async function fetchFromTenor(searchTerm = 'funny meme') {
    try {
        const terms = ['funny meme face', 'meme reaction', 'funny face', 'viral meme', 'dank meme', 'trollface', 'pepe', 'wojak', 'surprised pikachu', 'shocked face', 'bruh moment'];
        const term = terms[Math.floor(Math.random() * terms.length)];
        
        const response = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=30&media_filter=gif`, { timeout: 15000 });
        
        if (!response.ok) {
            throw new Error(`Tenor API returned ${response.status}`);
        }
        
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const filteredResults = data.results.filter(gif => !containsBlockedContent(gif.content_description));
            
            if (filteredResults.length === 0) {
                return null;
            }
            
            const gif = filteredResults[Math.floor(Math.random() * filteredResults.length)];
            const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
            
            if (gifUrl) {
                return {
                    url: gifUrl,
                    title: gif.content_description || term,
                    subreddit: 'tenor',
                    author: 'tenor',
                    upvotes: 0,
                    isAnimated: true
                };
            }
        }
        return null;
    } catch (e) {
        console.error('[AvatarRotation] Tenor API error:', e.message);
        return null;
    }
}

async function fetchMemeFromImgflip() {
    try {
        const response = await fetch('https://api.imgflip.com/get_memes', { timeout: 15000 });
        if (!response.ok) {
            throw new Error(`Imgflip API returned ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.data && data.data.memes && data.data.memes.length > 0) {
            const meme = data.data.memes[Math.floor(Math.random() * Math.min(100, data.data.memes.length))];
            return {
                url: meme.url,
                title: meme.name,
                subreddit: 'imgflip',
                author: 'imgflip',
                upvotes: 0,
                isAnimated: false
            };
        }
        return null;
    } catch (e) {
        console.error('[AvatarRotation] Imgflip API error:', e.message);
        return null;
    }
}

async function fetchMultipleMemes(count = 5) {
    try {
        const response = await fetch(`https://meme-api.com/gimme/${count}`, { timeout: 15000 });
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        if (data.memes && data.memes.length > 0) {
            const safeMemes = data.memes.filter(m => !m.nsfw && !m.spoiler);
            const gifs = safeMemes.filter(m => m.url.endsWith('.gif'));
            
            if (gifs.length > 0) {
                const meme = gifs[Math.floor(Math.random() * gifs.length)];
                return {
                    url: meme.url,
                    title: meme.title,
                    subreddit: meme.subreddit,
                    author: meme.author,
                    upvotes: meme.ups,
                    isAnimated: true
                };
            }
            
            if (safeMemes.length > 0) {
                const meme = safeMemes[Math.floor(Math.random() * safeMemes.length)];
                return {
                    url: meme.url,
                    title: meme.title,
                    subreddit: meme.subreddit,
                    author: meme.author,
                    upvotes: meme.ups,
                    isAnimated: meme.url.endsWith('.gif')
                };
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function getRandomInternetMeme(preferAnimated = true) {
    let meme = null;
    
    if (preferAnimated && Math.random() > 0.3) {
        meme = await fetchFromTenor();
        if (meme) return meme;
        
        meme = await fetchRandomMemeFromReddit(true);
        if (meme) return meme;
    }
    
    meme = await fetchMultipleMemes(10);
    if (meme) return meme;
    
    meme = await fetchRandomMemeFromReddit(false);
    if (meme) return meme;
    
    meme = await fetchMemeFromImgflip();
    
    return meme;
}

async function getRandomBannerMeme() {
    let meme = await fetchMemeFromImgflip();
    if (meme) return meme;
    
    meme = await fetchRandomMemeFromReddit(false);
    return meme;
}

async function fetchImageAsBufferWithSizeLimit(url, maxSizeKB = 10000) {
    try {
        const response = await fetch(url, { 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const buffer = await response.buffer();
        const sizeKB = buffer.length / 1024;
        
        if (sizeKB > maxSizeKB) {
            return null;
        }
        
        return buffer;
    } catch (e) {
        return null;
    }
}

function loadConfig() {
    try {
        if (fs.existsSync(AVATAR_CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(AVATAR_CONFIG_PATH, 'utf8'));
        }
    } catch (e) {}
    return {
        enabled: true,
        bannerEnabled: true,
        lastIndex: 0,
        lastChanged: null,
        lastMeme: null,
        lastBanner: null,
        customAvatars: [],
        customBanners: []
    };
}

function saveConfig(config) {
    try {
        const dir = path.dirname(AVATAR_CONFIG_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(AVATAR_CONFIG_PATH, JSON.stringify(config, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

async function fetchImageAsBuffer(url) {
    try {
        const response = await fetch(url, { 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const buffer = await response.buffer();
        return buffer;
    } catch (e) {
        return null;
    }
}

async function rotateAvatar(client) {
    const config = loadConfig();
    
    if (!config.enabled) {
        return { success: false, reason: 'disabled' };
    }
    
    const meme = await getRandomInternetMeme(true);
    
    if (!meme) {
        return { success: false, reason: 'no_memes_available' };
    }

    try {
        const avatarBuffer = await fetchImageAsBuffer(meme.url);
        
        if (!avatarBuffer) {
            return { success: false, reason: 'fetch_failed' };
        }

        await client.user.setAvatar(avatarBuffer);
        
        config.lastIndex = (config.lastIndex || 0) + 1;
        config.lastChanged = new Date().toISOString();
        config.lastMeme = {
            title: meme.title,
            subreddit: meme.subreddit,
            author: meme.author,
            upvotes: meme.upvotes,
            url: meme.url,
            isAnimated: meme.isAnimated
        };
        saveConfig(config);

        return { success: true, meme };

    } catch (e) {
        if (e.message.includes('rate limit') || e.code === 50035) {
            return { success: false, reason: 'rate_limited' };
        }
        console.error('[AvatarRotation] Error:', e.message);
        return { success: false, reason: 'error', error: e.message };
    }
}

async function rotateBanner(client) {
    const config = loadConfig();
    
    if (!config.bannerEnabled) {
        return { success: false, reason: 'disabled' };
    }
    
    let meme = null;
    let bannerBuffer = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!bannerBuffer && attempts < maxAttempts) {
        attempts++;
        meme = await getRandomBannerMeme();
        
        if (!meme) {
            continue;
        }
        
        bannerBuffer = await fetchImageAsBufferWithSizeLimit(meme.url, 9000);
    }
    
    if (!bannerBuffer || !meme) {
        return { success: false, reason: 'no_suitable_image' };
    }

    try {
        await client.user.setBanner(bannerBuffer);
        
        config.lastBanner = {
            title: meme.title,
            subreddit: meme.subreddit,
            url: meme.url,
            changedAt: new Date().toISOString()
        };
        saveConfig(config);
        
        return { success: true, meme };

    } catch (e) {
        if (e.message.includes('Cannot set banner') || e.message.includes('Missing Access')) {
            return { success: false, reason: 'no_nitro' };
        }
        if (e.message.includes('BANNER_RATE_LIMIT') || e.message.includes('rate limit') || e.message.includes('too fast')) {
            return { success: false, reason: 'rate_limited' };
        }
        console.error('[AvatarRotation] Banner error:', e.message);
        return { success: false, reason: 'error', error: e.message };
    }
}

function startHourlyRotation(client) {
    const config = loadConfig();
    const lastBannerChange = config.lastBanner?.changedAt ? new Date(config.lastBanner.changedAt) : null;
    const now = new Date();
    const minBannerInterval = 10 * 60 * 1000;
    
    setTimeout(async () => {
        await rotateAvatar(client).catch(() => {});
        
        if (!lastBannerChange || (now - lastBannerChange) > minBannerInterval) {
            await rotateBanner(client).catch(() => {});
        }
    }, 5000);
    
    const job = new CronJob('0 * * * *', async function () {
        await rotateAvatar(client);
        await rotateBanner(client);
    }, null, true, 'UTC');

    job.start();

    return job;
}

function startDailyRotation(client) {
    return startHourlyRotation(client);
}

function addCustomAvatar(url) {
    const config = loadConfig();
    if (!config.customAvatars.includes(url)) {
        config.customAvatars.push(url);
        saveConfig(config);
        return true;
    }
    return false;
}

function removeCustomAvatar(url) {
    const config = loadConfig();
    const index = config.customAvatars.indexOf(url);
    if (index > -1) {
        config.customAvatars.splice(index, 1);
        saveConfig(config);
        return true;
    }
    return false;
}

function setRotationEnabled(enabled) {
    const config = loadConfig();
    config.enabled = enabled;
    saveConfig(config);
    return config.enabled;
}

function setBannerEnabled(enabled) {
    const config = loadConfig();
    config.bannerEnabled = enabled;
    saveConfig(config);
    return config.bannerEnabled;
}

function getRotationStatus() {
    const config = loadConfig();
    return {
        enabled: config.enabled,
        bannerEnabled: config.bannerEnabled,
        lastChanged: config.lastChanged,
        lastMeme: config.lastMeme,
        lastBanner: config.lastBanner,
        totalRotations: config.lastIndex || 0,
        usingCustom: config.customAvatars.length > 0,
        customAvatarCount: config.customAvatars.length,
        customBannerCount: config.customBanners.length
    };
}

module.exports = {
    startDailyRotation,
    startHourlyRotation,
    rotateAvatar,
    rotateBanner,
    addCustomAvatar,
    removeCustomAvatar,
    setRotationEnabled,
    setBannerEnabled,
    getRotationStatus,
    loadConfig,
    saveConfig,
    fetchRandomMemeFromReddit,
    getRandomInternetMeme,
    getRandomBannerMeme,
    fetchFromTenor
};
