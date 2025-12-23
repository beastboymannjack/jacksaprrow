# Dashboard Endpoints Summary

## Bot Status Monitoring
- `GET /api/bots/status/all` - All bots with filtering
- `GET /api/bots/status/:botName` - Specific bot status
- `POST /api/bots/status/:botName` - Update status

## Bot Control
- `POST /api/bots/control/:botName/:action` - Execute control (start/stop/restart)
- `GET /api/bots/control/status/:botName` - Control status
- `GET /api/bots/control/all` - All running bots

## Bot Analytics
- `GET /api/analytics/:botName` - Bot analytics and events
- `GET /api/analytics/all/summary` - System-wide analytics

## Health Checks
- `POST /api/health/start` - Start health monitoring
- `POST /api/health/stop` - Stop health monitoring
- `GET /api/health/status` - Health check status and history

## Quick Integration Example

```javascript
// Start health checks on dashboard startup
const healthChecker = require('./modules/healthChecker');
healthChecker.start(5); // 5 minute interval

// Track bot events
const botAnalytics = require('./modules/botAnalytics');
botAnalytics.trackEvent('mybot', 'starts', {});

// Get bot stats
const stats = botAnalytics.getStats('mybot');
```
