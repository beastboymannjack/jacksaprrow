# Overview

This is an advanced Discord ticket management bot built with Discord.js v14. The bot provides comprehensive support ticket functionality with multiple categories, priority levels, staff management, analytics, and user experience features. It enables Discord servers to manage user support requests through an organized ticketing system with features like transcripts, ratings, search capabilities, and performance tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Bot Framework
- **Technology**: Discord.js v14 with Node.js
- **Architecture Pattern**: Event-driven command handler pattern
- **Rationale**: Discord.js provides robust Discord API integration, while the command handler pattern enables modular, maintainable code organization

## Data Storage
- **Solution**: File-based JSON storage
- **Storage Structure**: Separate JSON files for different data types (tickets, config, stats, feedback, transcripts, analytics, tags, notes)
- **Location**: `/data` directory with individual files
- **Rationale**: Lightweight solution suitable for small to medium-scale deployments without requiring external database setup
- **Considerations**: May need migration to proper database (PostgreSQL, MongoDB) for high-traffic servers

## Command System
- **Pattern**: Slash command architecture with subcommands
- **Registration**: Guild-specific command registration on bot ready event
- **Commands Include**:
  - Admin panel (`ticket-admin`) - Configure categories, staff roles, log channels
  - Category management (`ticket-category`) - List, enable, disable, add, edit, remove categories
  - Bot owner tools (`bot-owner`) - Add/remove global categories, view bot-wide stats, list servers
  - Panel creation (`ticket-panel`) - Create ticket interface with live stats
  - Ticket management - Add/remove users, claim, close, transfer, reopen
  - Analytics (`ticket-analytics`, `ticket-stats`) - Performance metrics and reporting
  - User features - History, notes, tags, transcripts, search
- **Rationale**: Slash commands provide native Discord UI integration and better discoverability

## Event Handling
- **Events Managed**:
  - `ready` - Bot initialization and command registration
  - `interactionCreate` - Handles slash commands, buttons, modals, select menus
  - `messageCreate` - Staff DM notifications for ticket replies
- **Interaction Types**: Buttons, modals, string select menus for priority/category selection
- **Rationale**: Event-driven architecture enables reactive bot behavior

## Ticket Workflow
- **Creation Flow**: Button click → Priority selection → Modal form → Channel creation
- **Channel Structure**: Individual text channels created per ticket with permission overwrites
- **Discord Category Channels**: Optional - tickets can be organized in Discord category channels or created without them
  - Set category channels using `/ticket-admin set-category` command
  - If no category is configured, tickets are created at the root level
  - Invalid/deleted categories are handled gracefully with fallback to root-level creation
- **Permission Model**: 
  - Ticket creator gets view/send permissions
  - Staff roles get management permissions
  - Other users blocked by default
- **Categories**: Fully customizable ticket categories - server owners create custom categories from scratch, bot owners can add global defaults
- **Global Default Categories**: Bot owner can add default categories available to all servers via `/bot-owner` command
- **Custom Categories**: Each server creates their own categories with unique IDs, labels, emojis, and descriptions
- **Priority Levels**: Low, medium, high, urgent with color coding

## Features Architecture

### Staff Management
- **Role-based Access**: Configurable staff roles with ticket access
- **Claim System**: Staff members can claim tickets for ownership
- **Transfer System**: Reassign tickets between staff members
- **DM Notifications**: Alert staff when users reply in claimed tickets
- **Performance Tracking**: Stats on tickets handled, response times, ratings

### User Experience
- **Cooldown System**: Prevent spam with configurable cooldowns
- **Ticket Limits**: Max active tickets per user (1-10)
- **Queue System**: Position tracking with estimated wait times
- **History Access**: Users can view past ticket records
- **Rating System**: 1-5 star feedback on ticket closure
- **Voice Ticket Support**: Create voice channels for support (mentioned in features)

### Analytics System
- **Metrics Tracked**:
  - Total/open/closed ticket counts
  - Average response and resolution times
  - Staff performance leaderboards
  - Rating statistics
  - Time-based analytics (7/30/90 days, all time)
- **Search Functionality**: Filter by keyword, user, status, type, priority

### Transcript Generation
- **Formats**: Text (TXT) and HTML export options
- **Content**: Message history with timestamps, authors, attachments
- **Storage**: Transcripts saved to database for archival
- **Rationale**: Enables record-keeping and quality review

## Configuration Management
- **Config File**: `config.json` stores global default ticket categories, priority levels, colors, emojis
- **Server Config**: Per-guild settings stored in database (staff roles, categories, log channels, status, enabled categories, custom categories)
- **Environment Variables**: Bot token stored in `.env` file
- **Rationale**: Separates static configuration from dynamic server-specific settings

### Ticket Category System (Updated: October 2025)
- **No Pre-Defined Defaults**: Bot starts with no default categories - complete control from scratch
- **Bot Owner Global Categories**: Bot owners can add global default categories via `/bot-owner add-global-category` that become available to all servers
- **Auto-Pruning**: When bot owner removes a global category, it's automatically disabled from all server configs
- **Custom Categories**: Server owners create unlimited custom categories with unique IDs, labels, emojis, and descriptions
- **Per-Server**: Each server has its own set of enabled and custom categories
- **Dynamic Panel**: Ticket panel automatically adjusts to show only enabled categories (up to 25 buttons max)
- **Category Management**: Use `/ticket-category` command to list, enable, disable, add, edit, and remove categories
- **Discord Channel Categories**: Optional configuration using `/ticket-admin set-category` - no longer required for ticket creation
  - Categories can be set for any ticket type, regardless of enabled status
  - Tickets will be created without a Discord category if none is configured
  - System handles missing/deleted categories gracefully
- **Fresh Start**: New servers start with empty category lists - must create or enable categories before creating tickets

## Recent Changes (December 2025)

### Bot Invite Tracking & Configuration System
- **Setup Command**: New `/setup` slash command to configure three required IDs:
  - `CATEGORY_ID`: Discord category channel for ticket organization
  - `LOG_CHANNEL_ID`: Channel for logging ticket actions and bot events
  - `SUPPORT_ROLE_ID`: Discord role for support staff access
- **Invite Tracking Database**: New `botInvites.json` file tracks bot installations
- **Auto-Cleanup System**: Daily cron job checks for inactive bot instances
  - If bot not "reinvited" (members joining) for 3+ days, configuration is automatically removed
  - Logs removal notice to the guild's log channel
  - Prevents database clutter from inactive servers
- **Reinvite Detection**: Monitors member joins as reinvitation indicator (shows server is still active)

### Previous Changes (January 2025)
- **Fixed**: Discord category channels are now optional - tickets can be created without setting up category channels
- **Fixed**: `/ticket-admin set-category` no longer requires categories to be enabled first
- **Improved**: Better error handling for missing or deleted category channels
- **Enhancement**: Tickets will be created at root level if no category channel is configured

## Permission System
- **Bot Owner Commands**: Restricted to registered bot owner only (no server permission requirements)
- **Admin Commands**: Require `Administrator` permission or `ManageMessages` for ticket operations
- **Staff Commands**: Require configured staff roles for ticket management
- **User Commands**: Public access for ticket creation, history viewing
- **Channel Permissions**: Dynamic overwrites created per ticket for privacy

### Bot Owner Commands (`/bot-owner`)
- **add-global-category**: Add a default category available to all servers
- **remove-global-category**: Remove a default category from all servers (auto-prunes from server configs)
- **list-global-categories**: View all global default categories
- **stats**: View bot-wide statistics (total servers, tickets, feedback)
- **servers**: List all servers using the bot with member counts and ticket stats
- **Authorization**: Commands check for bot owner ID, no server permissions required

# External Dependencies

## Core Dependencies
- **discord.js v14.23.2**: Discord API wrapper for bot functionality
- **dotenv v17.2.3**: Environment variable management for sensitive configuration
- **@types/node v22.13.11**: TypeScript type definitions for Node.js
- **cron**: Scheduling library for automated daily invite expiration checks

## Discord API Integration
- **Gateway Intents Required**:
  - Guilds - Server information access
  - GuildMessages - Message reading in tickets
  - GuildMembers - User information and permissions
  - MessageContent - Reading message text (privileged)
  - DirectMessages - Staff DM notifications
- **Partials**: Channel and Message partials for DM support

## File System
- **Node.js `fs` module**: JSON file reading/writing for database operations
- **File Structure**: Data persistence through local JSON files in `/data` directory

## No External Services
- No external APIs, databases, or third-party services currently integrated
- Self-contained bot with local file storage
- Future considerations: PostgreSQL/MongoDB for scalability, Redis for caching