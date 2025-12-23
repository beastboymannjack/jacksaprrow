const bcrypt = require('bcryptjs');
const fse = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../../..', 'dbs/dashboard_users.json');

/**
 * Load user database from file
 */
function loadDatabase() {
    try {
        if (!fse.existsSync(DB_PATH)) {
            fse.ensureFileSync(DB_PATH);
            fse.writeJsonSync(DB_PATH, { users: {} }, { spaces: 2 });
        }
        return fse.readJsonSync(DB_PATH);
    } catch (err) {
        console.error('[Auth] Error loading database:', err);
        return { users: {} };
    }
}

/**
 * Save user database to file
 */
function saveDatabase(db) {
    try {
        fse.writeJsonSync(DB_PATH, db, { spaces: 2 });
        return true;
    } catch (err) {
        console.error('[Auth] Error saving database:', err);
        return false;
    }
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    } catch (err) {
        console.error('[Auth] Error hashing password:', err);
        throw err;
    }
}

/**
 * Verify password with bcrypt
 */
async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (err) {
        console.error('[Auth] Error verifying password:', err);
        return false;
    }
}

/**
 * Validate password strength
 */
function validatePassword(password) {
    const errors = [];
    
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }
    if (password.length > 50) {
        errors.push('Password must be less than 50 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Create new staff user (admin only)
 */
async function createStaffUser(email, password, username) {
    try {
        const db = loadDatabase();
        const emailLower = email.toLowerCase();
        
        // Check if user exists
        if (db.users[emailLower]) {
            return { success: false, error: 'Email already exists' };
        }
        
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { success: false, error: 'Invalid email format' };
        }
        
        // Validate password
        const validation = validatePassword(password);
        if (!validation.isValid) {
            return { success: false, error: validation.errors[0] };
        }
        
        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Create staff user
        const userId = crypto.randomBytes(8).toString('hex');
        db.users[emailLower] = {
            id: userId,
            email: emailLower,
            username: username || emailLower.split('@')[0],
            passwordHash: passwordHash,
            authMethod: 'email',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            resetToken: null,
            resetTokenExpires: null,
            isStaff: true
        };
        
        saveDatabase(db);
        
        return {
            success: true,
            user: {
                id: userId,
                email: emailLower,
                username: db.users[emailLower].username,
                isStaff: true
            }
        };
    } catch (err) {
        console.error('[Auth] Error creating staff user:', err);
        return { success: false, error: 'Failed to create staff user' };
    }
}

/**
 * Create new user (disabled - staff only)
 */
async function createUser(email, password, username) {
    return { success: false, error: 'Registration is disabled. Contact staff for dashboard access.' };
}

/**
 * Find user by email
 */
function findUserByEmail(email) {
    try {
        const db = loadDatabase();
        const user = db.users[email.toLowerCase()];
        return user || null;
    } catch (err) {
        console.error('[Auth] Error finding user:', err);
        return null;
    }
}

/**
 * Find user by ID
 */
function findUserById(userId) {
    try {
        const db = loadDatabase();
        for (const email in db.users) {
            if (db.users[email].id === userId) {
                return db.users[email];
            }
        }
        return null;
    } catch (err) {
        console.error('[Auth] Error finding user by ID:', err);
        return null;
    }
}

/**
 * Authenticate user with email and password
 */
async function authenticateUser(email, password) {
    try {
        const user = findUserByEmail(email);
        
        if (!user || !user.passwordHash) {
            return { success: false, error: 'Invalid email or password' };
        }
        
        // Check if user is staff
        if (!user.isStaff) {
            return { success: false, error: 'Only staff members can access the dashboard' };
        }
        
        const passwordMatch = await verifyPassword(password, user.passwordHash);
        if (!passwordMatch) {
            return { success: false, error: 'Invalid email or password' };
        }
        
        // Update last login
        updateLastLogin(email);
        
        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isStaff: true
            }
        };
    } catch (err) {
        console.error('[Auth] Error authenticating user:', err);
        return { success: false, error: 'Authentication failed' };
    }
}

/**
 * Update last login time
 */
function updateLastLogin(email) {
    try {
        const db = loadDatabase();
        const user = db.users[email.toLowerCase()];
        if (user) {
            user.lastLogin = new Date().toISOString();
            saveDatabase(db);
        }
    } catch (err) {
        console.error('[Auth] Error updating last login:', err);
    }
}

/**
 * Link Discord account to email user
 */
function linkDiscordAccount(email, discordId) {
    try {
        const db = loadDatabase();
        const user = db.users[email.toLowerCase()];
        if (user) {
            user.discordId = discordId;
            saveDatabase(db);
            return true;
        }
        return false;
    } catch (err) {
        console.error('[Auth] Error linking Discord account:', err);
        return false;
    }
}

/**
 * Create or link Discord OAuth user
 */
function createOrLinkDiscordUser(discordId, username, email) {
    try {
        const db = loadDatabase();
        
        // Check if Discord ID already exists
        for (const userEmail in db.users) {
            if (db.users[userEmail].discordId === discordId) {
                return { success: true, user: db.users[userEmail], created: false };
            }
        }
        
        // Create new Discord-only user
        const userId = crypto.randomBytes(8).toString('hex');
        const uniqueEmail = `discord_${discordId}@bot.system`;
        
        db.users[uniqueEmail] = {
            id: userId,
            email: uniqueEmail,
            username: username,
            discordId: discordId,
            passwordHash: null,
            authMethod: 'discord',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            resetToken: null,
            resetTokenExpires: null
        };
        
        saveDatabase(db);
        
        return {
            success: true,
            user: db.users[uniqueEmail],
            created: true
        };
    } catch (err) {
        console.error('[Auth] Error creating/linking Discord user:', err);
        return { success: false, error: 'Failed to process Discord login' };
    }
}

/**
 * Create password reset token
 */
function createResetToken(email) {
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const db = loadDatabase();
        const user = db.users[email.toLowerCase()];
        
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        
        // Store reset token with 1 hour expiration
        user.resetToken = token;
        user.resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        
        saveDatabase(db);
        return { success: true, token };
    } catch (err) {
        console.error('[Auth] Error creating reset token:', err);
        return { success: false, error: 'Failed to create reset token' };
    }
}

/**
 * Verify and use reset token
 */
async function resetPasswordWithToken(token, newPassword) {
    try {
        const db = loadDatabase();
        
        // Find user with reset token
        let user = null;
        let userEmail = null;
        
        for (const email in db.users) {
            if (db.users[email].resetToken === token) {
                user = db.users[email];
                userEmail = email;
                break;
            }
        }
        
        if (!user) {
            return { success: false, error: 'Invalid reset token' };
        }
        
        // Check if token expired
        if (user.resetTokenExpires < Date.now()) {
            return { success: false, error: 'Reset link has expired' };
        }
        
        // Validate new password
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            return { success: false, error: validation.errors[0] };
        }
        
        // Hash and update password
        const hashedPassword = await hashPassword(newPassword);
        user.passwordHash = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpires = null;
        
        saveDatabase(db);
        return { success: true, message: 'Password reset successfully' };
    } catch (err) {
        console.error('[Auth] Error resetting password:', err);
        return { success: false, error: 'Failed to reset password' };
    }
}

/**
 * Check if reset token is valid
 */
function verifyResetToken(token) {
    try {
        const db = loadDatabase();
        
        for (const email in db.users) {
            const user = db.users[email];
            if (user.resetToken === token && user.resetTokenExpires > Date.now()) {
                return { valid: true, email: email };
            }
        }
        
        return { valid: false, error: 'Invalid or expired token' };
    } catch (err) {
        console.error('[Auth] Error verifying reset token:', err);
        return { valid: false, error: 'Token verification failed' };
    }
}

/**
 * Update username
 */
function updateUsername(email, newUsername) {
    try {
        if (!newUsername || newUsername.length < 2 || newUsername.length > 30) {
            return { success: false, error: 'Username must be 2-30 characters' };
        }
        
        const db = loadDatabase();
        const user = db.users[email.toLowerCase()];
        
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        
        user.username = newUsername;
        saveDatabase(db);
        return { success: true, message: 'Username updated successfully' };
    } catch (err) {
        console.error('[Auth] Error updating username:', err);
        return { success: false, error: 'Failed to update username' };
    }
}

/**
 * Change password for logged-in user
 */
async function changePassword(email, currentPassword, newPassword) {
    try {
        const user = findUserByEmail(email);
        
        if (!user || !user.passwordHash) {
            return { success: false, error: 'User not found' };
        }
        
        // Verify current password
        const passwordMatch = await verifyPassword(currentPassword, user.passwordHash);
        if (!passwordMatch) {
            return { success: false, error: 'Current password is incorrect' };
        }
        
        // Validate new password
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            return { success: false, error: validation.errors[0] };
        }
        
        // Check if new password is same as old
        if (currentPassword === newPassword) {
            return { success: false, error: 'New password must be different from current password' };
        }
        
        // Hash and update
        const hashedPassword = await hashPassword(newPassword);
        const db = loadDatabase();
        db.users[email.toLowerCase()].passwordHash = hashedPassword;
        saveDatabase(db);
        
        return { success: true, message: 'Password changed successfully' };
    } catch (err) {
        console.error('[Auth] Error changing password:', err);
        return { success: false, error: 'Failed to change password' };
    }
}

/**
 * Get user account info
 */
function getUserInfo(email) {
    try {
        const user = findUserByEmail(email);
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        
        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                authMethod: user.authMethod,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                hasPassword: !!user.passwordHash
            }
        };
    } catch (err) {
        console.error('[Auth] Error getting user info:', err);
        return { success: false, error: 'Failed to retrieve user info' };
    }
}

module.exports = {
    hashPassword,
    verifyPassword,
    createUser,
    createStaffUser,
    findUserByEmail,
    findUserById,
    authenticateUser,
    linkDiscordAccount,
    createOrLinkDiscordUser,
    updateLastLogin,
    validatePassword,
    createResetToken,
    resetPasswordWithToken,
    verifyResetToken,
    updateUsername,
    changePassword,
    getUserInfo,
    loadDatabase,
    saveDatabase
};
