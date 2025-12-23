# Bot Status Monitoring System

## Overview
Real-time monitoring of bot status, uptime, health, and error tracking.

## Core Features

### Status Tracking
- Track bot status: `running`, `stopped`, `crashed`
- Store creation date and last update timestamp
- Calculate uptime automatically
- Maintain status history (last 100 changes)

### Error Tracking
- Record errors with timestamp and metadata
- Store up to 50 errors per bot
- Query error history

### Statistics
- Total bots count
- Running/stopped/crashed breakdown
- System health percentage
- Last update timestamp

### File Storage
Location: `dbs/bot_status.json`

## Usage

### Update Bot Status
```javascript
const botStatusMonitor = require('./botStatusMonitor');

botStatusMonitor.updateStatus('mybot', 'running', {
  template: 'Music Bot',
  ownerId: '123456',
  location: 'primary'
});
```

### Get Bot Status
```javascript
const status = botStatusMonitor.getStatus('mybot');
// Returns: { name, status, uptime, createdAt, statusHistory, ... }
```

### Get All Bots
```javascript
const allBots = botStatusMonitor.getAllStatuses();

// With filter
const userBots = botStatusMonitor.getAllStatuses({ 
  ownerId: '123456' 
});

const running = botStatusMonitor.getAllStatuses({ 
  status: 'running' 
});
```

### Record Error
```javascript
botStatusMonitor.recordError('mybot', error, {
  action: 'start',
  attempt: 1
});
```

### Get Statistics
```javascript
const stats = botStatusMonitor.getStatistics();
// Returns: { total, running, stopped, crashed, healthy, lastUpdate }
```

## API Endpoints

### GET /api/bots/status/all
Get all bot statuses with optional filtering.

**Query Parameters:**
- `ownerId` - Filter by owner
- `status` - Filter by status (running/stopped/crashed)

**Response:**
```json
{
  "success": true,
  "statistics": {
    "total": 5,
    "running": 3,
    "stopped": 2,
    "crashed": 0,
    "healthy": 60
  },
  "bots": [...]
}
```

### GET /api/bots/status/:botName
Get specific bot status and error history.

**Response:**
```json
{
  "success": true,
  "bot": {
    "name": "mybot",
    "status": "running",
    "uptime": "2d 5h",
    "errors": [...],
    "statusHistory": [...]
  }
}
```

### POST /api/bots/status/:botName
Update bot status.

**Body:**
```json
{
  "status": "running",
  "metadata": {
    "template": "Music Bot",
    "ownerId": "123456"
  }
}
```

### GET /api/bots/statistics
Get system-wide statistics.

## Data Structure

### Bot Status Object
```json
{
  "name": "mybot",
  "status": "running",
  "template": "Music Bot",
  "ownerId": "123456",
  "createdAt": "2025-01-01T00:00:00Z",
  "lastUpdated": "2025-01-01T12:30:00Z",
  "uptime": "2d 5h",
  "location": "primary",
  "statusHistory": [
    {
      "status": "running",
      "timestamp": "2025-01-01T12:30:00Z",
      "from": "stopped"
    }
  ],
  "errors": [
    {
      "message": "Connection timeout",
      "timestamp": "2025-01-01T11:00:00Z",
      "metadata": { "action": "start" }
    }
  ]
}
```

## Integration

The system automatically integrates with:
- `botProcessManager` - Tracks process status changes
- `database` - Queries local bots for statistics
- Dashboard API - Exposes status via REST endpoints
