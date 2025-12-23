# Staff Dashboard Setup Guide

## Overview
The dashboard is now **staff-only**. Only staff members with credentials you create can login.

## Creating Staff Accounts

### Method 1: Using the CLI Tool (Recommended)

```bash
node create-staff.js
```

Follow the prompts to create a new staff account:
- Enter staff email
- Enter username  
- Enter password (must meet requirements)
- Confirm password

**Password Requirements:**
- Minimum 6 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

### Method 2: Manual Database Setup

If needed, you can manually add staff to `dbs/dashboard_users.json`:

```json
{
  "users": {
    "staff@deadloom.com": {
      "id": "unique_id_here",
      "email": "staff@deadloom.com",
      "username": "staffname",
      "passwordHash": "hashed_password_here",
      "authMethod": "email",
      "createdAt": "2025-12-22T00:00:00.000Z",
      "lastLogin": "2025-12-22T00:00:00.000Z",
      "resetToken": null,
      "resetTokenExpires": null,
      "isStaff": true
    }
  }
}
```

## Dashboard Access

### Login URL
```
/login
```

### Authentication Methods
1. **Email/Password** - Staff credentials you create
2. **Discord OAuth** - Optional secondary method

### Session Management
- Default session: 7 days
- With "Remember me": 30 days

## Security Notes

✅ **What's Protected:**
- Only staff can create accounts
- Public registration is disabled
- All passwords are hashed with bcryptjs
- Sessions are secure and encrypted

✅ **Features Available:**
- Password reset via email link
- Account settings management
- Change password at any time
- Delete account option

## Account Management

### Change Password
1. Login to dashboard
2. Go to Account Settings
3. Click "Change Password"
4. Enter current password and new password

### Forgot Password
1. Go to `/forgot-password`
2. Enter registered email
3. Follow reset link
4. Set new password

### Delete Account
1. Login to dashboard
2. Go to Account Settings
3. Click "Delete Account" (permanent)

## Troubleshooting

**"Only staff members can access the dashboard"**
- The account was created as a regular user
- Delete and recreate using `node create-staff.js`

**"Email already exists"**
- Email is already registered
- Use a different email or reset password

**Password validation error**
- Password doesn't meet requirements
- Must have: uppercase, lowercase, number, 6+ characters
