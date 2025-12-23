# 🎫 Advanced Discord Ticket Bot

A comprehensive Discord ticket management bot with **25+ advanced features** including multiple ticket categories, priority levels, staff management, analytics, transcripts, voice tickets, SLA tracking, and much more!

## ✨ Features Overview

### 🎯 Ticket Categories (7 Types)
- 🎧 **Technical Support** - Expert help with technical issues
- 🔐 **Verification** - Account verification and authentication
- 💡 **General Inquiry** - Questions and general assistance  
- 🚨 **Report Player** - Report rule violations and misconduct
- 🛒 **Purchases** - Help with payments and billing
- 🎁 **Redeem Giveaways** - Claim giveaway prizes
- 🎟️ **Redeem Purchases** - Redeem purchased items

### 🎨 Panel Features
- ✅ **Live Stats Display** - Real-time open tickets, wait time, and ratings
- ✅ **Refresh Button** - Update panel stats without recreating
- ✅ **Custom Banner** - Add your server logo/image
- ✅ **Status Indicator** - Show support online/offline status
- ✅ **FAQ Button** - Quick help for common questions
- ✅ **Multi-Language** - Support for EN, ES, FR, DE, PT

### 🎯 Ticket Management
- ✅ **Priority Levels** - Low, Medium, High, Urgent with color coding
- ✅ **Ticket Tags** - Custom labels (bug, billing, account, etc.)
- ✅ **Transfer System** - Reassign tickets between staff
- ✅ **Transcripts** - Export chat history as TXT or HTML
- ✅ **Staff Notes** - Private notes only visible to staff
- ✅ **Multi-Ticket Support** - Configurable max tickets per user (1-10)

### 👥 User Experience
- ✅ **Queue Position** - See your place in line
- ✅ **Estimated Wait Time** - Average response time display
- ✅ **Ticket History** - View your past tickets
- ✅ **Voice Tickets** - Create voice channels for support
- ✅ **File Requests** - Staff can request screenshots/logs
- ✅ **Star Ratings** - Rate support 1-5 stars after closing

### 👔 Staff Tools
- ✅ **Claim System** - Assign tickets to staff members
- ✅ **DM Alerts** - Get notified when users reply
- ✅ **Search System** - Find tickets by user, keyword, date, priority
- ✅ **SLA Tracking** - Alerts for unclaimed tickets
- ✅ **Staff Stats** - Track performance and response times
- ✅ **Quick Actions** - Request info, files, add members

### 📊 Analytics & Reporting
- ✅ **Dashboard** - Comprehensive analytics with charts
- ✅ **Performance Metrics** - Response times, resolution rates
- ✅ **Rating Statistics** - Average ratings and distribution
- ✅ **Category Breakdown** - Tickets by type and priority
- ✅ **Staff Leaderboard** - Top performers by tickets handled

### 🔧 Admin Features
- ✅ **Complete Configuration** - Everything customizable
- ✅ **Cooldown System** - Prevent ticket spam
- ✅ **Auto-Close Timer** - Close inactive tickets
- ✅ **Logging System** - Log all activities
- ✅ **Persistent Data** - JSON database storage
- ✅ **Maintenance Mode** - Disable all features for maintenance (owner only)
- ✅ **Auto-Registration** - Commands automatically register in new servers

## 📋 Quick Start Guide

### 1. Create Your Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** and give it a name
3. Navigate to the **"Bot"** tab on the left sidebar
4. Click **"Add Bot"** and confirm
5. Under **"Privileged Gateway Intents"**, enable these three intents:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
   - ✅ **Presence Intent** (optional but recommended)
6. Click **"Reset Token"** to generate a new token
7. **Copy your bot token** - you'll need it in the next step

### 2. Set Up Your Bot Token and Owner ID

You need to provide two environment variables in your `.env` file:

**Required Variables:**
- `DISCORD_BOT_TOKEN` - Your bot token from Discord Developer Portal
- `BOT_OWNER_ID` - Your Discord user ID (for maintenance mode access)

**How to get your Discord User ID:**
1. In Discord, go to Settings → Advanced
2. Enable "Developer Mode"
3. Right-click on your username anywhere in Discord
4. Click "Copy User ID"

Add these to your `.env` file:
```
DISCORD_BOT_TOKEN=your_bot_token_here
BOT_OWNER_ID=your_discord_user_id_here
```

**Important:** Never share your bot token with anyone! Keep it secure.

### 3. Invite the Bot to Your Server

1. In the Discord Developer Portal, go to **"OAuth2"** → **"URL Generator"**
2. Under **Scopes**, select:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions**, select:
   - ✅ Manage Channels
   - ✅ Manage Roles
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Use Slash Commands
   - ✅ Connect (required for voice tickets)
   - ✅ Manage Messages (helpful for moderation)
4. Copy the generated URL at the bottom
5. Paste the URL in your browser and select your server
6. Click **"Authorize"**

### 4. Initial Server Setup

Once your bot is online, follow these steps to configure it:

#### Step 1: Create Discord Categories

Create 7 category channels in your Discord server for organizing tickets:
- `Technical Support Tickets`
- `Verification Tickets`
- `General Inquiry Tickets`
- `Player Reports`
- `Purchase Support`
- `Giveaway Redemptions`
- `Purchase Redemptions`

#### Step 2: Configure Bot Settings

Run these commands in your Discord server:

```
/ticket-admin set-category type:Technical Support category:Technical Support Tickets
/ticket-admin set-category type:Verification category:Verification Tickets
/ticket-admin set-category type:General Inquiry category:General Inquiry Tickets
/ticket-admin set-category type:Report Player category:Player Reports
/ticket-admin set-category type:Purchases category:Purchase Support
/ticket-admin set-category type:Redeem Giveaways category:Giveaway Redemptions
/ticket-admin set-category type:Redeem Purchases category:Purchase Redemptions
```

#### Step 3: Configure Staff and Logging

```
/ticket-admin add-staff-role role:@Support Team
/ticket-admin set-log-channel channel:#ticket-logs
```

#### Step 4: Optional Settings

Customize your ticket system:
```
/ticket-admin set-sla-time minutes:30
/ticket-admin set-max-tickets max:3
/ticket-admin set-panel-image url:https://your-image-url.com/banner.png
/ticket-admin set-language language:English
```

#### Step 5: Create the Ticket Panel

Deploy your ticket panel in a channel:
```
/ticket-panel
```

This creates a beautiful interactive panel where users can create tickets!

## 🎮 Commands Reference

### 👤 User Commands
- `/ticket-history` - View your past tickets
- `/ticket-stats personal` - View your personal statistics

### 👔 Staff Commands
- `/ticket-add <user>` - Add a user to the current ticket
- `/ticket-remove <user>` - Remove a user from the ticket
- `/ticket-transfer <staff>` - Transfer ticket to another staff member
- `/ticket-transcript [format]` - Export ticket chat (txt/html)
- `/ticket-note add <note>` - Add private staff note
- `/ticket-note view` - View all staff notes
- `/ticket-tag add <tag>` - Add tag to ticket
- `/ticket-tag remove <tag>` - Remove tag from ticket
- `/ticket-tag view` - View ticket tags
- `/ticket-search` - Search tickets with filters
  - Filter by: keyword, user, status, type, priority
- `/ticket-stats server` - View server statistics
- `/ticket-stats staff` - View staff leaderboard

### 👑 Admin Commands (`/ticket-admin`)

**Basic Setup:**
- `set-log-channel <channel>` - Set the log channel
- `add-staff-role <role>` - Add a staff role
- `remove-staff-role <role>` - Remove a staff role
- `set-category <type> <category>` - Set category for ticket type

**Ticket Settings:**
- `toggle-cooldown` - Enable/disable ticket cooldown
- `set-max-tickets <max>` - Set max tickets per user (1-10)
- `toggle-sla` - Enable/disable SLA tracking
- `set-sla-time <minutes>` - Set SLA response time
- `toggle-voice` - Enable/disable voice tickets
- `toggle-queue` - Enable/disable queue system
- `toggle-staff-alerts` - Enable/disable staff DM alerts

**Panel Customization:**
- `set-panel-image <url>` - Set custom panel banner
- `set-language <language>` - Set panel language
- `toggle-status` - Toggle support online/offline

**Other:**
- `reset-counter` - Reset ticket counter
- `view-config` - View current configuration

### 📊 Analytics Command
- `/ticket-analytics [period]` - View detailed analytics
  - Periods: Last 7 Days, Last 30 Days, Last 90 Days, All Time
  - Shows: Overview, response times, ratings, category breakdown, priority distribution, top staff

### 🔧 Bot Owner Commands

**Maintenance Mode** (`/maintenance`) - **Owner Only**
- `enable` - Disable all commands and ticket panel buttons for maintenance
- `disable` - Re-enable all bot features after maintenance
- `status` - Check if maintenance mode is currently active

**Note:** Only the user with the `BOT_OWNER_ID` can use maintenance commands. During maintenance mode:
- All slash commands are disabled (except `/maintenance`)
- All ticket panel buttons are disabled
- Users see a maintenance message when trying to interact
- The bot owner can still use all features normally

## 🎛️ Staff Panel Buttons

Inside each ticket, staff members can use:
- ✅ **Claim Ticket** - Claim ownership of the ticket
- 👥 **Add Member** - Add additional users (use `/ticket-add`)
- 🗒 **Request Info** - Ask the user for more information
- 📎 **Request Files** - Ask user to upload screenshots/logs
- 🎙️ **Create Voice Channel** - Start voice support session
- 🔒 **Close** - Close the ticket (auto-deletes after 10 seconds)
- ♻️ **Reopen** - Reopen a closed ticket

## 🏷️ Priority Levels

Tickets can be assigned one of four priority levels:
- 🟢 **Low** - Non-urgent, general inquiries
- 🟡 **Medium** - Standard issues needing attention
- 🟠 **High** - Important issues affecting usage
- 🔴 **Urgent** - Critical issues requiring immediate help

## 🏷️ Available Tags

Staff can add these tags to tickets:
- 🐛 **Bug** - Software bugs
- ✨ **Feature Request** - Feature suggestions
- 💳 **Billing** - Payment/billing issues
- 👤 **Account** - Account-related issues
- 🔧 **Technical** - Technical problems
- 🚨 **Urgent** - Needs immediate attention
- ✅ **Resolved** - Issue resolved
- ⬆️ **Escalated** - Escalated to higher support

## 📊 Statistics & Tracking

The bot tracks:
- Total tickets created (all-time and by period)
- Open vs. closed tickets
- Average response/close time
- Queue wait times
- Staff performance (tickets handled, avg response time)
- User ratings and feedback (1-5 stars)
- Ticket distribution by category, priority, and type
- SLA compliance metrics
- Peak hours and trends

## ⚙️ Configuration

Edit `config.json` to customize:
- Ticket category emojis and descriptions
- Priority level colors and emojis
- Auto-close timer (default: 24 hours)
- Cooldown period (default: 10 minutes)
- Max active tickets per user (default: 3)
- SLA time threshold (default: 30 minutes)
- Color scheme
- FAQ questions and answers
- Supported languages

## 📁 Data Storage

All data is stored in the `data/` directory:
- `tickets.json` - Active and closed tickets
- `serverConfig.json` - Server-specific configuration
- `staffStats.json` - Staff performance statistics
- `userCooldowns.json` - User cooldown tracking
- `feedback.json` - User ratings and feedback
- `transcripts.json` - Saved ticket transcripts
- `analytics.json` - Analytics and event logs
- `tags.json` - Ticket tags
- `staffNotes.json` - Private staff notes
- `maintenance.json` - Maintenance mode status

## 🔒 Required Permissions

The bot requires these Discord permissions:
- **Manage Channels** - To create ticket channels
- **Manage Roles** - To set channel permissions
- **Send Messages** - To communicate in tickets
- **Embed Links** - To display rich embeds
- **Attach Files** - To upload transcripts
- **Read Message History** - To read ticket conversations
- **Use Slash Commands** - To register and use commands
- **Connect** - For voice ticket support
- **Manage Messages** - To moderate ticket channels

## 🌐 Multi-Language Support

The bot supports panel translation in:
- 🇬🇧 English
- 🇪🇸 Español (Spanish)
- 🇫🇷 Français (French)
- 🇩🇪 Deutsch (German)
- 🇧🇷 Português (Portuguese)

Use `/ticket-admin set-language` to change the panel language.

## ⭐ Rating System

After tickets close, users receive a DM with a rating prompt:
- 1-5 star rating system
- Ratings are tracked and displayed on the panel
- Average rating shown in analytics dashboard
- Distribution of ratings available in analytics

## 🎙️ Voice Tickets

When enabled, staff can create voice channels for tickets:
1. Click "Create Voice Channel" button in ticket
2. Voice channel is created with same permissions
3. User and staff can join for voice support
4. Voice channel is deleted when ticket closes

## 📈 SLA Tracking

Service Level Agreement (SLA) tracking ensures timely responses:
- Configure response time threshold (default: 30 minutes)
- Alerts sent to log channel if tickets aren't claimed within SLA
- Track SLA breaches in analytics
- Staff notifications via DM when SLA is approaching

## 🔔 Staff Alerts

When enabled, staff receive DM notifications:
- New replies in their claimed tickets
- Message preview in the DM
- Quick link to jump to the message
- Attachment indicators

## 🔍 Search System

Powerful search with multiple filters:
- **Keyword** - Search in reason/description
- **User** - Find tickets by specific user
- **Status** - Open or closed tickets
- **Type** - Filter by category
- **Priority** - Filter by priority level
- **Date Range** - Find tickets within dates

## 📝 Transcripts

Export complete ticket history:
- **Text Format** - Plain text file
- **HTML Format** - Styled web page with timestamps
- Includes all messages, timestamps, and attachments
- Automatically saved to database
- Download with `/ticket-transcript`

## 🆘 Troubleshooting

**Bot not responding to commands?**
- Make sure the bot is online
- Check that slash commands are registered (wait a few minutes after starting)
- Verify the bot has proper permissions
- Ensure all three required intents are enabled in Developer Portal

**Tickets not creating?**
- Make sure categories are set up using `/ticket-admin set-category`
- Verify the bot has "Manage Channels" permission
- Check that staff roles are configured
- Ensure the bot role is higher than the roles it manages

**Panel not showing stats?**
- Use `/ticket-panel` to create or refresh the panel
- Click the "Refresh Stats" button on the panel
- Stats update automatically every time the panel is created/refreshed

**Commands not showing up?**
- Commands now auto-register when the bot joins new servers!
- Wait a few minutes for Discord to sync commands (usually instant)
- If commands still don't appear, restart the bot to re-register
- Check bot logs for any registration errors

**Voice tickets not working?**
- Ensure voice tickets are enabled: `/ticket-admin toggle-voice`
- Bot needs "Connect" permission
- Parent category must allow voice channels

**Staff not receiving DM alerts?**
- Enable staff alerts: `/ticket-admin toggle-staff-alerts`
- Staff must have DMs enabled from server members
- Bot needs permission to DM users

**Bot token error on startup?**
- Make sure you've set the `DISCORD_BOT_TOKEN` secret
- Verify your token is correct from the Developer Portal
- Don't include any extra spaces or quotes around the token

## 📦 Project Structure

```
discord-ticket-bot/
├── commands/           # All slash commands
│   ├── ticket-admin.js
│   ├── ticket-panel.js
│   ├── ticket-analytics.js
│   └── ...
├── events/            # Discord event handlers
│   ├── ready.js
│   ├── guildCreate.js
│   ├── interactionCreate.js
│   └── messageCreate.js
├── data/              # JSON data storage
│   ├── tickets.json
│   ├── serverConfig.json
│   ├── maintenance.json
│   └── ...
├── config.json        # Bot configuration
├── database.js        # Database handler
├── index.js           # Main bot file
└── package.json       # Dependencies
```

## 🛠️ Technical Details

**Built With:**
- Discord.js v14
- Node.js
- File-based JSON storage
- Slash command architecture

**Key Features:**
- Event-driven architecture
- Modular command structure
- Persistent data storage
- Real-time analytics
- Multi-server support

## 📜 License

This bot is provided as-is for use in Discord servers. Feel free to modify and customize it for your needs!

## 🎉 Credits

Built with Discord.js v14 featuring:
- Multi-tier priority system
- Comprehensive analytics
- SLA tracking and alerts
- Voice ticket support
- Multi-language panel
- Advanced search and filtering
- Ticket transcripts
- Rating system
- Staff performance tracking
- And much more!

---

**Need help?** Create a ticket in your Discord server using this bot! 🎫

**Having issues?** Check the troubleshooting section above or review the bot logs for error messages.
