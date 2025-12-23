# JSON Embed Configuration System

## Overview
The embed configuration system centralizes all Discord embed definitions in `embeds.json` for consistency and easy maintenance.

## File Structure
- **embeds.json** - Central configuration file with all embed templates
- **embedBuilder.js** - Module to load and build embeds from config

## How It Works

### Basic Usage
```javascript
const { createEmbed } = require('./embedBuilder');

// Create embed with replacements
const embed = createEmbed('inviteRequirementError', {
  required: 5,
  invites: 2
});

// Send embed
await interaction.reply({ embeds: [embed] });
```

### Configuration Format
```json
{
  "embedKey": {
    "color": "#5865F2",
    "title": "Title Text",
    "description": "Description {placeholder}",
    "fields": [
      {
        "name": "Field Name",
        "value": "Field Value {placeholder}",
        "inline": true,
        "condition": "!flag"
      }
    ],
    "footer": {
      "text": "Footer {placeholder}"
    },
    "timestamp": false
  }
}
```

## Features

### Placeholders
Use `{key}` syntax for dynamic content:
```javascript
const embed = createEmbed('templateInfo', {
  name: 'Music Bot',
  emoji: '🎵',
  description: 'A full-featured music bot',
  features: '1. Play Music\n2. Queue Management'
});
```

### Conditional Fields
Fields can have conditions:
```json
{
  "name": "⚠️ Warning",
  "value": "Server offline",
  "condition": "!secondaryHealthy"
}
```
- `condition: "flag"` - Shows if flag is truthy
- `condition: "!flag"` - Shows if flag is falsy

### Multiple Embeds
Create multiple embeds efficiently:
```javascript
const embeds = createEmbeds(['success', 'info'], {
  message: 'Operation complete'
});
```

## Available Embed Keys

### System Embeds
- `error` - Generic error message
- `success` - Generic success message
- `noBotsMessage` - No bots created message

### Bot Creation
- `inviteRequirementError` - Invite check failed
- `botCreationOverview` - Main creation dashboard
- `botCreationSuccess` - Bot created successfully
- `botCreationError` - Creation failed
- `templateInfo` - Template details

### Bot Management
- `botStatus` - Bot status information
- `botDeleted` - Bot deletion confirmation

## Reload at Runtime
```javascript
const { reloadEmbedConfigs } = require('./embedBuilder');
reloadEmbedConfigs(); // Reloads from embeds.json
```

## Best Practices

1. **Centralized Definitions** - Keep all embed designs in embeds.json
2. **Consistent Styling** - Use same colors and formatting across embeds
3. **Reusable Placeholders** - Use common placeholder names
4. **Conditional Logic** - Use conditions for optional fields
5. **Documentation** - Update this file when adding new embeds

## Migration from Inline Embeds
Old code:
```javascript
const embed = new EmbedBuilder()
  .setColor('#5865F2')
  .setTitle('Title');
```

New code:
```javascript
const { createEmbed } = require('./embedBuilder');
const embed = createEmbed('myEmbed');
```
