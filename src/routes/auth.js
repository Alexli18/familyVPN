const express = require('express');
const bcrypt = require('bcrypt');
const { 
    createLoginRateLimit, 
    createCSRFProtection 
} = require('../middleware/session-middleware');

/**
 * Authentication routes for web interface using session-based authentication
 * This is separate from the JWT-based API authentication
 */
class WebAuthRoutes {
    constructor(logger, loggingService, basicHealthService) {
        this.router = express.Router();
        this.logger = logger;
        this.loggingService = loggingService;
        this.basicHealthService = basicHealthService;
        
        // Configuration
        this.maxFailedAttempts = parseInt(process.env.MAX_FAILED_ATTEMPTS) || 5;
        this.lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000; // 15 minutes
        
        // In-memory store for failed attempts (in production, use Redis or database)
        this.failedAttempts = new Map();
        
        this.setupRoutes();
    }

    setupRoutes() {
        // Apply rate limiting and CSRF protection
        const loginRateLimit = createLoginRateLimit(this.logger);
        const csrfProtection = createCSRFProtection();

        // GET /login - Display login form
        this.router.get('/login', csrfProtection, (req, res) => {
            // If already authenticated, redirect to certificates page
            if (req.session && req.session.authenticated) {
                return res.redirect('/certificates');
            }

            // Render login page with CSRF token
            res.render('login', {
                csrfToken: res.locals.csrfToken,
                error: req.query.error
            });
        });

        // POST /login - Process login credentials
        this.router.post('/login', loginRateLimit, csrfProtection, async (req, res) => {
            const startTime = Date.now();
            
            const { username, password } = req.body;
            const clientIP = req.ip;

            try {
                // Validate input
                if (!username || !password) {
                    this.logAuthenticationEvent('MISSING_CREDENTIALS', username || 'unknown', clientIP, false, {
                        reason: 'Missing username or password'
                    });
                    
                    return this.sendLoginError(res, 'Username and password are required');
                }

                // Check if account is locked
                if (this.isAccountLocked(username, clientIP)) {
                    this.logAuthenticationEvent('LOCKED_ACCOUNT_ATTEMPT', username, clientIP, false, {
                        reason: 'Account temporarily locked'
                    });
                    
                    if (this.basicHealthService) {
                        this.basicHealthService.recordAuthAttempt('locked', username, clientIP);
                    }
                    
                    return this.sendLoginError(res, 'Account temporarily locked due to too many failed attempts');
                }

                // Get admin credentials from environment
                const validUsername = process.env.WEB_ADMIN_USERNAME || process.env.VPN_USERNAME;
                const validPasswordHash = process.env.WEB_ADMIN_PASSWORD_HASH || process.env.VPN_PASSWORD_HASH;

                if (!validUsername || !validPasswordHash) {
                    this.logger.error('Web authentication credentials not configured');
                    return this.sendLoginError(res, 'Authentication system not properly configured');
                }

                // Verify credentials
                const isValidUsername = username === validUsername;
                const isValidPassword = isValidUsername ? await this.verifyPassword(password, validPasswordHash) : false;

                if (!isValidUsername || !isValidPassword) {
                    this.recordFailedAttempt(username, clientIP);
                    
                    this.logAuthenticationEvent('FAILED', username, clientIP, false, {
                        reason: 'Invalid credentials',
                        duration: (Date.now() - startTime) / 1000
                    });
                    
                    if (this.basicHealthService) {
                        this.basicHealthService.recordAuthAttempt('failed', username, clientIP);
                    }
                    
                    return this.sendLoginError(res, 'Invalid username or password');
                }

                // Clear failed attempts on successful authentication
                this.clearFailedAttempts(username, clientIP);

                // Regenerate session ID to prevent session fixation
                req.session.regenerate((err) => {
                    if (err) {
                        this.logger.error('Session regeneration failed', { error: err.message });
                        return this.sendLoginError(res, 'Login failed due to session error');
                    }

                    // Set session data
                    req.session.authenticated = true;
                    req.session.user = username; // This is what authenticateWebUser expects
                    req.session.username = username; // Keep for backward compatibility
                    req.session.loginTime = new Date();
                    req.session.lastActivity = new Date();

                    // Save session
                    req.session.save((err) => {
                        if (err) {
                            this.logger.error('Session save failed', { error: err.message });
                            return this.sendLoginError(res, 'Login failed due to session error');
                        }

                        this.logAuthenticationEvent('SUCCESS', username, clientIP, true, {
                            sessionId: req.session.id,
                            duration: (Date.now() - startTime) / 1000
                        });
                        
                        if (this.basicHealthService) {
                            this.basicHealthService.recordAuthAttempt('success', username, clientIP);
                        }

                        // Respond based on request type
                        if (req.xhr || req.headers.accept?.includes('application/json')) {
                            res.json({
                                success: true,
                                message: 'Login successful',
                                redirectUrl: '/certificates'
                            });
                        } else {
                            res.redirect('/certificates');
                        }
                    });
                });

            } catch (error) {
                this.logAuthenticationEvent('ERROR', username || 'unknown', clientIP, false, {
                    error: error.message,
                    duration: (Date.now() - startTime) / 1000
                });
                
                this.logger.error('Login error', { 
                    error: error.message, 
                    username, 
                    clientIP 
                });
                
                return this.sendLoginError(res, 'An error occurred during login');
            }
        });

        // POST /logout - Destroy session and redirect
        this.router.post('/logout', (req, res) => {
            const username = req.session?.username;
            const clientIP = req.ip;

            if (req.session) {
                req.session.destroy((err) => {
                    if (err) {
                        this.logger.error('Session destruction failed', { error: err.message });
                    }

                    this.logAuthenticationEvent('LOGOUT', username || 'unknown', clientIP, true, {
                        reason: 'User initiated logout'
                    });

                    // Clear session cookie
                    res.clearCookie('vpn.session.id');

                    // Respond based on request type
                    if (req.xhr || req.headers.accept?.includes('application/json')) {
                        res.json({
                            success: true,
                            message: 'Logged out successfully',
                            redirectUrl: '/login'
                        });
                    } else {
                        res.redirect('/login');
                    }
                });
            } else {
                // No session to destroy
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    res.json({
                        success: true,
                        message: 'Already logged out',
                        redirectUrl: '/login'
                    });
                } else {
                    res.redirect('/login');
                }
            }
        });
    }

    /**
     * Verify password against hash
     */
    async verifyPassword(password, hashedPassword) {
        try {
            return await bcrypt.compare(password, hashedPassword);
        } catch (error) {
            this.logger.error('Password verification failed', { error: error.message });
            throw new Error('Password verification failed');
        }
    }

    /**
     * Record failed authentication attempt
     */
    recordFailedAttempt(username, clientIP) {
        const key = `${username}:${clientIP}`;
        const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: Date.now() };
        
        attempts.count++;
        attempts.lastAttempt = Date.now();
        
        this.failedAttempts.set(key, attempts);
        
        this.logger.warn('Failed authentication attempt recorded', {
            username,
            clientIP,
            attemptCount: attempts.count
        });

        // Clean up old entries periodically
        this.cleanupFailedAttempts();
    }

    /**
     * Check if account is locked due to failed attempts
     */
    isAccountLocked(username, clientIP) {
        const key = `${username}:${clientIP}`;
        const attempts = this.failedAttempts.get(key);
        
        if (!attempts) {
            return false;
        }
        
        if (attempts.count >= this.maxFailedAttempts) {
            const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
            return timeSinceLastAttempt < this.lockoutDuration;
        }
        
        return false;
    }

    /**
     * Clear failed attempts for successful login
     */
    clearFailedAttempts(username, clientIP) {
        const key = `${username}:${clientIP}`;
        this.failedAttempts.delete(key);
    }

    /**
     * Clean up expired failed attempt records
     */
    cleanupFailedAttempts() {
        const now = Date.now();
        for (const [key, attempts] of this.failedAttempts.entries()) {
            if (now - attempts.lastAttempt > this.lockoutDuration) {
                this.failedAttempts.delete(key);
            }
        }
    }

    /**
     * Log authentication events
     */
    logAuthenticationEvent(event, username, clientIP, success, details = {}) {
        const logData = {
            event,
            username,
            clientIP,
            success,
            timestamp: new Date().toISOString(),
            userAgent: details.userAgent,
            ...details
        };

        if (this.loggingService && this.loggingService.logAuthenticationEvent) {
            this.loggingService.logAuthenticationEvent(event, username, clientIP, success, details);
        } else {
            // Fallback to regular logger
            const level = success ? 'info' : 'warn';
            this.logger[level](`Authentication ${event}`, logData);
        }
    }

    /**
     * Send login error response
     */
    sendLoginError(res, message) {
        if (res.headersSent) {
            return;
        }

        // For AJAX requests, return JSON
        if (res.req.xhr || res.req.headers.accept?.includes('application/json')) {
            return res.status(401).json({
                success: false,
                error: message
            });
        }

        // For regular requests, redirect with error
        return res.redirect(`/login?error=${encodeURIComponent(message)}`);
    }

    /**
     * Get router instance
     */
    getRouter() {
        return this.router;
    }
}

module.exports = WebAuthRoutes;