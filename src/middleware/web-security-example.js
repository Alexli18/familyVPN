/**
 * Example of how to use the session middleware and security configuration
 * This file demonstrates the proper order and configuration of middleware
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const {
    createSessionMiddleware,
    createSecurityMiddleware,
    createHTTPSEnforcement,
    createLoginRateLimit,
    createCertificateRateLimit,
    createGeneralRateLimit,
    createCSRFProtection,
    requireAuthentication,
    createSessionCleanup
} = require('./session-middleware');

/**
 * Configure Express app with complete security middleware stack
 * @param {Object} logger - Logger instance
 * @returns {Object} Configured Express app
 */
function createSecureWebApp(logger) {
    const app = express();

    // 1. Security headers (should be first)
    app.use(createSecurityMiddleware());

    // 2. HTTPS enforcement (early in the stack)
    app.use(createHTTPSEnforcement());

    // 3. General rate limiting (before parsing)
    app.use(createGeneralRateLimit(logger));

    // 4. Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());

    // 5. Session middleware
    app.use(createSessionMiddleware({
        sessionSecret: process.env.WEB_SESSION_SECRET
    }));

    // 6. Session cleanup (after session middleware)
    app.use(createSessionCleanup());

    // 7. CSRF protection (after session middleware)
    app.use(createCSRFProtection());

    // 8. Static file serving (before routes)
    app.use('/static', express.static('src/public'));

    // Example routes with different security requirements

    // Public login page
    app.get('/login', (req, res) => {
        res.json({
            message: 'Login page',
            csrfToken: res.locals.csrfToken
        });
    });

    // Login endpoint with specific rate limiting
    app.post('/login', createLoginRateLimit(logger), (req, res) => {
        // Login logic here
        const { username, password, csrfToken } = req.body;
        
        // Validate credentials (simplified example)
        if (username === 'admin' && password === 'password') {
            req.session.authenticated = true;
            req.session.username = username;
            req.session.lastActivity = new Date();
            
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });

    // Protected certificate management page
    app.get('/certificates', requireAuthentication(), (req, res) => {
        res.json({
            message: 'Certificate management page',
            user: req.session.username,
            csrfToken: res.locals.csrfToken
        });
    });

    // Certificate generation with specific rate limiting
    app.post('/certificates/generate', 
        requireAuthentication(), 
        createCertificateRateLimit(logger), 
        (req, res) => {
            // Certificate generation logic here
            const { clientName, csrfToken } = req.body;
            
            if (logger) {
                logger.info('Certificate generation requested', {
                    user: req.session.username,
                    clientName: clientName,
                    clientIP: req.ip
                });
            }
            
            res.json({ 
                success: true, 
                message: `Certificate generated for ${clientName}` 
            });
        }
    );

    // Logout endpoint
    app.post('/logout', requireAuthentication(), (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                if (logger) {
                    logger.error('Session destruction error', { error: err.message });
                }
                return res.status(500).json({ error: 'Logout failed' });
            }
            
            res.clearCookie('vpn.session.id');
            res.json({ success: true, message: 'Logged out successfully' });
        });
    });

    // Health check endpoint (no authentication required)
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString() 
        });
    });

    // Error handling middleware (should be last)
    app.use((err, req, res, next) => {
        if (logger) {
            logger.error('Unhandled error', { 
                error: err.message, 
                stack: err.stack,
                url: req.url,
                method: req.method
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error' 
        });
    });

    return app;
}

module.exports = {
    createSecureWebApp
};