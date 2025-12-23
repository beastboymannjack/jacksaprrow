const http = require('http');
const https = require('https');

function getBaseUrl() {
    const remoteLogUrl = process.env.REMOTE_LOG_URL || '';
    if (!remoteLogUrl) return null;
    // Remove /api/logs suffix if present, then remove any trailing slashes
    return remoteLogUrl.replace(/\/api\/logs\/?$/, '').replace(/\/+$/, '');
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const baseUrl = getBaseUrl();
        if (!baseUrl) {
            return reject(new Error('REMOTE_LOG_URL not configured'));
        }

        const apiKey = process.env.REMOTE_LOG_API_KEY || '';
        if (!apiKey) {
            return reject(new Error('REMOTE_LOG_API_KEY not configured'));
        }

        try {
            const urlObj = new URL(baseUrl + path);
            const isHttps = urlObj.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                timeout: 30000
            };

            const req = httpModule.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(body);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(result);
                        } else {
                            reject(new Error(result.error || `HTTP ${res.statusCode}`));
                        }
                    } catch (e) {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({ success: true, raw: body });
                        } else if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                            const location = res.headers['location'];
                            console.error(`[RemoteBotClient] Redirect detected: ${res.statusCode} to ${location}`);
                            reject(new Error(`Server redirect (${res.statusCode}). The secondary server URL may be incorrect or the server may not be properly running.`));
                        } else if (body.includes('Run this app to see')) {
                            reject(new Error('Secondary Replit is not running. Please start the secondary server first.'));
                        } else {
                            console.error(`[RemoteBotClient] Response body:`, body.substring(0, 200));
                            reject(new Error(`HTTP ${res.statusCode}: Secondary server error`));
                        }
                    }
                });
            });

            req.on('error', (err) => {
                reject(new Error(`Connection error: ${err.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (data) {
                const payload = JSON.stringify(data);
                req.setHeader('Content-Length', Buffer.byteLength(payload));
                req.write(payload);
            }

            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

async function checkHealth() {
    try {
        const result = await makeRequest('GET', '/api/health');
        return result.status === 'ok' || result.success === true;
    } catch (err) {
        // Suppress expected errors when secondary is offline
        if (err.message.includes('Secondary Replit is not running') || 
            err.message.includes('Secondary server error')) {
            console.warn('[RemoteBotClient] Secondary server is offline or not started');
        } else {
            console.error('[RemoteBotClient] Health check failed:', err.message);
        }
        return false;
    }
}

async function deployBot(botName, botType, botFiles, config) {
    try {
        const result = await makeRequest('POST', '/api/deploy-bot', {
            botName,
            botType,
            files: botFiles,
            config,
            timestamp: new Date().toISOString()
        });
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Deploy failed:', err.message);
        throw err;
    }
}

async function startBot(botKey) {
    try {
        const result = await makeRequest('POST', `/api/bots/${encodeURIComponent(botKey)}/start`);
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Start bot failed:', err.message);
        throw err;
    }
}

async function stopBot(botKey) {
    try {
        const result = await makeRequest('POST', `/api/bots/${encodeURIComponent(botKey)}/stop`);
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Stop bot failed:', err.message);
        throw err;
    }
}

async function restartBot(botKey) {
    try {
        const result = await makeRequest('POST', `/api/bots/${encodeURIComponent(botKey)}/restart`);
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Restart bot failed:', err.message);
        throw err;
    }
}

async function deleteBot(botKey) {
    try {
        const result = await makeRequest('DELETE', `/api/bots/${encodeURIComponent(botKey)}`);
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Delete bot failed:', err.message);
        throw err;
    }
}

async function setExpiration(botKey, expirationDate, expirationDays, expirationSetBy = 'system') {
    try {
        const result = await makeRequest('POST', `/api/bots/${encodeURIComponent(botKey)}/expiration`, {
            expirationDate,
            expirationDays,
            expirationSetBy
        });
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Set expiration failed:', err.message);
        throw err;
    }
}

async function getExpiration(botKey) {
    try {
        const result = await makeRequest('GET', `/api/bots/${encodeURIComponent(botKey)}/expiration`);
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Get expiration failed:', err.message);
        throw err;
    }
}

async function listBots() {
    try {
        const result = await makeRequest('GET', '/api/bots');
        return result.bots || [];
    } catch (err) {
        console.error('[RemoteBotClient] List bots failed:', err.message);
        return [];
    }
}

async function updateTemplate(botType, files, instructions = null) {
    try {
        const result = await makeRequest('POST', '/api/update-template', {
            botType,
            files,
            instructions,
            timestamp: new Date().toISOString()
        });
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Update template failed:', err.message);
        throw err;
    }
}

async function sendMessage(message, from = 'Main Replit') {
    try {
        const result = await makeRequest('POST', '/api/message', {
            message,
            from
        });
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Send message failed:', err.message);
        throw err;
    }
}

function isConfigured() {
    return !!(process.env.REMOTE_LOG_URL && process.env.REMOTE_LOG_API_KEY);
}

function getRemoteUrl() {
    return getBaseUrl();
}

async function recoverBot(botKey, ownerDiscordId, paymentVerified = false) {
    try {
        const result = await makeRequest('POST', `/api/bots/${encodeURIComponent(botKey)}/recover-verify`, {
            ownerDiscordId,
            paymentVerified
        });
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Recover bot failed:', err.message);
        throw err;
    }
}

async function getArchivedBots() {
    try {
        const result = await makeRequest('GET', '/api/bots/archived/list');
        return result.archivedBots || [];
    } catch (err) {
        console.error('[RemoteBotClient] Get archived bots failed:', err.message);
        return [];
    }
}

async function notifyRecoveryApproved(botName, ownerDiscordId, message) {
    try {
        const result = await makeRequest('POST', '/api/bot-recovery-notify', {
            botName,
            ownerDiscordId,
            action: 'recovery_approved',
            message,
            recoveryTime: new Date().toISOString()
        });
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Notify recovery failed:', err.message);
        throw err;
    }
}

async function getBotStatus(botKey) {
    try {
        const result = await makeRequest('GET', `/api/bots/${encodeURIComponent(botKey)}/status`);
        return result;
    } catch (err) {
        console.error('[RemoteBotClient] Get bot status failed:', err.message);
        return { exists: false, running: false };
    }
}

module.exports = {
    checkHealth,
    deployBot,
    startBot,
    stopBot,
    restartBot,
    deleteBot,
    setExpiration,
    getExpiration,
    listBots,
    updateTemplate,
    sendMessage,
    isConfigured,
    getRemoteUrl,
    recoverBot,
    getArchivedBots,
    notifyRecoveryApproved,
    getBotStatus
};
