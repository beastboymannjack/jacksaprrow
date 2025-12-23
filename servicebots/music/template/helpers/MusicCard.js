const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

class MusicCard {
    constructor() {
        this.registerFonts();
    }

    registerFonts() {
        try {
            const fs = require('fs');
            let fontsRegistered = false;

            // Find noto fonts in nix store - prioritize full noto-fonts package
            const nixStorePath = '/nix/store';
            let notoFontsPath = null;

            try {
                const dirs = fs.readdirSync(nixStorePath);
                // First pass: look for the full noto-fonts package (not lgc-plus)
                for (const dir of dirs) {
                    if (dir.includes('noto-fonts-2025') && !dir.includes('cjk') && !dir.includes('lgc-plus')) {
                        const fontPath = path.join(nixStorePath, dir, 'share', 'fonts', 'noto');
                        if (fs.existsSync(fontPath)) {
                            // Check if this has Devanagari font
                            const devanagariPath = path.join(fontPath, 'NotoSansDevanagari[wdth,wght].ttf');
                            if (fs.existsSync(devanagariPath)) {
                                notoFontsPath = fontPath;
                                break;
                            }
                        }
                    }
                }
                // Fallback: use any noto-fonts package
                if (!notoFontsPath) {
                    for (const dir of dirs) {
                        if (dir.includes('noto-fonts') && !dir.includes('cjk') && dir.includes('2025')) {
                            const fontPath = path.join(nixStorePath, dir, 'share', 'fonts', 'noto');
                            if (fs.existsSync(fontPath)) {
                                notoFontsPath = fontPath;
                                break;
                            }
                        }
                    }
                }
            } catch (e) {}

            if (notoFontsPath) {
                // Register multi-language fonts with variable font support
                const fontsToRegister = [
                    { file: 'NotoSansDevanagari[wdth,wght].ttf', name: 'Noto Sans Devanagari' },
                    { file: 'NotoSansArabic[wdth,wght].ttf', name: 'Noto Sans Arabic' },
                    { file: 'NotoSansBengali[wdth,wght].ttf', name: 'Noto Sans Bengali' },
                    { file: 'NotoSansTamil[wdth,wght].ttf', name: 'Noto Sans Tamil' },
                    { file: 'NotoSansTelugu[wdth,wght].ttf', name: 'Noto Sans Telugu' },
                    { file: 'NotoSansKannada[wdth,wght].ttf', name: 'Noto Sans Kannada' },
                    { file: 'NotoSansMalayalam[wdth,wght].ttf', name: 'Noto Sans Malayalam' },
                    { file: 'NotoSansGujarati[wdth,wght].ttf', name: 'Noto Sans Gujarati' },
                    { file: 'NotoSansGurmukhi[wdth,wght].ttf', name: 'Noto Sans Gurmukhi' },
                    { file: 'NotoSansThai[wdth,wght].ttf', name: 'Noto Sans Thai' },
                    { file: 'NotoSansHebrew[wdth,wght].ttf', name: 'Noto Sans Hebrew' },
                ];

                for (const font of fontsToRegister) {
                    try {
                        const fontFilePath = path.join(notoFontsPath, font.file);
                        if (fs.existsSync(fontFilePath)) {
                            GlobalFonts.registerFromPath(fontFilePath, font.name);
                        }
                    } catch (e) {}
                }
                console.log(`[MusicCard] Multi-language fonts registered from: ${notoFontsPath}`);
                fontsRegistered = true;
            }

            // Also try to find CJK fonts using fc-list or direct search
            try {
                const { execSync } = require('child_process');
                let cjkFontPath = null;
                
                // Try using fc-list first (most reliable)
                try {
                    const fcOutput = execSync('fc-list | grep -i "NotoSansCJK" | head -1', { encoding: 'utf8' });
                    const match = fcOutput.match(/^([^:]+)/);
                    if (match && match[1]) {
                        cjkFontPath = match[1].trim();
                    }
                } catch (e) {}
                
                // Fallback: search nix store directories
                if (!cjkFontPath) {
                    const dirs = fs.readdirSync(nixStorePath);
                    for (const dir of dirs) {
                        if (dir.includes('noto-fonts-cjk')) {
                            const cjkPath = path.join(nixStorePath, dir, 'share', 'fonts', 'opentype', 'noto-cjk');
                            if (fs.existsSync(cjkPath)) {
                                const cjkFiles = fs.readdirSync(cjkPath);
                                for (const file of cjkFiles) {
                                    if (file.includes('NotoSansCJK') && (file.endsWith('.ttc') || file.endsWith('.otf.ttc'))) {
                                        cjkFontPath = path.join(cjkPath, file);
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
                
                if (cjkFontPath && fs.existsSync(cjkFontPath)) {
                    GlobalFonts.registerFromPath(cjkFontPath, 'Noto Sans CJK');
                    console.log(`[MusicCard] CJK fonts registered: ${cjkFontPath}`);
                }
            } catch (e) {
                console.warn('[MusicCard] Could not register CJK fonts:', e.message);
            }

            if (!fontsRegistered) {
                console.warn('[MusicCard] Could not register custom fonts. Using system defaults.');
            }
        } catch (e) {
            console.error('[MusicCard] Font registration error:', e);
        }
    }

    truncateText(ctx, text, maxWidth, font, ellipsis = '...') {
        ctx.font = font;
        if (ctx.measureText(text).width <= maxWidth) return text;
        let truncated = text;
        while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + ellipsis;
    }

    formatDuration(ms) {
        if (ms === null || ms === undefined || ms < 0) return '0:00';
        const seconds = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
        const minutes = Math.floor((ms / (1000 * 60)) % 60).toString();
        const hours = Math.floor(ms / (1000 * 60 * 60));
        if (hours > 0) return `${hours}:${minutes.padStart(2, '0')}:${seconds}`;
        return `${minutes}:${seconds}`;
    }

    drawVinylRecord(ctx, centerX, centerY, radius, artworkImage) {
        ctx.save();

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(0.15, '#0a0a0a');
        gradient.addColorStop(0.3, '#1a1a1a');
        gradient.addColorStop(0.5, '#0d0d0d');
        gradient.addColorStop(0.7, '#1a1a1a');
        gradient.addColorStop(0.85, '#0a0a0a');
        gradient.addColorStop(1, '#151515');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        for (let i = 0; i < 8; i++) {
            const grooveRadius = radius * (0.35 + i * 0.08);
            ctx.beginPath();
            ctx.arc(centerX, centerY, grooveRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(40, 40, 40, ${0.6 - i * 0.05})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.shadowColor = 'rgba(0, 255, 200, 0.3)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const labelRadius = radius * 0.38;
        ctx.beginPath();
        ctx.arc(centerX, centerY, labelRadius, 0, Math.PI * 2);
        ctx.clip();

        if (artworkImage) {
            const size = labelRadius * 2;
            ctx.drawImage(artworkImage, centerX - labelRadius, centerY - labelRadius, size, size);

            const overlay = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, labelRadius);
            overlay.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
            overlay.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
            ctx.fillStyle = overlay;
            ctx.fill();
        }

        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    drawWaveform(ctx, x, y, width, height, progress, color1, color2) {
        ctx.save();

        const bars = 45;
        const barWidth = width / bars - 2;
        const gap = 2;

        for (let i = 0; i < bars; i++) {
            const barX = x + i * (barWidth + gap);
            const seed = Math.sin(i * 0.5) * Math.cos(i * 0.3) + Math.sin(i * 0.7);
            const barHeight = height * (0.3 + Math.abs(seed) * 0.7);
            const barY = y + (height - barHeight) / 2;

            const isPlayed = i / bars <= progress;

            if (isPlayed) {
                const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                ctx.fillStyle = gradient;

                ctx.shadowColor = color1;
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getMultiLangFont(size, weight = 'normal') {
        const weights = {
            'bold': 'bold',
            'semibold': '600',
            'medium': '500',
            'normal': 'normal'
        };
        const fontWeight = weights[weight] || weight;
        return `${fontWeight} ${size}px "Noto Sans Devanagari", "Noto Sans Arabic", "Noto Sans Bengali", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans CJK", "Noto Sans", Arial, sans-serif`;
    }

    drawNeonText(ctx, text, x, y, fontSize, color, fontFamily = null) {
        ctx.save();
        ctx.font = fontFamily || this.getMultiLangFont(fontSize, 'bold');
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);

        ctx.shadowBlur = 10;
        ctx.fillText(text, x, y);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    async generateNowPlayingCard(options) {
        const { track, position = 0, player } = options;

        const width = 700;
        const height = 200;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        let artworkImage = null;
        try {
            const artworkUrl = track?.info?.artworkUrl || track?.pluginInfo?.artworkUrl;
            if (artworkUrl) {
                artworkImage = await loadImage(artworkUrl);
            }
        } catch (e) {}

        // Draw blurred artwork background
        if (artworkImage) {
            const tempCanvas = createCanvas(width, height);
            const tempCtx = tempCanvas.getContext('2d');
            
            const scale = 1.5;
            const scaledWidth = width * scale;
            const scaledHeight = height * scale;
            const offsetX = (width - scaledWidth) / 2;
            const offsetY = (height - scaledHeight) / 2;
            
            tempCtx.filter = 'blur(15px)';
            tempCtx.drawImage(artworkImage, offsetX, offsetY, scaledWidth, scaledHeight);
            ctx.drawImage(tempCanvas, 0, 0);
        } else {
            const bgGradient = ctx.createLinearGradient(0, 0, width, height);
            bgGradient.addColorStop(0, '#1a1a2e');
            bgGradient.addColorStop(1, '#16213e');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);
        }

        // Dark overlay for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, width, height);

        // Draw thumbnail on the left with rounded corners
        const thumbSize = 130;
        const thumbX = 30;
        const thumbY = (height - thumbSize) / 2;
        const thumbRadius = 8;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, thumbRadius);
        ctx.clip();

        if (artworkImage) {
            ctx.drawImage(artworkImage, thumbX, thumbY, thumbSize, thumbSize);
        } else {
            ctx.fillStyle = '#2a2a3e';
            ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize);
            ctx.font = this.getMultiLangFont(40, 'bold');
            ctx.fillStyle = '#555';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('♪', thumbX + thumbSize/2, thumbY + thumbSize/2);
        }
        ctx.restore();

        // Subtle border around thumbnail
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, thumbRadius);
        ctx.stroke();
        ctx.restore();

        // Text info section
        const textX = thumbX + thumbSize + 25;
        const maxTextWidth = width - textX - 30;
        let textY = 38;

        // "Playing from [source]" label
        const source = track?.info?.sourceName || 'Stream';
        ctx.save();
        ctx.font = this.getMultiLangFont(14, 'normal');
        ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Playing from ${source.toLowerCase()}`, textX, textY);
        ctx.restore();

        textY += 28;

        // Track title - large and white
        const title = track?.info?.title || 'Unknown Track';
        const displayTitle = this.truncateText(ctx, title, maxTextWidth, this.getMultiLangFont(28, 'bold'));

        ctx.save();
        ctx.font = this.getMultiLangFont(28, 'bold');
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(displayTitle, textX, textY);
        ctx.restore();

        textY += 38;

        // Artist name
        const artist = track?.info?.author || 'Unknown Artist';
        const displayArtist = this.truncateText(ctx, artist, maxTextWidth, this.getMultiLangFont(18, 'normal'));

        ctx.save();
        ctx.font = this.getMultiLangFont(18, 'normal');
        ctx.fillStyle = 'rgba(220, 220, 220, 0.9)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(displayArtist, textX, textY);
        ctx.restore();

        textY += 32;

        // Duration / LIVE text
        const isLive = !track?.info?.duration || track.info.duration <= 0;
        const currentTime = this.formatDuration(position);
        const totalTime = isLive ? 'LIVE' : this.formatDuration(track?.info?.duration || 0);
        const durationText = `${currentTime} / ${totalTime}`;

        ctx.save();
        ctx.font = this.getMultiLangFont(16, 'semibold');
        ctx.fillStyle = isLive ? '#ff6b6b' : '#00d4aa';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(durationText, textX, textY);
        ctx.restore();

        // "deadloom Music" branding in bottom right
        ctx.save();
        ctx.font = this.getMultiLangFont(13, 'medium');
        ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('deadloom Music', width - 20, height - 15);
        ctx.restore();

        return canvas.toBuffer('image/png');
    }
}

module.exports = { MusicCard };
