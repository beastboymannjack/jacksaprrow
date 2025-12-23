const moodKeywords = {
    chill: {
        keywords: ['chill', 'relax', 'calm', 'peaceful', 'mellow', 'soothing', 'ambient', 'lofi', 'lo-fi'],
        searchTerms: ['lofi chill beats', 'relaxing music', 'ambient chill', 'calm instrumental']
    },
    energetic: {
        keywords: ['hype', 'pump', 'energy', 'energetic', 'workout', 'gym', 'exercise', 'running', 'intense'],
        searchTerms: ['workout music', 'gym motivation', 'high energy EDM', 'pump up playlist']
    },
    happy: {
        keywords: ['happy', 'upbeat', 'cheerful', 'fun', 'party', 'dance', 'joyful', 'positive'],
        searchTerms: ['happy upbeat songs', 'feel good music', 'party hits', 'dance pop']
    },
    sad: {
        keywords: ['sad', 'melancholy', 'emotional', 'heartbreak', 'cry', 'depressed', 'lonely'],
        searchTerms: ['sad emotional songs', 'melancholy music', 'heartbreak songs']
    },
    focus: {
        keywords: ['focus', 'study', 'work', 'concentrate', 'productive', 'coding', 'reading'],
        searchTerms: ['focus music', 'study beats', 'concentration music', 'deep focus']
    },
    sleep: {
        keywords: ['sleep', 'bedtime', 'night', 'rest', 'dream', 'sleepy', 'lullaby'],
        searchTerms: ['sleep music', 'relaxing sleep sounds', 'bedtime music', 'deep sleep']
    },
    romantic: {
        keywords: ['love', 'romantic', 'romance', 'couple', 'date', 'valentine'],
        searchTerms: ['romantic songs', 'love songs playlist', 'romantic ballads']
    },
    angry: {
        keywords: ['angry', 'rage', 'metal', 'heavy', 'aggressive', 'rock'],
        searchTerms: ['heavy metal', 'rock music', 'aggressive music', 'metal playlist']
    }
};

const genreKeywords = {
    hiphop: ['hip hop', 'hiphop', 'rap', 'rapper', 'trap'],
    pop: ['pop', 'popular', 'top hits', 'mainstream'],
    rock: ['rock', 'alternative', 'indie rock', 'classic rock'],
    electronic: ['electronic', 'edm', 'techno', 'house', 'dubstep', 'trance'],
    jazz: ['jazz', 'smooth jazz', 'bebop', 'swing'],
    classical: ['classical', 'orchestra', 'symphony', 'piano classical'],
    country: ['country', 'western', 'nashville'],
    rnb: ['r&b', 'rnb', 'soul', 'rhythm and blues'],
    latin: ['latin', 'reggaeton', 'salsa', 'bachata'],
    kpop: ['kpop', 'k-pop', 'korean pop', 'korean music']
};

const timeBasedSuggestions = {
    morning: {
        hours: [5, 6, 7, 8, 9, 10],
        searchTerms: ['morning coffee music', 'peaceful morning playlist', 'wake up songs']
    },
    afternoon: {
        hours: [11, 12, 13, 14, 15, 16],
        searchTerms: ['afternoon vibes', 'midday music', 'productive afternoon playlist']
    },
    evening: {
        hours: [17, 18, 19, 20],
        searchTerms: ['evening chill', 'sunset vibes', 'relaxing evening music']
    },
    night: {
        hours: [21, 22, 23, 0, 1, 2, 3, 4],
        searchTerms: ['late night vibes', 'midnight music', 'night owl playlist']
    }
};

function detectMood(query) {
    const lowerQuery = query.toLowerCase();
    
    for (const [mood, data] of Object.entries(moodKeywords)) {
        for (const keyword of data.keywords) {
            if (lowerQuery.includes(keyword)) {
                return {
                    mood,
                    searchTerms: data.searchTerms
                };
            }
        }
    }
    
    return null;
}

function detectGenre(query) {
    const lowerQuery = query.toLowerCase();
    
    for (const [genre, keywords] of Object.entries(genreKeywords)) {
        for (const keyword of keywords) {
            if (lowerQuery.includes(keyword)) {
                return genre;
            }
        }
    }
    
    return null;
}

function getTimeBasedSuggestion() {
    const hour = new Date().getHours();
    
    for (const [period, data] of Object.entries(timeBasedSuggestions)) {
        if (data.hours.includes(hour)) {
            const randomIndex = Math.floor(Math.random() * data.searchTerms.length);
            return {
                period,
                searchTerm: data.searchTerms[randomIndex]
            };
        }
    }
    
    return {
        period: 'general',
        searchTerm: 'popular music playlist'
    };
}

function parseNaturalLanguageQuery(query) {
    const lowerQuery = query.toLowerCase().trim();
    
    const playPatterns = [
        /^play\s+(?:me\s+)?(?:some\s+)?(?:something\s+)?(.+)$/i,
        /^(?:i\s+want\s+(?:to\s+)?(?:listen\s+to\s+)?|put\s+on\s+)(.+)$/i,
        /^(?:can\s+you\s+)?play\s+(.+)$/i
    ];
    
    let extractedQuery = query;
    for (const pattern of playPatterns) {
        const match = query.match(pattern);
        if (match) {
            extractedQuery = match[1].trim();
            break;
        }
    }
    
    const moodResult = detectMood(extractedQuery);
    if (moodResult) {
        const randomIndex = Math.floor(Math.random() * moodResult.searchTerms.length);
        return {
            type: 'mood',
            mood: moodResult.mood,
            searchQuery: moodResult.searchTerms[randomIndex],
            originalQuery: extractedQuery
        };
    }
    
    const genre = detectGenre(extractedQuery);
    if (genre) {
        return {
            type: 'genre',
            genre,
            searchQuery: `${genre} music playlist`,
            originalQuery: extractedQuery
        };
    }
    
    const similarPatterns = [
        /(?:similar\s+to|like)\s+(.+)/i,
        /(?:songs?\s+like|music\s+like)\s+(.+)/i
    ];
    
    for (const pattern of similarPatterns) {
        const match = extractedQuery.match(pattern);
        if (match) {
            return {
                type: 'similar',
                artist: match[1].trim(),
                searchQuery: `${match[1].trim()} similar artists`,
                originalQuery: extractedQuery
            };
        }
    }
    
    const artistRadioPatterns = [
        /(.+)\s+radio$/i,
        /radio\s+(.+)$/i
    ];
    
    for (const pattern of artistRadioPatterns) {
        const match = extractedQuery.match(pattern);
        if (match) {
            return {
                type: 'radio',
                artist: match[1].trim(),
                searchQuery: `${match[1].trim()} mix`,
                originalQuery: extractedQuery
            };
        }
    }
    
    return {
        type: 'direct',
        searchQuery: extractedQuery,
        originalQuery: extractedQuery
    };
}

function generateSmartSearchQuery(parsedQuery, context = {}) {
    switch (parsedQuery.type) {
        case 'mood':
            return parsedQuery.searchQuery;
        case 'genre':
            return `top ${parsedQuery.genre} songs`;
        case 'similar':
            return `${parsedQuery.artist} type beat`;
        case 'radio':
            return `${parsedQuery.artist} playlist mix`;
        default:
            return parsedQuery.searchQuery;
    }
}

module.exports = {
    detectMood,
    detectGenre,
    getTimeBasedSuggestion,
    parseNaturalLanguageQuery,
    generateSmartSearchQuery,
    moodKeywords,
    genreKeywords,
    timeBasedSuggestions
};
