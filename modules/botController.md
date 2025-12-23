# Bot Controller Module

## Overview
Manages bot process control: start, stop, restart operations with status tracking.

## Methods

### startBot(botName, botData)
Start a stopped bot process.
- **Returns:** `{success, message, pid?}`
- Updates status to 'running'
- Records in database

### stopBot(botName)
Stop a running bot process.
- **Returns:** `{success, message}`
- Updates status to 'stopped'
- Cleans up process tracking

### restartBot(botName, botData)
Stop and immediately start a bot.
- **Returns:** `{success, message}`
- Waits 1 second between stop/start
- Updates status to 'running'

### getControlStatus(botName)
Get current control state of a bot.
- **Returns:** `{botName, isRunning, pid, startTime, status, uptime, lastUpdated}`

### checkCrashedBots()
Scan running processes and detect crashes.
- **Returns:** `string[]` - List of crashed bot names
- Updates status to 'crashed' for dead processes
- Called periodically by health checker

### getAllRunningBots()
Get list of all running bots.
- **Returns:** `{name, pid, uptime}[]`

## API Endpoints

### POST /api/bots/control/:botName/:action
Execute control action (start/stop/restart).

**Params:**
- `:botName` - Bot name
- `:action` - `start`, `stop`, or `restart`

**Response:**
```json
{
  "success": true,
  "message": "Bot started successfully",
  "status": {
    "botName": "mybot",
    "isRunning": true,
    "pid": 1234,
    "status": "running"
  }
}
```

### GET /api/bots/control/status/:botName
Get bot control status.

### GET /api/bots/control/all
Get all running bots.

## Integration Points

- `botStatusMonitor` - Updates status after control actions
- `database` - Updates bot status in database
- `slash commands` - Slash command handlers call these methods
- `dashboard` - Web endpoints for control

## Error Handling

Errors are automatically:
1. Logged to botStatusMonitor
2. Returned in API response
3. Tracked with metadata (action, attempt number)

## Process Management

- Uses Node.js spawn with detached mode
- Tracks PID for each running bot
- Can kill process groups with negative PID
- Handles process cleanup on stop
