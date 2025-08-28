const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

/**
 * Authentication middleware supporting both JWT and session-based authentication
 * - JWT-based authentication for API endpoints
 * - Session-based authentication for web interface
 */

// Rate limiting middleware for authentication endpoints (JWT-based)
const createAuthRateLimit = (loggingService, basicHealthService) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res) => {
      if (loggingService) {
        loggingService.logSecurityEvent('RATE_LIMIT', 'Rate limit exceeded for authentication', {
          clientIP: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: '/auth/login'
        });
      } else {
        req.logger?.warn('Rate limit exceeded for authentication', {
          clientIP: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
      
      if (basicHealthService) {
        basicHealthService.recordHttpRequest('POST', '/auth/login', 429);
      }
      
      res.status(429).json({
        error: 'Too many authentication attempts, please try again later',
        retryAfter: '15 minutes'
      });
    }
  });
};

// For backward compatibility with JWT-based auth
const authRateLimit = createAuthRateLimit();

// Slow down middleware for repeated requests
const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  validate: { delayMs: false }, // Disable the warning
  handler: (req, res, next, delay) => {
    req.logger?.info('Slow down applied to authentication request', {
      clientIP: req.ip,
      delay: delay
    });
    next();
  }
});

// JWT authentication middleware
const authenticateToken = (authService) => {
  return async (req, res, next) => {
    try {
      // Try to get token from cookie first, then from Authorization header
      let token = req.cookies.accessToken;
      
      if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
      }
      
      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      const validation = await authService.validateToken(token, req.ip);
      
      if (!validation.valid) {
        // If token is invalid, try to refresh it using refresh token
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
          try {
            const newTokens = await authService.refreshToken(refreshToken, req.ip);
            
            // Set new tokens in cookies
            res.cookie('accessToken', newTokens.accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 15 * 60 * 1000
            });
            
            res.cookie('refreshToken', newTokens.refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60 * 1000
            });
            
            // Validate the new token
            const newValidation = await authService.validateToken(newTokens.accessToken, req.ip);
            if (newValidation.valid) {
              req.user = newValidation.decoded;
              return next();
            }
          } catch (refreshError) {
            req.logger?.warn('Token refresh failed during authentication', {
              error: refreshError.message,
              clientIP: req.ip
            });
          }
        }
        
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      req.user = validation.decoded;
      next();
    } catch (error) {
      req.logger?.error('Token authentication error', {
        error: error.message,
        clientIP: req.ip
      });
      res.status(403).json({ error: 'Token authentication failed' });
    }
  };
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
  
  next();
};

// Request logging middleware
const requestLogger = (logger, loggingService, basicHealthService) => {
  return (req, res, next) => {
    req.logger = logger;
    
    const startTime = Date.now();
    
    // Log incoming request
    if (loggingService) {
      loggingService.info('Incoming request', {
        method: req.method,
        url: req.url,
        clientIP: req.ip,
        userAgent: req.get('User-Agent')
      });
    } else {
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        clientIP: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Track response completion
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (basicHealthService) {
        basicHealthService.recordHttpRequest(req.method, req.route?.path || req.url, res.statusCode);
      }
      
      if (loggingService) {
        loggingService.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          clientIP: req.ip
        });
      }
    });
    
    next();
  };
};

// Session-based authentication middleware for web interface
const requireSessionAuth = (req, res, next) => {
  // Check if user is authenticated via session
  if (req.session && req.session.authenticated) {
    // Update last activity time
    req.session.lastActivity = new Date();
    
    // Set user info for consistency with JWT middleware
    req.user = {
      username: req.session.username,
      loginTime: req.session.loginTime,
      sessionId: req.session.id
    };
    
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

// Combined authentication middleware that supports both JWT and session
const requireAuth = (authService) => {
  return async (req, res, next) => {
    // First try session-based authentication
    if (req.session && req.session.authenticated) {
      req.session.lastActivity = new Date();
      req.user = {
        username: req.session.username,
        loginTime: req.session.loginTime,
        sessionId: req.session.id
      };
      return next();
    }

    // Fall back to JWT authentication for API requests
    try {
      let token = req.cookies.accessToken;
      
      if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
      }
      
      if (!token) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        return res.redirect('/login');
      }

      const validation = await authService.validateToken(token, req.ip);
      
      if (!validation.valid) {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
          try {
            const newTokens = await authService.refreshToken(refreshToken, req.ip);
            
            res.cookie('accessToken', newTokens.accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 15 * 60 * 1000
            });
            
            res.cookie('refreshToken', newTokens.refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60 * 1000
            });
            
            const newValidation = await authService.validateToken(newTokens.accessToken, req.ip);
            if (newValidation.valid) {
              req.user = newValidation.decoded;
              return next();
            }
          } catch (refreshError) {
            req.logger?.warn('Token refresh failed during authentication', {
              error: refreshError.message,
              clientIP: req.ip
            });
          }
        }
        
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }
        return res.redirect('/login');
      }

      req.user = validation.decoded;
      next();
    } catch (error) {
      req.logger?.error('Authentication error', {
        error: error.message,
        clientIP: req.ip
      });
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: 'Authentication failed' });
      }
      return res.redirect('/login');
    }
  };
};

module.exports = {
  authRateLimit,
  authSlowDown,
  authenticateToken,
  requireSessionAuth,
  requireAuth,
  securityHeaders,
  requestLogger
};