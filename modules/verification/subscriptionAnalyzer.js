const { GoogleGenAI } = require("@google/genai");
const https = require('https');
const http = require('http');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadImage(response.headers.location).then(resolve).catch(reject);
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

async function analyzeSubscriptionScreenshot(imageUrl, targetChannelName = "deadloom") {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.log('[SubscriptionAnalyzer] No GEMINI_API_KEY configured, falling back to manual review');
            return {
                success: false,
                isSubscribed: false,
                confidence: 0,
                reason: "Automatic verification not configured - needs manual review"
            };
        }

        const imageBuffer = await downloadImage(imageUrl);
        const base64Image = imageBuffer.toString('base64');
        
        const mimeType = imageUrl.toLowerCase().includes('.png') ? 'image/png' : 
                         imageUrl.toLowerCase().includes('.gif') ? 'image/gif' : 'image/jpeg';

        const prompt = `You are analyzing a screenshot to verify YouTube channel subscription.

TASK: Determine if this screenshot shows the user is SUBSCRIBED to the YouTube channel "${targetChannelName}".

Look for these indicators of an ACTIVE subscription:
1. The channel name "${targetChannelName}" is visible
2. A "Subscribed" button is shown (not "Subscribe" button)
3. The subscription bell icon is visible next to the channel name
4. The channel page shows "Subscribed" status

IMPORTANT RULES:
- The channel name must match "${targetChannelName}" (case insensitive)
- Must show ACTIVE subscription (Subscribed button, not Subscribe button)
- Screenshot must be from YouTube (desktop or mobile)

Respond with JSON only:
{
  "isSubscribed": true/false,
  "confidence": 0.0 to 1.0,
  "channelFound": "channel name seen or null",
  "subscriptionButtonText": "Subscribed/Subscribe/Not Visible",
  "reason": "brief explanation"
}`;

        const contents = [
            {
                role: "user",
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: prompt
                    }
                ]
            }
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents
        });

        let rawJson = null;
        
        if (response.candidates && response.candidates.length > 0) {
            const content = response.candidates[0].content;
            if (content && content.parts && content.parts.length > 0) {
                rawJson = content.parts[0].text;
            }
        }
        
        if (!rawJson && response.text) {
            rawJson = response.text;
        }
        
        if (rawJson) {
            const cleanJson = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleanJson);
            console.log(`[SubscriptionAnalyzer] Analysis result:`, result);
            return {
                success: true,
                isSubscribed: result.isSubscribed || false,
                confidence: result.confidence || 0,
                channelFound: result.channelFound || null,
                subscriptionButtonText: result.subscriptionButtonText || 'N/A',
                reason: result.reason || 'Analysis complete'
            };
        } else {
            console.error('[SubscriptionAnalyzer] Empty response from AI model');
            return {
                success: false,
                isSubscribed: false,
                confidence: 0,
                reason: "Empty response from AI model - needs manual review"
            };
        }
    } catch (error) {
        console.error('[SubscriptionAnalyzer] Error:', error.message);
        return {
            success: false,
            isSubscribed: false,
            confidence: 0,
            reason: `Analysis failed: ${error.message} - needs manual review`
        };
    }
}

module.exports = {
    analyzeSubscriptionScreenshot
};
