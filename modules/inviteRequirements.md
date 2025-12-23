# Invite Requirements System

## Overview
Users must meet invite requirements to create bots. This system prevents bot farming and ensures engagement.

## Configuration (mainconfig.js)
```javascript
InviteRequirements: {
    RequiredInvites: 5,              // Number of valid invites needed
    Enabled: true,                    // Enable/disable the system
    BypassRoleID: "role_id"          // Role that bypasses requirement
}
```

## How It Works

### User Invite Validation
1. When a user tries to create a bot, the system checks their invites
2. Only counts invites the user created (invite.inviter.id === user.id)
3. Only counts invites with actual uses (people who joined via that invite)
4. Users with bypass role skip this check

### Tracking
- Each bot creation is tracked with invite count in `dbs/invite_tracking.json`
- Database records: userId, botName, invitesRequired, createdAt

### Bypass
- Users with `InviteRequirements.BypassRoleID` role skip the check
- Staff members can bypass by having this role

## Database Schema
```json
{
  "creations": [
    {
      "userId": "1234567890",
      "botName": "my-bot",
      "invitesRequired": 5,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

## API Reference

### inviteValidator.validateUserInvites(user, guild)
Validates if a user has enough invites.
- Returns: `{valid, invites, required, message}`

### database.trackBotCreationInvite(userId, botName, invitesRequired)
Track a bot creation with invite count.

### database.getUserBotCreations(userId)
Get all bot creations by a user.

## Environment Variables
```
REQUIRED_INVITES=5                    # Minimum invites needed
INVITE_CHECK_ENABLED=true             # Enable/disable validation
INVITE_BYPASS_ROLE_ID=role_id        # Role to bypass check
```
