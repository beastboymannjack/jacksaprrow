const fetch = require('node-fetch');

const PING_INTERVAL = 2 * 60 * 1000; // 2 minutes
const SECONDARY_REPLIT_URL = process.env.SECONDARY_REPLIT_URL;

let pingCount = 0;
let lastPingStatus = null;
let consecutiveFailures = 0;

async function pingSecondaryReplit() {
    if (!SECONDARY_REPLIT_URL) {
        console.log('[KeepAlive] No SECONDARY_REPLIT_URL set - skipping ping');
        return { success: false, reason: 'no_url' };
    }

    const url = SECONDARY_REPLIT_URL.replace(/\/$/, '');
    
    try {
        const startTime = Date.now();
        const response = await fetch(`${url}/api/health`, {
            method: 'GET',
            timeout: 30000,
            headers: {
                'User-Agent': 'MainBot-KeepAlive/1.0'
            }
        });

        const responseTime = Date.now() - startTime;
        pingCount++;
        consecutiveFailures = 0;

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            lastPingStatus = {
                success: true,
                timestamp: new Date().toISOString(),
                responseTime,
                uptime: data.uptime,
                runningBots: data.runningBots
            };
            
            console.log(`[KeepAlive] Ping #${pingCount} SUCCESS - ${responseTime}ms - Secondary has ${data.runningBots || 0} bots running`);
            return lastPingStatus;
        } else {
            lastPingStatus = {
                success: false,
                timestamp: new Date().toISOString(),
                status: response.status,
                responseTime
            };
            
            console.warn(`[KeepAlive] Ping #${pingCount} returned status ${response.status}`);
            return lastPingStatus;
        }
    } catch (error) {
        consecutiveFailures++;
        lastPingStatus = {
            success: false,
            timestamp: new Date().toISOString(),
            error: error.message,
            consecutiveFailures
        };
        
        console.error(`[KeepAlive] Ping #${pingCount + 1} FAILED: ${error.message} (failures: ${consecutiveFailures})`);
        return lastPingStatus;
    }
}

function startKeepAlive() {
    if (!SECONDARY_REPLIT_URL) {
        console.log('[KeepAlive] SECONDARY_REPLIT_URL not set - KeepAlive disabled');
        console.log('[KeepAlive] Set SECONDARY_REPLIT_URL in secrets to enable auto-ping');
        return null;
    }

    console.log('[KeepAlive] Starting keep-alive service...');
    console.log(`[KeepAlive] Target: ${SECONDARY_REPLIT_URL}`);
    console.log(`[KeepAlive] Ping interval: ${PING_INTERVAL / 1000} seconds`);

    pingSecondaryReplit();

    const intervalId = setInterval(pingSecondaryReplit, PING_INTERVAL);
    
    console.log('[KeepAlive] Keep-alive service started successfully!');
    
    return intervalId;
}

function getKeepAliveStatus() {
    return {
        enabled: !!SECONDARY_REPLIT_URL,
        targetUrl: SECONDARY_REPLIT_URL,
        pingInterval: PING_INTERVAL,
        totalPings: pingCount,
        lastPing: lastPingStatus,
        consecutiveFailures
    };
}

module.exports = {
    startKeepAlive,
    pingSecondaryReplit,
    getKeepAliveStatus,
    PING_INTERVAL
};
