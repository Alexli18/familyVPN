const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Password hashing and validation utilities for web interface
 */
class PasswordUtils {
    constructor() {
        this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        this.minPasswordLength = parseInt(process.env.MIN_PASSWORD_LENGTH) || 8;
    }

    /**
     * Hash a password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        try {
            if (!password || typeof password !== 'string') {
                throw new Error('Password must be a non-empty string');
            }

            if (password.length < this.minPasswordLength) {
                throw new Error(`Password must be at least ${this.minPasswordLength} characters long`);
            }

            return await bcrypt.hash(password, this.saltRounds);
        } catch (error) {
            throw new Error(`Password hashing failed: ${error.message}`);
        }
    }

    /**
     * Verify a password against its hash
     * @param {string} password - Plain text password
     * @param {string} hashedPassword - Hashed password to compare against
     * @returns {Promise<boolean>} True if password matches
     */
    async verifyPassword(password, hashedPassword) {
        try {
            if (!password || !hashedPassword) {
                return false;
            }

            return await bcrypt.compare(password, hashedPassword);
        } catch (error) {
            throw new Error(`Password verification failed: ${error.message}`);
        }
    }

    /**
     * Generate a secure random password
     * @param {number} length - Password length (default: 16)
     * @param {Object} options - Password generation options
     * @returns {string} Generated password
     */
    generateSecurePassword(length = 16, options = {}) {
        const defaults = {
            includeUppercase: true,
            includeLowercase: true,
            includeNumbers: true,
            includeSymbols: true,
            excludeSimilar: true // Exclude similar looking characters (0, O, l, 1, etc.)
        };

        const config = { ...defaults, ...options };
        
        let charset = '';
        
        if (config.includeLowercase) {
            charset += config.excludeSimilar ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
        }
        
        if (config.includeUppercase) {
            charset += config.excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        }
        
        if (config.includeNumbers) {
            charset += config.excludeSimilar ? '23456789' : '0123456789';
        }
        
        if (config.includeSymbols) {
            charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        }

        if (charset.length === 0) {
            throw new Error('At least one character type must be included');
        }

        let password = '';
        const randomBytes = crypto.randomBytes(length * 2); // Get extra bytes for better randomness
        
        for (let i = 0; i < length; i++) {
            const randomIndex = randomBytes[i] % charset.length;
            password += charset[randomIndex];
        }

        return password;
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result with score and feedback
     */
    validatePasswordStrength(password) {
        if (!password || typeof password !== 'string') {
            return {
                isValid: false,
                score: 0,
                feedback: ['Password is required']
            };
        }

        const feedback = [];
        let score = 0;

        // Length check
        if (password.length < this.minPasswordLength) {
            feedback.push(`Password must be at least ${this.minPasswordLength} characters long`);
        } else if (password.length >= 12) {
            score += 2;
        } else {
            score += 1;
        }

        // Character variety checks
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSymbols = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

        const varietyCount = [hasLowercase, hasUppercase, hasNumbers, hasSymbols].filter(Boolean).length;
        
        if (varietyCount >= 4) {
            score += 3;
        } else if (varietyCount >= 3) {
            score += 2;
        } else if (varietyCount >= 2) {
            score += 1;
        } else {
            feedback.push('Password should include uppercase, lowercase, numbers, and symbols');
        }

        // Common patterns check
        const commonPatterns = [
            /(.)\1{2,}/, // Repeated characters
            /123|234|345|456|567|678|789|890/, // Sequential numbers
            /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, // Sequential letters
            /password|admin|user|login|welcome|qwerty|letmein|monkey|dragon|master|shadow|football|baseball|superman|batman/i // Common passwords
        ];

        for (const pattern of commonPatterns) {
            if (pattern.test(password)) {
                feedback.push('Avoid common patterns and dictionary words');
                score = Math.max(0, score - 1);
                break;
            }
        }

        // Determine overall strength
        let strength = 'Very Weak';
        if (score >= 6) {
            strength = 'Very Strong';
        } else if (score >= 5) {
            strength = 'Strong';
        } else if (score >= 3) {
            strength = 'Medium';
        } else if (score >= 1) {
            strength = 'Weak';
        }

        const isValid = score >= 3 && password.length >= this.minPasswordLength;

        return {
            isValid,
            score,
            strength,
            feedback: feedback.length > 0 ? feedback : ['Password meets requirements']
        };
    }

    /**
     * Generate a secure session secret
     * @param {number} length - Secret length in bytes (default: 64)
     * @returns {string} Hex-encoded secret
     */
    generateSessionSecret(length = 64) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Create a password hash for environment variable storage
     * This is a utility method for initial setup
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hash suitable for environment variable
     */
    async createEnvironmentHash(password) {
        const validation = this.validatePasswordStrength(password);
        
        if (!validation.isValid) {
            throw new Error(`Password validation failed: ${validation.feedback.join(', ')}`);
        }

        return await this.hashPassword(password);
    }

    /**
     * Compare timing-safe strings to prevent timing attacks
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {boolean} True if strings match
     */
    timingSafeEqual(a, b) {
        if (!a || !b || a.length !== b.length) {
            return false;
        }

        return crypto.timingSafeEqual(
            Buffer.from(a, 'utf8'),
            Buffer.from(b, 'utf8')
        );
    }
}

// Static methods for convenience
PasswordUtils.createHash = async function(password) {
    const utils = new PasswordUtils();
    return await utils.hashPassword(password);
};

PasswordUtils.verify = async function(password, hash) {
    const utils = new PasswordUtils();
    return await utils.verifyPassword(password, hash);
};

PasswordUtils.generatePassword = function(length, options) {
    const utils = new PasswordUtils();
    return utils.generateSecurePassword(length, options);
};

PasswordUtils.validateStrength = function(password) {
    const utils = new PasswordUtils();
    return utils.validatePasswordStrength(password);
};

module.exports = PasswordUtils;