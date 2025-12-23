const express = require("express");
const http = require("http");
const url = require(`url`);
const path = require(`path`);
const ejs = require("ejs");
const fse = require('fs-extra');
const fs = require("fs")
const passport = require(`passport`);
const bodyParser = require("body-parser");
const Strategy = require(`passport-discord`).Strategy;
const Discord = require('discord.js');
const Path = require("path");
const config = require("../../config.json")
const mainconfig = require("../../mainconfig")
const botProcessManager = require('../botProcessManager');
const db = require('../database');
const sharedDbApi = require('../api/sharedDbApi');
const remoteBotClient = require('../api/remoteBotClient');
const botStatusMonitor = require('../botStatusMonitor');
const { parseExpirationInput, formatDuration, getExpirationDate } = require('../utils/timeParser');
const codeDB = require('../codeshare/codeDatabase');
const multer = require('multer');
const authUtils = require('./utils/authUtils');
const codeUpload = multer({ 
    dest: 'dbs/codeshare/uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

const getDashboardDomain = () => {
    if (process.env.REPLIT_DEV_DOMAIN) {
        return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    }
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    }
    if (process.env.DASHBOARD_URL) {
        return process.env.DASHBOARD_URL.replace(/\/$/, '');
    }
    return null;
};

module.exports = client => {
    let milratoGuild = null;
    let botReady = false;
    
    const app = express();
    const session = require(`express-session`);
    const MemoryStore = require(`memorystore`)(session);
    
    app.set('trust proxy', 1);

    const dashboardDomain = getDashboardDomain();
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || config.secret || null;
    const clientId = process.env.DISCORD_CLIENT_ID || null;
    
    // Debug secret loading
    if (!clientSecret) {
        console.log('[Dashboard] Checking for client secret in environment...');
        console.log('[Dashboard] DISCORD_CLIENT_SECRET env:', process.env.DISCORD_CLIENT_SECRET ? 'Set (hidden)' : 'Not set');
        console.log('[Dashboard] config.secret:', config.secret ? 'Set (hidden)' : 'Not set');
    }
    
    let callbackURL;
    if (process.env.DISCORD_CALLBACK_URL) {
        callbackURL = process.env.DISCORD_CALLBACK_URL;
    } else if (dashboardDomain) {
        callbackURL = `${dashboardDomain}/callback`;
    } else if (config.callback) {
        callbackURL = config.callback;
    } else {
        callbackURL = 'http://localhost:5000/callback';
    }
    
    console.log("[Dashboard] Starting dashboard server...".brightGreen);
    console.log(`[Dashboard] Using callback URL: ${callbackURL}`);
    console.log(`[Dashboard] Client Secret configured: ${clientSecret ? 'YES' : 'NO - Please set DISCORD_CLIENT_SECRET'}`);
    console.log(`[Dashboard] Client ID from env: ${clientId ? 'Yes' : 'No - will use bot ID when ready'}`);
    
    if (!clientSecret) {
        console.warn('[Dashboard] WARNING: DISCORD_CLIENT_SECRET is not set. OAuth login may not work.');
        console.warn('[Dashboard] To enable OAuth login, add your Discord application client secret to the Secrets tab.');
    }
    
    client.dashboardURL = dashboardDomain || (config.callback ? config.callback.replace('/callback', '') : 'http://localhost:5000');
    client.callbackURL = callbackURL;

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));
    
    if (clientId && clientSecret) {
        passport.use(
            new Strategy({
                clientID: clientId,
                clientSecret: clientSecret,
                callbackURL: callbackURL,
                scope: [`identify`]
            },
            (accessToken, refreshToken, profile, done) => {
                process.nextTick(() => done(null, profile));
            }));
        console.log(`[Dashboard] OAuth strategy pre-configured with env client ID: ${clientId}`);
    }
    
    const isReplitEnv = !!(process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG);
    const sessionConfig = {
        store: new MemoryStore({ checkPeriod: 86400000 }),
        secret: process.env.SESSION_SECRET || 'discord-bot-dashboard-secret-' + Date.now(),
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: isReplitEnv ? 'none' : 'lax',
            secure: isReplitEnv,
            httpOnly: true
        }
    };
    
    app.use(session(sessionConfig));
    app.use(passport.initialize());
    app.use(passport.session());
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, './views'))
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', express.static(__dirname + '/views'));
    app.use("/", express.static(__dirname + '/', {dotfiles: "allow"}));
    app.use('/', express.static(__dirname + '/public'));
    
    app.get('/favicon.ico', (req, res) => res.status(204).end());
    
    const checkAuthLegacy = (req, res, next) => {
        // Check Discord OAuth
        if (req.isAuthenticated()) return next();
        // Check email/password session
        if (req.session && req.session.userId) return next();
        // Not authenticated
        req.session.backURL = req.url;
        res.redirect("/login");
    };
    
    const setupPassportStrategy = (botClientId) => {
        if (!botClientId || !clientSecret) {
            console.warn('[Dashboard] Cannot setup OAuth - missing client ID or secret');
            return false;
        }
        try {
            passport.use(
                new Strategy({
                    clientID: botClientId,
                    clientSecret: clientSecret,
                    callbackURL: callbackURL,
                    scope: [`identify`]
                },
                (accessToken, refreshToken, profile, done) => {
                    process.nextTick(() => done(null, profile));
                }));
            console.log(`[Dashboard] OAuth strategy configured with client ID: ${botClientId}`);
            return true;
        } catch (err) {
            console.error('[Dashboard] Failed to setup OAuth strategy:', err);
            return false;
        }
    };
    
    app.get(`/login`, (req, res, next) => {
        const effectiveClientId = clientId || (client.user ? client.user.id : null);
        if (!clientSecret) {
            return res.render("index", {
                req: req,
                user: null,
                botClient: { user: { displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png', tag: 'Bot' }, ws: { ping: 0 }, createingbotmap: new Map() },
                callback: callbackURL,
                BotConfig: client.config || config,
                botStats: botProcessManager.getHostedBotStats(),
                botReady: false,
                loginError: "OAuth is not configured. Please set DISCORD_CLIENT_SECRET in your environment secrets."
            });
        }
        if (!effectiveClientId) {
            return res.render("index", {
                req: req,
                user: null,
                botClient: { user: { displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png', tag: 'Bot (connecting...)' }, ws: { ping: 0 }, createingbotmap: new Map() },
                callback: callbackURL,
                BotConfig: client.config || config,
                botStats: botProcessManager.getHostedBotStats(),
                botReady: false,
                loginError: "Bot is still connecting to Discord. Please wait a moment and try again."
            });
        }
        if (req.session.backURL) {
            req.session.backURL = req.session.backURL;
        } else if (req.headers.referer) {
            const parsed = url.parse(req.headers.referer);
            if (parsed.hostname === app.locals.domain) { req.session.backURL = parsed.path; }
        } else { req.session.backURL = `/`; }
        next();
    }, passport.authenticate(`discord`, {
        prompt: `consent`
    }));
    
    app.get(`/auth-status`, (req, res) => {
        res.json({
            authenticated: req.isAuthenticated(),
            user: req.user ? { id: req.user.id, username: req.user.username } : null,
            callbackURL: callbackURL,
            dashboardDomain: dashboardDomain,
            botReady: botReady,
            clientID: client.user ? client.user.id : null,
            secretConfigured: !!clientSecret
        });
    });
    
    app.get(`/callback`, (req, res, next) => {
        if (!botReady) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Bot is still connecting. Please wait and try again."));
        }
        passport.authenticate(`discord`, (err, user, info) => {
            if (err) {
                console.error('[Dashboard] OAuth error:', err);
                return res.redirect(`/?error=auth_failed&message=` + encodeURIComponent(err.message || 'Authentication failed'));
            }
            if (!user) {
                console.warn('[Dashboard] OAuth callback: No user returned');
                return res.redirect(`/?error=no_user&message=` + encodeURIComponent('No user data received from Discord'));
            }
            req.logIn(user, (loginErr) => {
                if (loginErr) {
                    console.error('[Dashboard] Login error:', loginErr);
                    return res.redirect(`/?error=login_failed&message=` + encodeURIComponent(loginErr.message || 'Login failed'));
                }
                console.log(`[Dashboard] User ${user.username}#${user.discriminator} logged in successfully`);
                const backURL = req.session.backURL || '/';
                delete req.session.backURL;
                return res.redirect(backURL);
            });
        })(req, res, next);
    });
    
    app.get("/", checkAuthLegacy, async (req, res) => {
        // Serve dashboard at root - protected by authentication
        res.render("bots-dashboard", {
            req: req,
            user: req.isAuthenticated() ? req.user : null,
            milratoGuild: milratoGuild,
            botClient: client
        });
    });
    
    app.get(`/logout`, function (req, res) {
        // Clear both session types
        req.session.destroy((err) => {
            if (err) { console.error(err); }
            req.logout((logoutErr) => {
                if (logoutErr) { console.error(logoutErr); }
                res.redirect(`/login`);
            });
        });
    });

    // Register page - DISABLED (Staff only - use CLI to create accounts)
    app.get('/register', (req, res) => {
        return res.render('login', { 
            error: 'Registration is disabled. Contact your administrator for dashboard access.', 
            success: null 
        });
    });

    // Register POST - DISABLED (Staff only)
    app.post('/register', async (req, res) => {
        return res.render('login', { 
            error: 'Registration is disabled. Contact your administrator for dashboard access.', 
            success: null 
        });
    });

    // Login POST - Handle email/password login
    app.post('/login', async (req, res) => {
        try {
            // Check if it's Discord OAuth redirect
            if (req.body.provider === 'discord') {
                return res.redirect('/auth/discord');
            }

            const { email, password, rememberMe } = req.body;
            
            const result = await authUtils.authenticateUser(email, password);
            
            if (!result.success) {
                return res.render('login', { 
                    error: result.error, 
                    success: null 
                });
            }
            
            // Set up session
            req.session.userId = result.user.id;
            req.session.userEmail = email;
            req.session.username = result.user.username;
            
            // Handle "Remember me"
            if (rememberMe) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            }
            
            console.log(`[Dashboard] User ${result.user.username} logged in successfully`);
            const backURL = req.session.backURL || '/';
            delete req.session.backURL;
            res.redirect(backURL);
        } catch (err) {
            console.error('[Auth] Login error:', err);
            res.render('login', { error: 'An error occurred during login', success: null });
        }
    });

    // Forgot password route
    app.get('/forgot-password', (req, res) => {
        if (req.isAuthenticated() || (req.session && req.session.userId)) {
            return res.redirect('/');
        }
        res.render('forgot-password', { error: null, success: null });
    });

    app.post('/forgot-password', async (req, res) => {
        try {
            const { email } = req.body;
            const result = authUtils.createResetToken(email);
            
            if (!result.success) {
                return res.render('forgot-password', { 
                    error: 'Email not found or error occurred', 
                    success: null 
                });
            }

            // In production, send email with reset link
            const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${result.token}`;
            console.log(`[Auth] Password reset link: ${resetUrl}`);
            
            res.render('forgot-password', {
                error: null,
                success: 'If an account exists, a reset link has been sent to your email (check console in dev mode)'
            });
        } catch (err) {
            console.error('[Auth] Forgot password error:', err);
            res.render('forgot-password', { error: 'An error occurred', success: null });
        }
    });

    // Reset password with token
    app.get('/reset-password/:token', (req, res) => {
        const { token } = req.params;
        const validation = authUtils.verifyResetToken(token);
        
        if (!validation.valid) {
            return res.render('reset-password', { 
                error: 'Invalid or expired reset link', 
                success: null,
                token: null
            });
        }
        
        res.render('reset-password', { error: null, success: null, token });
    });

    app.post('/reset-password/:token', async (req, res) => {
        try {
            const { token } = req.params;
            const { password, confirmPassword } = req.body;
            
            if (password !== confirmPassword) {
                return res.render('reset-password', {
                    error: 'Passwords do not match',
                    success: null,
                    token
                });
            }
            
            const result = await authUtils.resetPasswordWithToken(token, password);
            
            if (!result.success) {
                return res.render('reset-password', {
                    error: result.error,
                    success: null,
                    token
                });
            }
            
            res.render('reset-password', {
                error: null,
                success: 'Password reset successfully! You can now login with your new password.',
                token: null
            });
        } catch (err) {
            console.error('[Auth] Reset password error:', err);
            res.render('reset-password', {
                error: 'An error occurred',
                success: null,
                token: req.params.token
            });
        }
    });

    // Account Settings Page
    app.get('/account-settings', checkAuthLegacy, (req, res) => {
        try {
            let userInfo;
            if (req.isAuthenticated()) {
                // Discord user
                userInfo = {
                    email: req.user.email || `discord_${req.user.id}@bot.system`,
                    username: req.user.username,
                    authMethod: 'discord',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    discordId: req.user.id,
                    hasPassword: false
                };
            } else if (req.session?.userId) {
                // Email user
                const userResult = authUtils.getUserInfo(req.session.userEmail);
                if (!userResult.success) {
                    return res.redirect('/?error=true&message=' + encodeURIComponent('User not found'));
                }
                userInfo = userResult.user;
            } else {
                return res.redirect('/login');
            }

            res.render('account-settings', {
                userInfo: userInfo,
                messages: {
                    usernameError: req.query.usernameError || null,
                    usernameSuccess: req.query.usernameSuccess || null,
                    passwordError: req.query.passwordError || null,
                    passwordSuccess: req.query.passwordSuccess || null
                }
            });
        } catch (err) {
            console.error('[Auth] Account settings error:', err);
            res.redirect('/?error=true&message=' + encodeURIComponent('An error occurred'));
        }
    });

    // Update Username
    app.post('/account-settings/update-username', checkAuthLegacy, (req, res) => {
        try {
            const { username } = req.body;
            const userEmail = req.session?.userEmail;

            if (!userEmail) {
                return res.redirect('/account-settings?usernameError=' + 
                    encodeURIComponent('Email/password users only'));
            }

            const result = authUtils.updateUsername(userEmail, username);
            
            if (!result.success) {
                return res.redirect('/account-settings?usernameError=' + 
                    encodeURIComponent(result.error));
            }

            // Update session
            req.session.username = username;
            
            res.redirect('/account-settings?usernameSuccess=' + 
                encodeURIComponent('Username updated successfully'));
        } catch (err) {
            console.error('[Auth] Update username error:', err);
            res.redirect('/account-settings?usernameError=' + 
                encodeURIComponent('An error occurred'));
        }
    });

    // Change Password
    app.post('/account-settings/change-password', checkAuthLegacy, async (req, res) => {
        try {
            const { currentPassword, newPassword, confirmPassword } = req.body;
            const userEmail = req.session?.userEmail;

            if (!userEmail) {
                return res.redirect('/account-settings?passwordError=' + 
                    encodeURIComponent('Email/password users only'));
            }

            if (newPassword !== confirmPassword) {
                return res.redirect('/account-settings?passwordError=' + 
                    encodeURIComponent('New passwords do not match'));
            }

            const result = await authUtils.changePassword(userEmail, currentPassword, newPassword);
            
            if (!result.success) {
                return res.redirect('/account-settings?passwordError=' + 
                    encodeURIComponent(result.error));
            }

            res.redirect('/account-settings?passwordSuccess=' + 
                encodeURIComponent('Password changed successfully'));
        } catch (err) {
            console.error('[Auth] Change password error:', err);
            res.redirect('/account-settings?passwordError=' + 
                encodeURIComponent('An error occurred'));
        }
    });

    // Delete Account
    app.post('/account-settings/delete-account', checkAuthLegacy, (req, res) => {
        try {
            const userEmail = req.session?.userEmail;

            if (!userEmail) {
                return res.redirect('/?error=true&message=' + 
                    encodeURIComponent('Email/password users only'));
            }

            const db = authUtils.loadDatabase();
            delete db.users[userEmail.toLowerCase()];
            authUtils.saveDatabase(db);

            // Logout
            req.session.destroy(() => {
                res.redirect('/login?message=' + 
                    encodeURIComponent('Account deleted successfully'));
            });
        } catch (err) {
            console.error('[Auth] Delete account error:', err);
            res.redirect('/account-settings?error=' + 
                encodeURIComponent('An error occurred'));
        }
    });

    app.get("/team", checkAuthLegacy, async (req, res) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Login First!"));
        }
        
        const mockClient = {
            user: client.user || { displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png', tag: 'Bot' },
            ws: client.ws || { ping: 0 },
            createingbotmap: client.createingbotmap || new Map()
        };
        
        res.render("team", {
            req: req,
            user: req.isAuthenticated() ? req.user : null,
            milratoGuild: milratoGuild,
            botClient: mockClient,
        });
    });

    app.get("/staff", checkAuthLegacy, async (req, res) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Login First!"));
        }
        if (!milratoGuild) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Bot is still connecting to Discord. Please wait."));
        }
        let member = milratoGuild.members.cache.get(req.user.id);
        if (!member) {
            try {
                member = await milratoGuild.members.fetch(req.user.id);
            } catch (err) {
                console.error(`Couldn't fetch ${req.user.id} in ${milratoGuild.name}: ${err}`);
            }
        }
        if (!member) return res.redirect("/?error=true&message=" + encodeURIComponent("User not found in the server. Please join the server first."));
        if (member && !member.permissions.has("ADMINISTRATOR") && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`) && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.ModRoleId}`) &&
            !member.roles.cache.has(`${mainconfig.ServerRoles.AdminRoleId}`) &&
            !member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`))
            return res.redirect("/?error=true&message=" + encodeURIComponent("You Are Not Allowed To Manage."));
        res.render("staff", {
            req: req,
            user: req.isAuthenticated() ? req.user : null,
            milratoGuild: milratoGuild,
            botClient: client,
            callback: callbackURL,
            BotConfig: client.config || config,
        });
    });
    
    app.get("/profile", checkAuthLegacy, async (req, res) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Login First!"));
        }
        if (!milratoGuild) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Bot is still connecting to Discord. Please wait."));
        }
        let member = milratoGuild.members.cache.get(req.user.id);
        if (!member) {
            try {
                member = await milratoGuild.members.fetch(req.user.id);
            } catch (err) {
                console.error(`Couldn't fetch ${req.user.id} in ${milratoGuild.name}: ${err}`);
            }
        }
        if (!member) return res.redirect("/?error=true&message=" + encodeURIComponent("User not found in server. Please join the server first."));
        if (member && !member.permissions.has("ADMINISTRATOR") && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.NewSupporterRoleId}`) && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`) && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.ModRoleId}`) &&
            !member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`) &&
            req.user.id !== mainconfig.BotOwnerID)
            return res.redirect("/?error=true&message=" + encodeURIComponent("You Are Not Allowed To Manage."));
        res.render("profile", {
            req: req,
            user: req.isAuthenticated() ? req.user : null,
            milratoGuild: milratoGuild,
            botClient: client,
            callback: callbackURL,
            BotConfig: client.config || config,
        });
    });

    app.get("/managebots", checkAuthLegacy, async (req, res) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Login First!"));
        }
        if (!milratoGuild) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Bot is still connecting to Discord. Please wait."));
        }
        let member = milratoGuild.members.cache.get(req.user.id);
        if (!member) {
            try {
                member = await milratoGuild.members.fetch(req.user.id);
            } catch (err) {
                console.error(`Couldn't fetch ${req.user.id} in ${milratoGuild.name}: ${err}`);
            }
        }
        if (!member) return res.redirect("/?error=true&message=" + encodeURIComponent("No Information Found. Please Contact The Owner"));
        if (!member.permissions.has("ADMINISTRATOR") && !member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) && !member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`) && !member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`))
            return res.redirect("/?error=true&message=" + encodeURIComponent("You Are Not Allowed To Manage."));
        const hostedBots = botProcessManager.getAllHostedBots();
        const botStats = botProcessManager.getHostedBotStats();
        res.render("managebots", {
            req: req,
            user: req.isAuthenticated() ? req.user : null,
            milratoGuild: milratoGuild,
            botClient: client,
            hostedBots: hostedBots,
            botStats: botStats,
            remoteConfigured: remoteBotClient.isConfigured()
        });
    });

    const addLog = async (action, botName, message, status, userId = null) => {
        await db.addDeploymentLog({
            botName,
            action,
            status,
            message,
            userId
        });
    };

    app.get("/logs", checkAuthLegacy, async (req, res) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Login First!"));
        }
        if (!milratoGuild) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Bot is still connecting to Discord. Please wait."));
        }
        let member = milratoGuild.members.cache.get(req.user.id);
        if (!member) {
            try {
                member = await milratoGuild.members.fetch(req.user.id);
            } catch (err) {
                console.error(`Couldn't fetch ${req.user.id} in ${milratoGuild.name}: ${err}`);
            }
        }
        if (!member) return res.redirect("/?error=true&message=" + encodeURIComponent("No Information Found. Please Contact The Owner"));
        if (!member.permissions.has("ADMINISTRATOR") && !member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) && !member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`) && !member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`))
            return res.redirect("/?error=true&message=" + encodeURIComponent("You Are Not Allowed To Manage."));
        const logs = await db.getDeploymentLogs(100);
        const formattedLogs = logs.map(log => ({
            action: log.action,
            botName: log.bot_name,
            message: log.message,
            status: log.status,
            timestamp: log.created_at
        }));
        res.render("logs", {
            req: req,
            user: req.isAuthenticated() ? req.user : null,
            milratoGuild: milratoGuild,
            botClient: client,
            logs: formattedLogs,
        });
    });

    // Public bots dashboard (no auth required for demo)
    app.get("/bots-dashboard", async (req, res) => {
        res.render("bots-dashboard", {
            req: req,
            user: req.isAuthenticated() ? req.user : null,
            milratoGuild: milratoGuild,
            botClient: client
        });
    });

    app.get("/bots-dashboard-secure", checkAuthLegacy, async (req, res) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Login First!"));
        }
        if (!milratoGuild) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Bot is still connecting to Discord. Please wait."));
        }
        let member = milratoGuild.members.cache.get(req.user.id);
        if (!member) {
            try {
                member = await milratoGuild.members.fetch(req.user.id);
            } catch (err) {
                console.error(`Couldn't fetch ${req.user.id} in ${milratoGuild.name}: ${err}`);
            }
        }
        if (!member) return res.redirect("/?error=true&message=" + encodeURIComponent("No Information Found. Please Contact The Owner"));
        if (!member.permissions.has("ADMINISTRATOR") && !member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) && !member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`) && !member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`))
            return res.redirect("/?error=true&message=" + encodeURIComponent("You Are Not Allowed To Manage."));
        res.render("bots-dashboard", {
            req: req,
            user: req.isAuthenticated() ? req.user : null,
            milratoGuild: milratoGuild,
            botClient: client
        });
    });

    app.get("/dashboard/codeshare", checkAuthLegacy, async (req, res) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.redirect("/?error=true&message=" + encodeURIComponent("Login First!"));
        }
        
        const isOwner = req.user.id === mainconfig.BotOwnerID;
        if (!isOwner) {
            let member = milratoGuild ? milratoGuild.members.cache.get(req.user.id) : null;
            if (milratoGuild && !member) {
                try { member = await milratoGuild.members.fetch(req.user.id); } catch (e) {}
            }
            if (!member || (!member.roles.cache.has(mainconfig.ServerRoles.FounderId) && !member.permissions.has("ADMINISTRATOR"))) {
                return res.redirect("/?error=true&message=" + encodeURIComponent("Only owners can access code share management."));
            }
        }
        
        const codes = codeDB.getAllCodes();
        const analytics = codeDB.getAnalytics();
        
        res.render("codeshare", {
            req: req,
            user: req.user,
            milratoGuild: milratoGuild,
            botClient: client,
            codes: codes,
            analytics: analytics
        });
    });

    app.post("/dashboard/codeshare/create", checkAuthLegacy, codeUpload.array('files', 5), async (req, res) => {
        try {
            const { name, description, language, category, videoLink, codeContent } = req.body;
            
            const files = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const newPath = `dbs/codeshare/uploads/${Date.now()}_${file.originalname}`;
                    fs.renameSync(file.path, newPath);
                    files.push({
                        name: file.originalname,
                        path: newPath,
                        size: file.size
                    });
                }
            }
            
            const newCode = codeDB.createCode({
                name,
                description,
                language: language || 'javascript',
                category: category || 'general',
                videoLink,
                codeContent,
                files: files,
                createdBy: req.user.id
            });
            
            res.redirect("/dashboard/codeshare");
        } catch (err) {
            res.redirect("/dashboard/codeshare?error=" + encodeURIComponent(err.message));
        }
    });

    app.get("/dashboard/codeshare/:id", checkAuthLegacy, async (req, res) => {
        const code = codeDB.getCodeById(req.params.id);
        if (!code) {
            return res.redirect("/dashboard/codeshare?error=" + encodeURIComponent("Code not found"));
        }
        
        res.render("codeshare-view", {
            req: req,
            user: req.user,
            milratoGuild: milratoGuild,
            botClient: client,
            code: code
        });
    });

    app.post("/dashboard/codeshare/:id/delete", checkAuthLegacy, async (req, res) => {
        try {
            const result = codeDB.deleteCode(req.params.id);
            res.json({ success: result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    const checkApiAuth = (req, res, next) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        next();
    };

    const checkBotManagerAuth = async (req, res, next) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        if (!milratoGuild) {
            return res.status(503).json({ success: false, error: 'Bot is still connecting to Discord' });
        }
        let member = milratoGuild.members.cache.get(req.user.id);
        if (!member) {
            try {
                member = await milratoGuild.members.fetch(req.user.id);
            } catch (err) {
                return res.status(403).json({ success: false, error: 'User not found in server' });
            }
        }
        if (!member) return res.status(403).json({ success: false, error: 'User not found in server' });
        if (!member.permissions.has("ADMINISTRATOR") && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`) && 
            !member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`)) {
            return res.status(403).json({ success: false, error: 'You do not have permission to manage bots' });
        }
        next();
    };

    const validateBotPath = (botPath) => {
        if (!botPath || typeof botPath !== 'string') return false;
        const resolvedPath = Path.resolve(botPath);
        const isNotTemplate = !resolvedPath.includes('/template');
        return isNotTemplate;
    };

    app.post("/api/bot/start", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            const { path: botPath } = req.body;
            if (!validateBotPath(botPath)) {
                return res.json({ success: false, error: 'Invalid bot path' });
            }
            const result = await botProcessManager.startBot(botPath, true);
            res.json({ success: true, ...result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    app.post("/api/bot/stop", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            const { path: botPath } = req.body;
            if (!validateBotPath(botPath)) {
                return res.json({ success: false, error: 'Invalid bot path' });
            }
            const result = await botProcessManager.stopBot(botPath);
            res.json({ success: true, ...result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    app.post("/api/bot/restart", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            const { path: botPath } = req.body;
            if (!validateBotPath(botPath)) {
                return res.json({ success: false, error: 'Invalid bot path' });
            }
            const result = await botProcessManager.restartBot(botPath);
            res.json({ success: true, ...result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    app.post("/api/bot/delete", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            const { path: botPath } = req.body;
            if (!validateBotPath(botPath)) {
                return res.json({ success: false, error: 'Invalid bot path' });
            }
            const result = await botProcessManager.deleteBot(botPath);
            res.json({ success: true, ...result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    app.get("/api/remote/health", checkApiAuth, async (req, res) => {
        try {
            if (!remoteBotClient.isConfigured()) {
                return res.json({ success: false, configured: false, error: 'Remote hosting not configured' });
            }
            const isHealthy = await remoteBotClient.checkHealth();
            res.json({ success: true, configured: true, healthy: isHealthy, url: remoteBotClient.getRemoteUrl() });
        } catch (err) {
            res.json({ success: false, configured: true, healthy: false, error: err.message });
        }
    });

    app.get("/api/remote/bots", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            if (!remoteBotClient.isConfigured()) {
                return res.json({ success: false, error: 'Remote hosting not configured', bots: [] });
            }
            const bots = await remoteBotClient.listBots();
            res.json({ success: true, bots });
        } catch (err) {
            res.json({ success: false, error: err.message, bots: [] });
        }
    });

    app.post("/api/remote/bots/:botKey/start", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            const result = await remoteBotClient.startBot(req.params.botKey);
            res.json({ success: true, ...result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    app.post("/api/remote/bots/:botKey/stop", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            const result = await remoteBotClient.stopBot(req.params.botKey);
            res.json({ success: true, ...result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    app.post("/api/remote/bots/:botKey/restart", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            const result = await remoteBotClient.restartBot(req.params.botKey);
            res.json({ success: true, ...result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    app.delete("/api/remote/bots/:botKey", checkApiAuth, checkBotManagerAuth, async (req, res) => {
        try {
            const result = await remoteBotClient.deleteBot(req.params.botKey);
            res.json({ success: true, ...result });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    });

    app.get("/createbot", checkAuthLegacy, async (req, res) => {
        try {
            if (!botReady) {
                return res.redirect("/?error=true&message=" + encodeURIComponent("Bot is still connecting to Discord. Please wait."));
            }
            
            let member = milratoGuild ? milratoGuild.members.cache.get(req.user.id) : null;
            if (milratoGuild && !member) {
                try {
                    member = await milratoGuild.members.fetch(req.user.id);
                } catch (err) {
                    console.error(`Couldn't fetch ${req.user.id}: ${err}`);
                }
            }
            
            const hasPermission = !member || 
                member.permissions.has("ADMINISTRATOR") || 
                member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) || 
                member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`) || 
                member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`) ||
                req.user.id === mainconfig.BotOwnerID;
                
            if (!hasPermission) {
                return res.redirect("/?error=true&message=" + encodeURIComponent("You are not allowed to create bots!"));
            }
            
            const servicebotCatalog = require('../servicebotCatalog');
            const templates = servicebotCatalog.getAllTemplates();
            
            let remoteStatus = { healthy: false, configured: false };
            if (remoteBotClient.isConfigured()) {
                remoteStatus.configured = true;
                try {
                    remoteStatus.healthy = await remoteBotClient.checkHealth();
                } catch (e) {
                    remoteStatus.healthy = false;
                }
            }
            
            res.render("createbot", {
                req: req,
                user: req.user,
                milratoGuild: milratoGuild,
                botClient: client,
                templates: templates,
                remoteStatus: remoteStatus,
                BotConfig: client.config || config
            });
        } catch (err) {
            console.error('[Dashboard] Error rendering createbot:', err);
            return res.redirect("/?error=true&message=" + encodeURIComponent("Error loading bot creation page: " + err.message));
        }
    });
    
    app.post("/createbot", checkAuthLegacy, async (req, res) => {
        try {
            if (!botReady) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Bot is still connecting to Discord. Please wait."));
            }
            let member = milratoGuild ? milratoGuild.members.cache.get(req.user.id) : null;
            if (milratoGuild && !member) {
                try {
                    member = await milratoGuild.members.fetch(req.user.id);
                } catch (err) {
                    console.error(`Couldn't fetch ${req.user.id}: ${err}`);
                }
            }
            
            const hasPermission = !member || 
                member.permissions.has("ADMINISTRATOR") || 
                member.roles.cache.has(`${mainconfig.ServerRoles.BotCreatorRoleId}`) || 
                member.roles.cache.has(`${mainconfig.ServerRoles.FounderId}`) || 
                member.roles.cache.has(`${mainconfig.ServerRoles.ChiefBotCreatorRoleId}`) ||
                req.user.id === mainconfig.BotOwnerID;
                
            if (!hasPermission) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("You are not allowed to create bots!"));
            }
            
            let { bottype, prefix, status, statustype, token, owner, avatar, footertext, color, filename, botid, expirationTime, guildId, lavalinkHost, lavalinkPort, lavalinkPassword } = req.body;
            
            if (!filename || !token || !botid || !owner) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Missing required fields: Bot Name, Token, Client ID, and Owner ID are required."));
            }
            
            filename = filename.replace(/[^a-zA-Z0-9-_]/g, '');
            if (!filename) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Invalid bot name. Use only letters, numbers, hyphens, and underscores."));
            }
            
            const deployRemote = remoteBotClient.isConfigured();
            if (!deployRemote) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Secondary Replit not configured. Please set REMOTE_LOG_URL and REMOTE_LOG_API_KEY."));
            }
            
            try {
                const isHealthy = await remoteBotClient.checkHealth();
                if (!isHealthy) {
                    return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Secondary server is offline. Please ensure it is running."));
                }
            } catch (err) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Failed to connect to secondary server: " + err.message));
            }
            
            const parsedExpiration = parseExpirationInput(expirationTime || '30d');
            if (!parsedExpiration.valid) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Invalid expiration time: " + parsedExpiration.error));
            }
            const expirationMs = parsedExpiration.ms;
            const validExpirationDays = Math.ceil(expirationMs / (24 * 60 * 60 * 1000));
            
            const servicebotCatalog = require('../servicebotCatalog');
            const template = servicebotCatalog.getTemplate(bottype || 'music');
            if (!template) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Invalid bot template selected."));
            }
            
            console.log(`[Dashboard] Creating ${template.name} bot: ${filename}`);
            
            const BINARY_EXTENSIONS = ['.db', '.sqlite', '.sqlite3', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz', '.pdf'];
            function isBinaryFile(filename) {
                const ext = path.extname(filename).toLowerCase();
                return BINARY_EXTENSIONS.includes(ext);
            }
            
            function readTemplateFilesRecursively(dir, baseDir = dir) {
                const files = {};
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.relative(baseDir, fullPath);
                    
                    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'package-lock.json') {
                        continue;
                    }
                    
                    if (entry.isDirectory()) {
                        const subFiles = readTemplateFilesRecursively(fullPath, baseDir);
                        Object.assign(files, subFiles);
                    } else {
                        try {
                            if (isBinaryFile(entry.name)) {
                                const buffer = fs.readFileSync(fullPath);
                                files[relativePath] = { __binary: true, data: buffer.toString('base64') };
                            } else {
                                files[relativePath] = fs.readFileSync(fullPath, 'utf8');
                            }
                        } catch (e) {
                            console.error(`[Dashboard] Error reading file ${fullPath}:`, e.message);
                        }
                    }
                }
                return files;
            }
            
            const templatePath = template.templatePath;
            if (!fs.existsSync(templatePath)) {
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Template files not found on server."));
            }
            
            const botFiles = readTemplateFilesRecursively(templatePath);
            console.log(`[Dashboard] Collected ${Object.keys(botFiles).length} files from template`);
            
            const botConfig = {
                BOT_TOKEN: token,
                CLIENT_ID: botid,
                OWNER_ID: owner,
                PREFIX: prefix || ',',
                GUILD_ID: guildId || '',
                STATUS: {
                    text: status || `${prefix || ','}help`,
                    type: statustype || 'PLAYING'
                },
                EMBED: {
                    color: color || '#5865F2',
                    footerText: footertext || 'Powered by Bot Hosting',
                    footerIcon: avatar || ''
                }
            };
            
            if (bottype === 'music') {
                botConfig.LAVALINK = {
                    HOSTS: lavalinkHost || 'uk-01.rrhosting.eu',
                    PORTS: lavalinkPort || '1337',
                    PASSWORDS: lavalinkPassword || 'RRHosting',
                    SECURES: 'false'
                };
                botConfig.MUSIC = {
                    DEFAULT_PLATFORM: 'ytsearch',
                    AUTOCOMPLETE_LIMIT: 5,
                    PLAYLIST_LIMIT: 3,
                    ARTWORK_STYLE: 'MusicCard'
                };
                botConfig.GENIUS = { API_KEY: '' };
            }
            
            botFiles['botconfig/config.json'] = JSON.stringify(botConfig, null, 2);
            
            let botuser = null;
            try {
                botuser = await client.users.fetch(botid);
            } catch (e) {
                console.log(`[Dashboard] Could not fetch bot user: ${botid}`);
            }
            
            console.log(`[Dashboard] Deploying ${filename} to secondary Replit...`);
            try {
                const deployResult = await remoteBotClient.deployBot(filename, bottype, botFiles, botConfig);
                console.log(`[Dashboard] Deploy result:`, deployResult);
                
                if (!deployResult || !deployResult.success) {
                    throw new Error(deployResult?.error || 'Deploy failed');
                }
            } catch (err) {
                console.error('[Dashboard] Remote deploy failed:', err);
                return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Deploy failed: " + String(err.message || err).substring(0, 80)));
            }
            
            const deployedLocation = 'secondary';
            const pathInfo = `remote:${filename}`;
            const dbInfo = `> **Path:**\n\`\`\`yml\n${pathInfo}\n\`\`\`\n> **Server:**\n\`\`\`yml\n${deployedLocation}\n\`\`\`\n> **Application Information:**\n\`\`\`yml\nLink: https://discord.com/developers/applications/${botid}\nName: ${botuser ? `${botuser.tag}\nIcon: ${botuser.displayAvatarURL()}` : `>>${filename}<<`}\nOriginalOwner: ${client.users.cache.get(owner) ? client.users.cache.get(owner).tag + `(${client.users.cache.get(owner).id})` : owner}\`\`\``;

            if (client.bots) {
                client.bots.ensure(owner, { bots: [] });
                client.bots.push(owner, botid, "bots");
                client.bots.set(botid, bottype, "type");
                client.bots.set(botid, dbInfo, "info");
                
                const expirationDate = new Date(Date.now() + expirationMs).toISOString();
                client.bots.set(botid, expirationDate, "expirationDate");
                client.bots.set(botid, validExpirationDays, "expirationDays");
                client.bots.set(botid, expirationMs, "expirationMs");
                client.bots.set(botid, parsedExpiration.formatted, "expirationFormatted");
                client.bots.set(botid, new Date().toISOString(), "expirationSetAt");
                client.bots.set(botid, req.user.id, "expirationSetBy");
                client.bots.set(botid, filename, "name");
                client.bots.set(botid, deployedLocation, "location");
                console.log(`[Dashboard] Set expiration for ${filename}: ${parsedExpiration.formatted} (expires ${expirationDate})`);
                
                try {
                    await remoteBotClient.setExpiration(filename, expirationDate, validExpirationDays, req.user.id);
                    console.log(`[Dashboard] Synced expiration to secondary server for ${filename}`);
                } catch (err) {
                    console.error(`[Dashboard] Failed to sync expiration to secondary: ${err.message}`);
                }
            }

            try {
                const logChannel = await client.channels.fetch(`${mainconfig.BotManagerLogs.toString()}`);
                if (logChannel) {
                    logChannel.send({ 
                        embeds: [new Discord.EmbedBuilder()
                            .setColor("#57F287")
                            .setFooter({ text: `${req.user.username} | ID: ${req.user.id}` })
                            .setDescription(`<@${req.user.id}> Created bot via website: \`${filename}\`, Type: ${bottype}, Owner: <@${owner}>, Bot: <@${botid}>`)
                        ] 
                    }).catch(console.log);
                }
            } catch (e) {
                console.error(e);
            }

            try {
                const ownerUser = await client.users.fetch(owner);
                if (ownerUser) {
                    ownerUser.send({
                        content: `**Your bot has been created!**\n\n***Save this information for support requests:***`,
                        embeds: [new Discord.EmbedBuilder()
                            .setColor((client.config && client.config.color) || config.color)
                            .setDescription(dbInfo)
                            .setThumbnail(botuser ? botuser.displayAvatarURL() : null)
                        ]
                    }).catch(() => {});
                    ownerUser.send({
                        embeds: [new Discord.EmbedBuilder()
                            .setColor((client.config && client.config.color) || config.color)
                            .addFields({ name: "Invite link:", value: `> [Click here](https://discord.com/oauth2/authorize?client_id=${botid}&scope=bot&permissions=8)` })
                            .setTitle(`${botuser ? `\`${botuser.tag}\`` : filename} is online and ready!`)
                            .setDescription(`<@${botid}> is a **${template.name}**!\nTo get started type: \`${prefix || ','}help\``)
                            .setThumbnail(botuser ? botuser.displayAvatarURL() : null)
                        ]
                    }).catch(() => {});
                }
            } catch (e) {
                console.error(e);
            }

            if (client.createingbotmap) {
                client.createingbotmap.delete("CreatingTime");
                client.createingbotmap.delete("Creating");
            }

            res.redirect("/managebots?success=true&message=" + encodeURIComponent(`Bot "${filename}" created successfully!`));
        } catch (e) {
            console.error('[Dashboard] CreateBot error:', e);
            return res.redirect("/createbot?error=true&message=" + encodeURIComponent("Error creating bot: " + String(e.message || e).substring(0, 100)));
        }
    });
    
    db.initDatabase().then(() => {
        console.log('[Dashboard] Database initialized');
    }).catch(err => {
        console.error('[Dashboard] Database init error:', err);
    });

    sharedDbApi(app, client);

    // Get available bot templates API
    app.get('/api/templates', (req, res) => {
        try {
            const servicebotCatalog = require('../servicebotCatalog');
            const templates = servicebotCatalog.getAllTemplates();
            res.json({ success: true, templates: templates || [] });
        } catch (err) {
            console.error('[Dashboard] Error fetching templates:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // Expiration notification endpoint - called by secondary Replit when bots expire
    app.post('/api/send-expiration-notice', express.json(), async (req, res) => {
        try {
            const { botName, ownerDiscordId, message, expirationTime } = req.body;
            
            if (!ownerDiscordId) {
                return res.status(400).json({ error: 'Missing ownerDiscordId' });
            }
            
            const owner = await client.users.fetch(ownerDiscordId);
            const embed = new Discord.EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('🚨 Bot Expiration Notice')
                .setDescription(message || 'Your bot has expired and was automatically stopped.')
                .addFields(
                    { name: 'Bot Name', value: botName || 'Unknown' },
                    { name: 'Expired At', value: new Date(expirationTime).toLocaleString() }
                )
                .setFooter({ text: 'Your bot has been automatically stopped' });
            
            await owner.send({ embeds: [embed] }).catch(() => {});
            
            res.json({ success: true, notified: true });
        } catch (err) {
            console.error('[ExpirationNotice] Notification error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Receive recovery approval notification from secondary Replit
    app.post('/api/bot-recovery-notify', express.json(), async (req, res) => {
        try {
            const { botName, ownerDiscordId, action, message, recoveryTime } = req.body;
            
            if (!ownerDiscordId) {
                return res.status(400).json({ error: 'Missing ownerDiscordId' });
            }
            
            const owner = await client.users.fetch(ownerDiscordId);
            const embed = new Discord.EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Bot Recovery Approved!')
                .setDescription(message || 'Your bot has been recovered and is now active.')
                .addFields(
                    { name: 'Bot Name', value: botName || 'Unknown' },
                    { name: 'Recovered At', value: new Date(recoveryTime).toLocaleString() }
                )
                .setTimestamp();
            
            await owner.send({ embeds: [embed] }).catch(() => {});
            
            // Log to bot manager logs
            try {
                const logChannel = await client.channels.fetch(`${mainconfig.BotManagerLogs.toString()}`);
                if (logChannel) {
                    logChannel.send({ 
                        embeds: [new Discord.EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("🔄 Bot Recovered (Secondary)")
                            .setDescription(`Bot **${botName}** was recovered for <@${ownerDiscordId}>`)
                            .setTimestamp()
                        ] 
                    }).catch(console.log);
                }
            } catch (e) {}
            
            res.json({ success: true, notified: true });
        } catch (err) {
            console.error('[RecoveryNotify] Error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Get list of archived/expired bots from secondary Replit
    app.get('/api/bots/archived', async (req, res) => {
        try {
            if (!remoteBotClient.isConfigured()) {
                return res.status(503).json({ error: 'Secondary server not configured' });
            }
            
            const archivedBots = await remoteBotClient.getArchivedBots();
            res.json({ success: true, archivedBots });
        } catch (err) {
            console.error('[ArchivedBots] Error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Bot Status Monitoring Endpoints
    app.get('/api/bots/status/all', express.json(), async (req, res) => {
        try {
            const { ownerId, status } = req.query;
            const filter = {};
            if (ownerId) filter.ownerId = ownerId;
            if (status) filter.status = status;
            
            const bots = botStatusMonitor.getAllStatuses(filter);
            const stats = botStatusMonitor.getStatistics();
            
            res.json({ success: true, statistics: stats, bots: bots.map(bot => ({
                name: bot.name, status: bot.status || 'unknown', template: bot.template || 'Unknown',
                ownerId: bot.ownerId, createdAt: bot.createdAt, lastUpdated: bot.lastUpdated,
                uptime: bot.uptime, errors: bot.errors || [], location: bot.location || 'primary'
            }))});
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/bots/status/:botName', express.json(), async (req, res) => {
        try {
            const botStatus = botStatusMonitor.getStatus(req.params.botName);
            if (!botStatus) return res.status(404).json({ error: 'Bot not found' });
            
            const errors = botStatusMonitor.getErrors(req.params.botName, 5);
            const history = botStatus.statusHistory?.slice(-10) || [];
            
            res.json({ success: true, bot: {
                name: botStatus.name, status: botStatus.status || 'unknown', template: botStatus.template,
                ownerId: botStatus.ownerId, createdAt: botStatus.createdAt, lastUpdated: botStatus.lastUpdated,
                uptime: botStatus.uptime, errors, statusHistory: history
            }});
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/bots/status/:botName', express.json(), async (req, res) => {
        try {
            const { status, metadata } = req.body;
            if (!status) return res.status(400).json({ error: 'Status required' });
            const updated = botStatusMonitor.updateStatus(req.params.botName, status, metadata);
            res.json({ success: true, bot: updated });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Bot Control Endpoints
    const botController = require('../botController');

    app.post('/api/bots/control/:botName/:action', express.json(), async (req, res) => {
        try {
            const { botName, action } = req.params;
            const botData = await db.getLocalBotByName(botName);
            
            if (!botData) {
                return res.status(404).json({ error: 'Bot not found' });
            }

            let result;
            switch(action) {
                case 'start':
                    result = await botController.startBot(botName, botData);
                    break;
                case 'stop':
                    result = await botController.stopBot(botName);
                    break;
                case 'restart':
                    result = await botController.restartBot(botName, botData);
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid action. Use: start, stop, or restart' });
            }

            const controlStatus = botController.getControlStatus(botName);
            res.json({ success: result.success, message: result.message, status: controlStatus });
        } catch (err) {
            console.error('[BotControl] Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/bots/control/status/:botName', async (req, res) => {
        try {
            const status = botController.getControlStatus(req.params.botName);
            res.json({ success: true, status });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/bots/control/all', async (req, res) => {
        try {
            const allBots = botController.getAllRunningBots();
            res.json({ success: true, bots: allBots });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.delete('/api/bots/:botName', express.json(), async (req, res) => {
        try {
            const { botName } = req.params;
            const botData = await db.getLocalBotByName(botName);
            
            if (!botData) {
                return res.status(404).json({ error: 'Bot not found' });
            }

            // Stop the bot if running
            try {
                await botController.stopBot(botName);
            } catch (e) {
                console.warn(`[Delete] Could not stop bot ${botName}:`, e.message);
            }

            // Delete from local database
            await db.deleteBot(botName);

            // Update status
            botStatusMonitor.updateStatus(botName, 'deleted', { deletedAt: new Date() });

            res.json({ success: true, message: `Bot ${botName} deleted successfully` });
        } catch (err) {
            console.error('[Delete Bot] Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Bot Analytics Endpoints
    const botAnalytics = require('../botAnalytics');

    app.get('/api/analytics/:botName', async (req, res) => {
        try {
            const analytics = botAnalytics.getAnalytics(req.params.botName);
            const stats = botAnalytics.getStats(req.params.botName);
            const events = botAnalytics.getRecentEvents(req.params.botName);
            
            if (!analytics) {
                return res.status(404).json({ error: 'Bot analytics not found' });
            }
            
            res.json({ success: true, analytics, stats, recentEvents: events });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/analytics/all/summary', async (req, res) => {
        try {
            const allAnalytics = botAnalytics.getAllAnalytics();
            const systemHealth = botAnalytics.getSystemHealth();
            const stats = allAnalytics.map(bot => botAnalytics.getStats(bot.name));
            
            res.json({ success: true, systemHealth, botCount: stats.length, stats });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Health Check Endpoints
    const healthChecker = require('../healthChecker');

    app.post('/api/health/start', express.json(), async (req, res) => {
        try {
            const { intervalMinutes } = req.body;
            healthChecker.start(intervalMinutes || 5);
            res.json({ success: true, message: 'Health checker started', status: healthChecker.getStatus() });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/health/stop', async (req, res) => {
        try {
            healthChecker.stop();
            res.json({ success: true, message: 'Health checker stopped' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/health/status', async (req, res) => {
        try {
            const status = healthChecker.getStatus();
            const history = healthChecker.getHistory(10);
            res.json({ success: true, status, history });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Start dashboard server on port 5000
    const dashboardPort = 5000;
    const server = app.listen(dashboardPort, "0.0.0.0", () => {
        console.log(`[Dashboard] Dashboard running on port ${dashboardPort}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[Dashboard] Port ${dashboardPort} is already in use`);
        } else {
            console.error(`[Dashboard] Server error:`, err);
        }
    });
    
    client.on(Discord.Events.ClientReady, () => {
        console.log("[Dashboard] Bot is ready, configuring OAuth...".brightGreen);
        botReady = true;
        
        milratoGuild = client.guilds.cache.get(`${mainconfig.ServerID}`);
        if (!milratoGuild) {
            console.warn("[Dashboard] ServerID not found in bot's guilds. Dashboard starting with limited functionality.");
            milratoGuild = client.guilds.cache.first();
        }
        
        setupPassportStrategy(client.user.id);
        console.log(`[Dashboard] Dashboard fully operational!`);
    });
};
