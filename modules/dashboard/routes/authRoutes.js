const express = require('express');
const authUtils = require('../utils/authUtils');
const router = express.Router();

/**
 * GET /login - Show login page
 */
router.get('/login', (req, res) => {
    if (req.isAuthenticated() || (req.session && req.session.userId)) {
        return res.redirect('/');
    }
    res.render('login', {
        error: req.query.error || null,
        success: null
    });
});

/**
 * POST /login - Handle email/password login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password, remember } = req.body;

        if (!email || !password) {
            return res.render('login', {
                error: 'Email and password are required',
                success: null
            });
        }

        const result = await authUtils.authenticateUser(email, password);

        if (!result.success) {
            return res.render('login', {
                error: result.error,
                success: null
            });
        }

        // Set session
        req.session.userId = result.user.id;
        req.session.userEmail = email;
        req.session.username = result.user.username;

        // Remember me option
        if (remember === 'on') {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        req.session.save((err) => {
            if (err) {
                return res.render('login', {
                    error: 'Session save failed',
                    success: null
                });
            }
            res.redirect('/');
        });
    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.render('login', {
            error: 'An error occurred during login',
            success: null
        });
    }
});

/**
 * GET /register - Show registration page
 */
router.get('/register', (req, res) => {
    if (req.isAuthenticated() || (req.session && req.session.userId)) {
        return res.redirect('/');
    }
    res.render('register', {
        error: req.query.error || null
    });
});

/**
 * POST /register - Handle user registration
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, confirmPassword, username } = req.body;

        // Validate inputs
        if (!email || !password || !confirmPassword) {
            return res.render('register', {
                error: 'All fields are required'
            });
        }

        if (password !== confirmPassword) {
            return res.render('register', {
                error: 'Passwords do not match'
            });
        }

        // Validate password strength
        const validation = authUtils.validatePassword(password);
        if (!validation.isValid) {
            return res.render('register', {
                error: validation.errors[0] || 'Password does not meet requirements'
            });
        }

        // Create user
        const result = await authUtils.createUser(email, password, username);

        if (!result.success) {
            return res.render('register', {
                error: result.error
            });
        }

        // Auto-login after registration
        req.session.userId = result.user.id;
        req.session.userEmail = email;
        req.session.username = result.user.username;

        req.session.save((err) => {
            if (err) {
                return res.render('register', {
                    error: 'Session save failed'
                });
            }
            res.redirect('/?message=' + encodeURIComponent('Account created successfully!'));
        });
    } catch (err) {
        console.error('[Auth] Registration error:', err);
        res.render('register', {
            error: 'An error occurred during registration'
        });
    }
});

/**
 * GET /logout - Handle logout
 */
router.get('/logout', (req, res) => {
    // Clear email/password session
    req.session.destroy((err) => {
        if (err) {
            console.error('[Auth] Session destroy error:', err);
        }
        // Also logout Discord session
        req.logout((logoutErr) => {
            if (logoutErr) {
                console.error('[Auth] Logout error:', logoutErr);
            }
            res.redirect('/login');
        });
    });
});

/**
 * Middleware: Check authentication (both Discord and email/password)
 */
function checkAuth(req, res, next) {
    // Check Discord OAuth
    if (req.isAuthenticated()) {
        return next();
    }
    // Check email/password session
    if (req.session && req.session.userId) {
        return next();
    }
    // Not authenticated
    req.session.backURL = req.url;
    res.redirect('/login');
}

module.exports = {
    router,
    checkAuth
};
