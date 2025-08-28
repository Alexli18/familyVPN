const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const PasswordUtils = require('./password-utils');

/**
 * User configuration management for web interface admin credentials
 */
class UserConfigManager {
    constructor(logger, configDir = null) {
        this.logger = logger;
        this.configDir = configDir || process.env.VPN_CONFIG_DIR || path.join(process.env.HOME || process.env.USERPROFILE, '.privatevpn', 'config');
        this.userConfigFile = path.join(this.configDir, 'web-users.json');
        this.passwordUtils = new PasswordUtils();
    }

    /**
     * Initialize user configuration directory and files
     */
    async initialize() {
        try {
            // Ensure config directory exists
            await fs.mkdir(this.configDir, { recursive: true });
            
            // Check if user config file exists
            try {
                await fs.access(this.userConfigFile);
                this.logger.info('User configuration file found', { path: this.userConfigFile });
            } catch (error) {
                // File doesn't exist, create default configuration
                await this.createDefaultUserConfig();
            }
        } catch (error) {
            this.logger.error('Failed to initialize user configuration', { 
                error: error.message,
                configDir: this.configDir 
            });
            throw error;
        }
    }

    /**
     * Create default user configuration
     */
    async createDefaultUserConfig() {
        const defaultConfig = {
            version: '1.0.0',
            created: new Date().toISOString(),
            users: {},
            settings: {
                sessionTimeout: 30 * 60 * 1000, // 30 minutes
                maxFailedAttempts: 5,
                lockoutDuration: 15 * 60 * 1000, // 15 minutes
                requirePasswordChange: false,
                passwordMinLength: 8
            }
        };

        // Check if admin user is configured via environment variables
        const envUsername = process.env.WEB_ADMIN_USERNAME || process.env.VPN_USERNAME;
        const envPasswordHash = process.env.WEB_ADMIN_PASSWORD_HASH || process.env.VPN_PASSWORD_HASH;

        if (envUsername && envPasswordHash) {
            defaultConfig.users[envUsername] = {
                username: envUsername,
                passwordHash: envPasswordHash,
                role: 'admin',
                created: new Date().toISOString(),
                lastLogin: null,
                loginCount: 0,
                isActive: true,
                source: 'environment'
            };
            
            this.logger.info('Admin user configured from environment variables', { username: envUsername });
        } else {
            this.logger.warn('No admin user configured. Use createAdminUser() to set up initial admin.');
        }

        await this.saveUserConfig(defaultConfig);
        this.logger.info('Default user configuration created', { path: this.userConfigFile });
    }

    /**
     * Load user configuration from file
     */
    async loadUserConfig() {
        try {
            const configData = await fs.readFile(this.userConfigFile, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, initialize it
                await this.initialize();
                return await this.loadUserConfig();
            }
            
            this.logger.error('Failed to load user configuration', { 
                error: error.message,
                path: this.userConfigFile 
            });
            throw error;
        }
    }

    /**
     * Save user configuration to file
     */
    async saveUserConfig(config) {
        try {
            config.lastModified = new Date().toISOString();
            const configData = JSON.stringify(config, null, 2);
            await fs.writeFile(this.userConfigFile, configData, 'utf8');
        } catch (error) {
            this.logger.error('Failed to save user configuration', { 
                error: error.message,
                path: this.userConfigFile 
            });
            throw error;
        }
    }

    /**
     * Create admin user
     */
    async createAdminUser(username, password, options = {}) {
        try {
            // Validate inputs
            if (!username || typeof username !== 'string' || username.trim().length === 0) {
                throw new Error('Username is required and must be a non-empty string');
            }

            if (!password || typeof password !== 'string') {
                throw new Error('Password is required and must be a string');
            }

            // Validate password strength
            const passwordValidation = this.passwordUtils.validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                throw new Error(`Password validation failed: ${passwordValidation.feedback.join(', ')}`);
            }

            // Load current configuration
            const config = await this.loadUserConfig();

            // Check if user already exists
            if (config.users[username]) {
                if (!options.overwrite) {
                    throw new Error(`User '${username}' already exists. Use overwrite option to replace.`);
                }
                this.logger.warn('Overwriting existing user', { username });
            }

            // Hash password
            const passwordHash = await this.passwordUtils.hashPassword(password);

            // Create user record
            config.users[username] = {
                username: username.trim(),
                passwordHash,
                role: options.role || 'admin',
                created: new Date().toISOString(),
                lastLogin: null,
                loginCount: 0,
                isActive: true,
                source: 'config-file',
                metadata: {
                    createdBy: options.createdBy || 'system',
                    passwordStrength: passwordValidation.strength
                }
            };

            // Save configuration
            await this.saveUserConfig(config);

            this.logger.info('Admin user created successfully', { 
                username,
                role: config.users[username].role 
            });

            return {
                success: true,
                username,
                role: config.users[username].role,
                created: config.users[username].created
            };

        } catch (error) {
            this.logger.error('Failed to create admin user', { 
                error: error.message,
                username 
            });
            throw error;
        }
    }

    /**
     * Authenticate user
     */
    async authenticateUser(username, password) {
        try {
            const config = await this.loadUserConfig();
            const user = config.users[username];

            if (!user) {
                throw new Error('Invalid credentials');
            }

            if (!user.isActive) {
                throw new Error('User account is disabled');
            }

            // Verify password
            const isValidPassword = await this.passwordUtils.verifyPassword(password, user.passwordHash);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            // Update login information
            user.lastLogin = new Date().toISOString();
            user.loginCount = (user.loginCount || 0) + 1;

            await this.saveUserConfig(config);

            this.logger.info('User authenticated successfully', { 
                username,
                loginCount: user.loginCount 
            });

            return {
                success: true,
                user: {
                    username: user.username,
                    role: user.role,
                    lastLogin: user.lastLogin,
                    loginCount: user.loginCount
                }
            };

        } catch (error) {
            this.logger.warn('User authentication failed', { 
                error: error.message,
                username 
            });
            throw error;
        }
    }

    /**
     * Change user password
     */
    async changePassword(username, currentPassword, newPassword) {
        try {
            // First authenticate with current password
            await this.authenticateUser(username, currentPassword);

            // Validate new password
            const passwordValidation = this.passwordUtils.validatePasswordStrength(newPassword);
            if (!passwordValidation.isValid) {
                throw new Error(`New password validation failed: ${passwordValidation.feedback.join(', ')}`);
            }

            // Load configuration and update password
            const config = await this.loadUserConfig();
            const user = config.users[username];

            if (!user) {
                throw new Error('User not found');
            }

            // Hash new password
            const newPasswordHash = await this.passwordUtils.hashPassword(newPassword);
            
            user.passwordHash = newPasswordHash;
            user.passwordChanged = new Date().toISOString();
            
            if (user.metadata) {
                user.metadata.passwordStrength = passwordValidation.strength;
            }

            await this.saveUserConfig(config);

            this.logger.info('User password changed successfully', { username });

            return {
                success: true,
                message: 'Password changed successfully'
            };

        } catch (error) {
            this.logger.error('Failed to change user password', { 
                error: error.message,
                username 
            });
            throw error;
        }
    }

    /**
     * List all users (without sensitive data)
     */
    async listUsers() {
        try {
            const config = await this.loadUserConfig();
            
            const users = Object.values(config.users).map(user => ({
                username: user.username,
                role: user.role,
                created: user.created,
                lastLogin: user.lastLogin,
                loginCount: user.loginCount || 0,
                isActive: user.isActive,
                source: user.source || 'config-file'
            }));

            return users;
        } catch (error) {
            this.logger.error('Failed to list users', { error: error.message });
            throw error;
        }
    }

    /**
     * Disable user account
     */
    async disableUser(username) {
        try {
            const config = await this.loadUserConfig();
            const user = config.users[username];

            if (!user) {
                throw new Error('User not found');
            }

            user.isActive = false;
            user.disabledAt = new Date().toISOString();

            await this.saveUserConfig(config);

            this.logger.info('User account disabled', { username });

            return {
                success: true,
                message: 'User account disabled successfully'
            };

        } catch (error) {
            this.logger.error('Failed to disable user', { 
                error: error.message,
                username 
            });
            throw error;
        }
    }

    /**
     * Enable user account
     */
    async enableUser(username) {
        try {
            const config = await this.loadUserConfig();
            const user = config.users[username];

            if (!user) {
                throw new Error('User not found');
            }

            user.isActive = true;
            delete user.disabledAt;

            await this.saveUserConfig(config);

            this.logger.info('User account enabled', { username });

            return {
                success: true,
                message: 'User account enabled successfully'
            };

        } catch (error) {
            this.logger.error('Failed to enable user', { 
                error: error.message,
                username 
            });
            throw error;
        }
    }

    /**
     * Get user configuration settings
     */
    async getSettings() {
        try {
            const config = await this.loadUserConfig();
            return config.settings || {};
        } catch (error) {
            this.logger.error('Failed to get user settings', { error: error.message });
            throw error;
        }
    }

    /**
     * Update user configuration settings
     */
    async updateSettings(newSettings) {
        try {
            const config = await this.loadUserConfig();
            config.settings = { ...config.settings, ...newSettings };
            await this.saveUserConfig(config);

            this.logger.info('User settings updated', { settings: newSettings });

            return {
                success: true,
                settings: config.settings
            };
        } catch (error) {
            this.logger.error('Failed to update user settings', { 
                error: error.message,
                settings: newSettings 
            });
            throw error;
        }
    }
}

module.exports = UserConfigManager;