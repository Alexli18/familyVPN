const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthenticationService {
  constructor(loggingService, basicHealthService) {
    this.loggingService = loggingService;
    this.basicHealthService = basicHealthService;
    this.saltRounds = 12;
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecretKey();
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || this.generateSecretKey();
    this.tokenExpiry = process.env.JWT_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    
    // In-memory store for failed attempts (in production, use Redis or database)
    this.failedAttempts = new Map();
    this.maxFailedAttempts = parseInt(process.env.MAX_FAILED_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000; // 15 minutes
  }

  generateSecretKey() {
    return require('crypto').randomBytes(64).toString('hex');
  }

  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      this.loggingService.error('Password hashing failed', { error: error.message });
      throw new Error('Password hashing failed');
    }
  }

  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      this.loggingService.error('Password verification failed', { error: error.message });
      throw new Error('Password verification failed');
    }
  }

  async authenticate(username, password, clientIP) {
    const startTime = Date.now();
    
    try {
      // Check if account is locked
      if (this.isAccountLocked(username)) {
        this.loggingService.logAuthenticationEvent('LOCKED_ACCOUNT_ATTEMPT', username, clientIP, false, {
          reason: 'Account temporarily locked'
        });
        
        this.basicHealthService.recordAuthAttempt('locked', username, clientIP);
        throw new Error('Account temporarily locked due to too many failed attempts');
      }

      // Get user credentials from environment variables
      const validUsername = process.env.VPN_USERNAME;
      const validPasswordHash = process.env.VPN_PASSWORD_HASH;

      if (!validUsername || !validPasswordHash) {
        this.loggingService.error('Authentication credentials not configured');
        throw new Error('Authentication system not properly configured');
      }

      // Verify username and password
      if (username !== validUsername) {
        this.recordFailedAttempt(username, clientIP);
        this.basicHealthService.recordAuthAttempt('failed', username, clientIP);
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await this.verifyPassword(password, validPasswordHash);
      if (!isValidPassword) {
        this.recordFailedAttempt(username, clientIP);
        this.basicHealthService.recordAuthAttempt('failed', username, clientIP);
        throw new Error('Invalid credentials');
      }

      // Clear failed attempts on successful authentication
      this.clearFailedAttempts(username);

      // Generate tokens
      const tokens = await this.generateTokens(username, clientIP);
      
      this.loggingService.logAuthenticationEvent('SUCCESS', username, clientIP, true, {
        tokenExpiry: this.tokenExpiry
      });
      
      this.basicHealthService.recordAuthAttempt('success', username, clientIP);

      return {
        success: true,
        tokens
      };

    } catch (error) {
      this.loggingService.logAuthenticationEvent('FAILED', username, clientIP, false, {
        error: error.message,
        duration: (Date.now() - startTime) / 1000
      });
      
      throw error;
    }
  }

  async generateTokens(username, clientIP) {
    const payload = {
      username,
      clientIP,
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      issuer: 'vpn-server',
      audience: 'vpn-client'
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'vpn-server',
      audience: 'vpn-client'
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokenExpiry
    };
  }

  async validateToken(token, clientIP) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'vpn-server',
        audience: 'vpn-client'
      });

      // Verify client IP matches (optional security measure)
      if (process.env.ENFORCE_IP_VALIDATION === 'true' && decoded.clientIP !== clientIP) {
        this.loggingService.logAuthenticationEvent('TOKEN_IP_MISMATCH', decoded.username, clientIP, false, {
          tokenIP: decoded.clientIP,
          requestIP: clientIP
        });
        throw new Error('Token IP mismatch');
      }

      return {
        valid: true,
        decoded
      };
    } catch (error) {
      this.loggingService.logAuthenticationEvent('TOKEN_VALIDATION_FAILED', 'unknown', clientIP, false, {
        error: error.message
      });
      
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async refreshToken(refreshToken, clientIP) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret, {
        issuer: 'vpn-server',
        audience: 'vpn-client'
      });

      // Verify client IP matches
      if (process.env.ENFORCE_IP_VALIDATION === 'true' && decoded.clientIP !== clientIP) {
        this.loggingService.logAuthenticationEvent('REFRESH_TOKEN_IP_MISMATCH', decoded.username, clientIP, false, {
          tokenIP: decoded.clientIP,
          requestIP: clientIP
        });
        throw new Error('Refresh token IP mismatch');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(decoded.username, clientIP);
      
      this.loggingService.logAuthenticationEvent('TOKEN_REFRESH_SUCCESS', decoded.username, clientIP, true, {
        newTokenExpiry: this.tokenExpiry
      });

      return tokens;
    } catch (error) {
      this.loggingService.logAuthenticationEvent('TOKEN_REFRESH_FAILED', 'unknown', clientIP, false, {
        error: error.message
      });
      
      throw new Error('Invalid refresh token');
    }
  }

  recordFailedAttempt(username, clientIP) {
    const key = `${username}:${clientIP}`;
    const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: Date.now() };
    
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    this.failedAttempts.set(key, attempts);
    
    this.loggingService.warn('Failed authentication attempt recorded', {
      username,
      clientIP,
      attemptCount: attempts.count
    });

    // Clean up old entries periodically
    this.cleanupFailedAttempts();
  }

  isAccountLocked(username) {
    // Check all IPs for this username
    for (const [key, attempts] of this.failedAttempts.entries()) {
      if (key.startsWith(`${username}:`)) {
        if (attempts.count >= this.maxFailedAttempts) {
          const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
          if (timeSinceLastAttempt < this.lockoutDuration) {
            return true;
          }
        }
      }
    }
    return false;
  }

  clearFailedAttempts(username) {
    // Clear all failed attempts for this username
    for (const key of this.failedAttempts.keys()) {
      if (key.startsWith(`${username}:`)) {
        this.failedAttempts.delete(key);
      }
    }
  }

  cleanupFailedAttempts() {
    const now = Date.now();
    for (const [key, attempts] of this.failedAttempts.entries()) {
      if (now - attempts.lastAttempt > this.lockoutDuration) {
        this.failedAttempts.delete(key);
      }
    }
  }



  // Utility method to create initial admin user hash
  static async createPasswordHash(password) {
    return await bcrypt.hash(password, 12);
  }
}

module.exports = AuthenticationService;