const TIME_UNITS = {
    s: { name: 'second', plural: 'seconds', ms: 1000 },
    sec: { name: 'second', plural: 'seconds', ms: 1000 },
    second: { name: 'second', plural: 'seconds', ms: 1000 },
    seconds: { name: 'second', plural: 'seconds', ms: 1000 },
    m: { name: 'minute', plural: 'minutes', ms: 60 * 1000 },
    min: { name: 'minute', plural: 'minutes', ms: 60 * 1000 },
    minute: { name: 'minute', plural: 'minutes', ms: 60 * 1000 },
    minutes: { name: 'minute', plural: 'minutes', ms: 60 * 1000 },
    h: { name: 'hour', plural: 'hours', ms: 60 * 60 * 1000 },
    hr: { name: 'hour', plural: 'hours', ms: 60 * 60 * 1000 },
    hour: { name: 'hour', plural: 'hours', ms: 60 * 60 * 1000 },
    hours: { name: 'hour', plural: 'hours', ms: 60 * 60 * 1000 },
    d: { name: 'day', plural: 'days', ms: 24 * 60 * 60 * 1000 },
    day: { name: 'day', plural: 'days', ms: 24 * 60 * 60 * 1000 },
    days: { name: 'day', plural: 'days', ms: 24 * 60 * 60 * 1000 },
    w: { name: 'week', plural: 'weeks', ms: 7 * 24 * 60 * 60 * 1000 },
    wk: { name: 'week', plural: 'weeks', ms: 7 * 24 * 60 * 60 * 1000 },
    week: { name: 'week', plural: 'weeks', ms: 7 * 24 * 60 * 60 * 1000 },
    weeks: { name: 'week', plural: 'weeks', ms: 7 * 24 * 60 * 60 * 1000 },
    mo: { name: 'month', plural: 'months', ms: 30 * 24 * 60 * 60 * 1000 },
    month: { name: 'month', plural: 'months', ms: 30 * 24 * 60 * 60 * 1000 },
    months: { name: 'month', plural: 'months', ms: 30 * 24 * 60 * 60 * 1000 },
    y: { name: 'year', plural: 'years', ms: 365 * 24 * 60 * 60 * 1000 },
    yr: { name: 'year', plural: 'years', ms: 365 * 24 * 60 * 60 * 1000 },
    year: { name: 'year', plural: 'years', ms: 365 * 24 * 60 * 60 * 1000 },
    years: { name: 'year', plural: 'years', ms: 365 * 24 * 60 * 60 * 1000 }
};

function parseTimeString(timeString) {
    if (!timeString || typeof timeString !== 'string') {
        return { valid: false, error: 'Invalid time string provided' };
    }

    const cleanStr = timeString.toLowerCase().trim();
    
    if (/^\d+$/.test(cleanStr)) {
        const days = parseInt(cleanStr);
        if (days > 0 && days <= 3650) {
            return {
                valid: true,
                ms: days * 24 * 60 * 60 * 1000,
                formatted: `${days} day${days !== 1 ? 's' : ''}`,
                components: [{ value: days, unit: 'days' }]
            };
        }
        return { valid: false, error: 'Plain number must be between 1-3650 days' };
    }

    const regex = /(\d+\.?\d*)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?|w|wk|weeks?|mo|months?|y|yr|years?)/gi;
    const matches = [...cleanStr.matchAll(regex)];

    if (matches.length === 0) {
        return { valid: false, error: 'No valid time units found. Use formats like: 1d, 2h30m, 1w, 1mo, 1y' };
    }

    let totalMs = 0;
    const components = [];

    for (const match of matches) {
        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        const unitInfo = TIME_UNITS[unit];

        if (!unitInfo) {
            return { valid: false, error: `Unknown time unit: ${unit}` };
        }

        if (value <= 0) {
            return { valid: false, error: 'Time values must be positive' };
        }

        totalMs += value * unitInfo.ms;
        components.push({ value, unit: unitInfo.plural });
    }

    const maxMs = 10 * 365 * 24 * 60 * 60 * 1000;
    if (totalMs > maxMs) {
        return { valid: false, error: 'Maximum duration is 10 years' };
    }

    const minMs = 60 * 1000;
    if (totalMs < minMs) {
        return { valid: false, error: 'Minimum duration is 1 minute' };
    }

    return {
        valid: true,
        ms: totalMs,
        formatted: formatDuration(totalMs),
        components
    };
}

function formatDuration(ms) {
    if (ms < 0) return 'Expired';
    if (ms === 0) return '0 seconds';

    const years = Math.floor(ms / (365 * 24 * 60 * 60 * 1000));
    ms %= 365 * 24 * 60 * 60 * 1000;
    
    const months = Math.floor(ms / (30 * 24 * 60 * 60 * 1000));
    ms %= 30 * 24 * 60 * 60 * 1000;
    
    const weeks = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
    ms %= 7 * 24 * 60 * 60 * 1000;
    
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    ms %= 24 * 60 * 60 * 1000;
    
    const hours = Math.floor(ms / (60 * 60 * 1000));
    ms %= 60 * 60 * 1000;
    
    const minutes = Math.floor(ms / (60 * 1000));
    ms %= 60 * 1000;
    
    const seconds = Math.floor(ms / 1000);

    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (weeks > 0) parts.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 && parts.length < 3) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

    if (parts.length === 0) return 'Less than 1 second';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}

function formatDurationShort(ms) {
    if (ms < 0) return 'Expired';
    if (ms === 0) return '0s';

    const years = Math.floor(ms / (365 * 24 * 60 * 60 * 1000));
    ms %= 365 * 24 * 60 * 60 * 1000;
    
    const months = Math.floor(ms / (30 * 24 * 60 * 60 * 1000));
    ms %= 30 * 24 * 60 * 60 * 1000;
    
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    ms %= 24 * 60 * 60 * 1000;
    
    const hours = Math.floor(ms / (60 * 60 * 1000));
    ms %= 60 * 60 * 1000;
    
    const minutes = Math.floor(ms / (60 * 1000));
    ms %= 60 * 1000;
    
    const seconds = Math.floor(ms / 1000);

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}mo`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && parts.length < 2) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
}

function getExpirationDate(durationMs) {
    return new Date(Date.now() + durationMs);
}

function getRemainingTime(expirationDate) {
    const expTime = new Date(expirationDate).getTime();
    const remaining = expTime - Date.now();
    return {
        ms: remaining,
        expired: remaining <= 0,
        formatted: formatDuration(Math.max(0, remaining)),
        formattedShort: formatDurationShort(Math.max(0, remaining))
    };
}

function parseExpirationInput(input) {
    if (!input) return { valid: false, error: 'No duration provided' };
    
    const str = String(input).trim();
    
    const presets = {
        '1min': 60 * 1000,
        '5min': 5 * 60 * 1000,
        '30min': 30 * 60 * 1000,
        '1hour': 60 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '6hours': 6 * 60 * 60 * 1000,
        '12hours': 12 * 60 * 60 * 1000,
        '1day': 24 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '3days': 3 * 24 * 60 * 60 * 1000,
        '7days': 7 * 24 * 60 * 60 * 1000,
        '1week': 7 * 24 * 60 * 60 * 1000,
        '1w': 7 * 24 * 60 * 60 * 1000,
        '2weeks': 14 * 24 * 60 * 60 * 1000,
        '1month': 30 * 24 * 60 * 60 * 1000,
        '1mo': 30 * 24 * 60 * 60 * 1000,
        '3months': 90 * 24 * 60 * 60 * 1000,
        '6months': 180 * 24 * 60 * 60 * 1000,
        '1year': 365 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000,
        'lifetime': 10 * 365 * 24 * 60 * 60 * 1000
    };

    const normalizedInput = str.toLowerCase().replace(/\s+/g, '');
    if (presets[normalizedInput]) {
        return {
            valid: true,
            ms: presets[normalizedInput],
            formatted: formatDuration(presets[normalizedInput]),
            isPreset: true
        };
    }

    return parseTimeString(str);
}

module.exports = {
    parseTimeString,
    parseExpirationInput,
    formatDuration,
    formatDurationShort,
    getExpirationDate,
    getRemainingTime,
    TIME_UNITS
};
