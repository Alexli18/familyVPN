const session = require('express-session');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Configure secure session middleware for web interface
 * @param {Object} config - Configuration object
 * @returns {Function} Express session middleware
 */
function createSessionMiddleware(config = {}) {
    // Generate a secure session secret if not provided
    const sessionSecret = config.sessionSecret || 
        process.env.WEB_SESSION_SECRET || 
        crypto.randomBytes(64).toString('hex');

    const sessionConfig = {
        secret: sessionSecret,
        name: 'vpn.session.id', // Custom session name to avoid default 'connect.sid'
        resave: false,
        saveUninitialized: false,
        rolling: true, // Reset expiration on activity
        cookie: {
            secure: process.env.NODE_ENV === 'production' || process.env.WEB_HTTPS_ONLY === 'true',
            httpOnly: true, // Prevent XSS attacks
            maxAge: parseInt(process.env.WEB_SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes default
            sameSite: 'strict' // CSRF protection
        },
        // Regenerate session ID on login to prevent session fixation
        genid: () => crypto.randomBytes(32).toString('hex')
    };

    return session(sessionConfig);
}

/**
 * Configure Helmet security middleware with VPN-specific settings
 * @returns {Function} Helmet middleware
 */
function createSecurityMiddleware() {
    const isProduction = process.env.NODE_ENV === 'production';
    const forceHttps = process.env.WEB_HTTPS_ONLY === 'true';
    
    // In development, use minimal security headers to avoid HTTPS issues
    if (!isProduction && !forceHttps) {
        return helmet({
            // Minimal security headers for development
            contentSecurityPolicy: false, // Disable CSP in development
            crossOriginEmbedderPolicy: false,
            hsts: false, // Disable HSTS
            hidePoweredBy: true,
            frameguard: { action: 'deny' },
            noSniff: true,
            xssFilter: true,
            referrerPolicy: false // Disable referrer policy that might cause issues
        });
    }
    
    // Full security headers for production
    return helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for forms
                styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        // Cross Origin Embedder Policy
        crossOriginEmbedderPolicy: false, // Disable for compatibility
        // HTTP Strict Transport Security
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        // Hide X-Powered-By header
        hidePoweredBy: true,
        // X-Frame-Options
        frameguard: { action: 'deny' },
        // X-Content-Type-Options
        noSniff: true,
        // X-XSS-Protection (legacy but still useful)
        xssFilter: true,
        // Referrer Policy
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
}

/**
 * HTTPS enforcement middleware
 * @returns {Function} HTTPS redirect middleware
 */
function createHTTPSEnforcement() {
    return (req, res, next) => {
        // Skip HTTPS enforcement in development or if explicitly disabled
        if (process.env.NODE_ENV !== 'production' && process.env.WEB_HTTPS_ONLY !== 'true') {
            return next();
        }

        // Check if request is secure
        const isSecure = req.secure || 
                        req.headers['x-forwarded-proto'] === 'https' ||
                        req.connection.encrypted;

        if (!isSecure) {
            const httpsUrl = `https://${req.get('host')}${req.url}`;
            return res.redirect(301, httpsUrl);
        }

        next();
    };
}

/**
 * Rate limiting middleware for login attempts
 * @param {Object} logger - Logger instance
 * @returns {Function} Rate limiting middleware
 */
function createLoginRateLimit(logger) {
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 login attempts per windowMs
        message: {
            error: 'Too many login attempts, please try again later',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // Don't count successful requests
        handler: (req, res) => {
            if (logger) {
                logger.warn('Login rate limit exceeded', {
                    clientIP: req.ip,
                    userAgent: req.get('User-Agent'),
                    endpoint: req.path
                });
            }
            
            res.status(429).json({
                error: 'Too many login attempts, please try again later',
                retryAfter: '15 minutes'
            });
        }
    });
}

/**
 * Rate limiting middleware for certificate generation
 * @param {Object} logger - Logger instance
 * @returns {Function} Rate limiting middleware
 */
function createCertificateRateLimit(logger) {
    return rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // Limit each IP to 10 certificate generations per hour
        message: {
            error: 'Too many certificate generation requests, please try again later',
            retryAfter: '1 hour'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false, // Count all requests
        handler: (req, res) => {
            if (logger) {
                logger.warn('Certificate generation rate limit exceeded', {
                    clientIP: req.ip,
                    userAgent: req.get('User-Agent'),
                    endpoint: req.path
                });
            }
            
            res.status(429).json({
                error: 'Too many certificate generation requests, please try again later',
                retryAfter: '1 hour'
            });
        }
    });
}

/**
 * General API rate limiting middleware
 * @param {Object} logger - Logger instance
 * @returns {Function} Rate limiting middleware
 */
function createGeneralRateLimit(logger) {
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
            error: 'Too many requests, please try again later',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            if (logger) {
                logger.warn('General rate limit exceeded', {
                    clientIP: req.ip,
                    userAgent: req.get('User-Agent'),
                    endpoint: req.path
                });
            }
            
            res.status(429).json({
                error: 'Too many requests, please try again later',
                retryAfter: '15 minutes'
            });
        }
    });
}

/**
 * CSRF protection middleware (simple token-based)
 * @returns {Function} CSRF protection middleware
 */
function createCSRFProtection() {
    return (req, res, next) => {
        // Generate CSRF token for GET requests
        if (req.method === 'GET') {
            if (!req.session.csrfToken) {
                req.session.csrfToken = crypto.randomBytes(32).toString('hex');
            }
            res.locals.csrfToken = req.session.csrfToken;
            return next();
        }

        // Validate CSRF token for state-changing requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            const token = req.body.csrfToken || req.headers['x-csrf-token'];
            
            if (!token || !req.session.csrfToken || token !== req.session.csrfToken) {
                return res.status(403).json({
                    error: 'Invalid CSRF token'
                });
            }
        }

        next();
    };
}

/**
 * Authentication middleware for web interface
 * @returns {Function} Authentication middleware
 */
function requireAuthentication() {
    return (req, res, next) => {
        if (req.session && req.session.authenticated) {
            // Update last activity time
            req.session.lastActivity = new Date();
            return next();
        }

        // For API requests, return JSON error
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        // For web requests, redirect to login
        res.redirect('/login');
    };
}

/**
 * Session cleanup middleware - removes expired sessions
 * @returns {Function} Session cleanup middleware
 */
function createSessionCleanup() {
    return (req, res, next) => {
        if (req.session && req.session.lastActivity) {
            const now = new Date();
            const lastActivity = new Date(req.session.lastActivity);
            const sessionTimeout = parseInt(process.env.WEB_SESSION_TIMEOUT) || 30 * 60 * 1000;
            
            // Check if session has expired
            if (now - lastActivity > sessionTimeout) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session cleanup error:', err);
                    }
                });
                
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(401).json({
                        error: 'Session expired'
                    });
                }
                
                return res.redirect('/login');
            }
        }
        
        next();
    };
}

module.exports = {
    createSessionMiddleware,
    createSecurityMiddleware,
    createHTTPSEnforcement,
    createLoginRateLimit,
    createCertificateRateLimit,
    createGeneralRateLimit,
    createCSRFProtection,
    requireAuthentication,
    createSessionCleanup
};