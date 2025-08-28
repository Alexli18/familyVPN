#!/usr/bin/env node

const readline = require('readline');
const path = require('path');
const fs = require('fs').promises;
const PasswordUtils = require('../src/utils/password-utils');
const UserConfigManager = require('../src/utils/user-config');

// Mock logger for setup script
const logger = {
    info: (msg, data) => console.log(`ℹ️  ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
    warn: (msg, data) => console.log(`⚠️  ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
    error: (msg, data) => console.error(`❌ ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
    debug: (msg, data) => console.log(`🐛 ${msg}`, data ? JSON.stringify(data, null, 2) : '')
};

/**
 * Interactive setup script for web interface admin user
 */
class WebAdminSetup {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.passwordUtils = new PasswordUtils();
    }

    /**
     * Prompt user for input
     */
    async prompt(question, options = {}) {
        return new Promise((resolve) => {
            const { hidden = false, validate = null } = options;
            
            if (hidden) {
                // Hide input for passwords
                process.stdout.write(question);
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.setEncoding('utf8');
                
                let input = '';
                const onData = (char) => {
                    if (char === '\u0003') { // Ctrl+C
                        process.exit();
                    } else if (char === '\r' || char === '\n') {
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.stdin.removeListener('data', onData);
                        process.stdout.write('\n');
                        
                        if (validate) {
                            const validation = validate(input);
                            if (!validation.isValid) {
                                console.log(`❌ ${validation.message}`);
                                return this.prompt(question, options).then(resolve);
                            }
                        }
                        
                        resolve(input);
                    } else if (char === '\u007f') { // Backspace
                        if (input.length > 0) {
                            input = input.slice(0, -1);
                            process.stdout.write('\b \b');
                        }
                    } else {
                        input += char;
                        process.stdout.write('*');
                    }
                };
                
                process.stdin.on('data', onData);
            } else {
                this.rl.question(question, (answer) => {
                    if (validate) {
                        const validation = validate(answer);
                        if (!validation.isValid) {
                            console.log(`❌ ${validation.message}`);
                            return this.prompt(question, options).then(resolve);
                        }
                    }
                    resolve(answer);
                });
            }
        });
    }

    /**
     * Display welcome message
     */
    displayWelcome() {
        console.log('\n🔐 VPN Server Web Interface Admin Setup');
        console.log('=====================================\n');
        console.log('This script will help you create an admin user for the web interface.');
        console.log('The admin user can log in to generate and manage VPN certificates.\n');
    }

    /**
     * Check if admin user already exists
     */
    async checkExistingAdmin() {
        try {
            const userConfig = new UserConfigManager(logger);
            await userConfig.initialize();
            
            const users = await userConfig.listUsers();
            const adminUsers = users.filter(user => user.role === 'admin' && user.isActive);
            
            if (adminUsers.length > 0) {
                console.log('⚠️  Existing admin users found:');
                adminUsers.forEach(user => {
                    console.log(`   - ${user.username} (created: ${user.created}, last login: ${user.lastLogin || 'never'})`);
                });
                console.log('');
                
                const overwrite = await this.prompt('Do you want to create a new admin user anyway? (y/N): ');
                if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
                    console.log('Setup cancelled.');
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            // If there's an error loading config, assume no admin exists
            logger.debug('No existing admin configuration found', { error: error.message });
            return true;
        }
    }

    /**
     * Get admin username
     */
    async getUsername() {
        const username = await this.prompt('Enter admin username: ', {
            validate: (input) => {
                if (!input || input.trim().length === 0) {
                    return { isValid: false, message: 'Username cannot be empty' };
                }
                if (input.length < 3) {
                    return { isValid: false, message: 'Username must be at least 3 characters long' };
                }
                if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
                    return { isValid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
                }
                return { isValid: true };
            }
        });
        
        return username.trim();
    }

    /**
     * Get admin password
     */
    async getPassword() {
        const password = await this.prompt('Enter admin password: ', {
            hidden: true,
            validate: (input) => {
                const validation = this.passwordUtils.validatePasswordStrength(input);
                if (!validation.isValid) {
                    return { 
                        isValid: false, 
                        message: `Password validation failed: ${validation.feedback.join(', ')}` 
                    };
                }
                return { isValid: true };
            }
        });
        
        const confirmPassword = await this.prompt('Confirm admin password: ', {
            hidden: true,
            validate: (input) => {
                if (input !== password) {
                    return { isValid: false, message: 'Passwords do not match' };
                }
                return { isValid: true };
            }
        });
        
        return password;
    }

    /**
     * Create admin user
     */
    async createAdmin(username, password) {
        try {
            const userConfig = new UserConfigManager(logger);
            await userConfig.initialize();
            
            const result = await userConfig.createAdminUser(username, password, {
                overwrite: true,
                createdBy: 'setup-script'
            });
            
            console.log(`✅ Admin user '${result.username}' created successfully!`);
            console.log(`   Role: ${result.role}`);
            console.log(`   Created: ${result.created}`);
            
            return result;
        } catch (error) {
            console.error(`❌ Failed to create admin user: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate environment variables
     */
    async generateEnvVars(username, password) {
        try {
            const passwordHash = await this.passwordUtils.hashPassword(password);
            const sessionSecret = this.passwordUtils.generateSessionSecret();
            
            console.log('\n📝 Environment Variables:');
            console.log('Add these to your .env file or environment configuration:\n');
            console.log(`WEB_ADMIN_USERNAME=${username}`);
            console.log(`WEB_ADMIN_PASSWORD_HASH=${passwordHash}`);
            console.log(`WEB_SESSION_SECRET=${sessionSecret}`);
            console.log('');
            
            // Optionally save to .env file
            const saveToEnv = await this.prompt('Save these variables to .env file? (Y/n): ');
            if (saveToEnv.toLowerCase() !== 'n' && saveToEnv.toLowerCase() !== 'no') {
                await this.saveToEnvFile(username, passwordHash, sessionSecret);
            }
            
        } catch (error) {
            console.error(`❌ Failed to generate environment variables: ${error.message}`);
            throw error;
        }
    }

    /**
     * Save environment variables to .env file
     */
    async saveToEnvFile(username, passwordHash, sessionSecret) {
        try {
            const envPath = path.join(process.cwd(), '.env');
            let envContent = '';
            
            // Read existing .env file if it exists
            try {
                envContent = await fs.readFile(envPath, 'utf8');
            } catch (error) {
                // File doesn't exist, start with empty content
                envContent = '';
            }
            
            // Remove existing web admin variables
            envContent = envContent
                .split('\n')
                .filter(line => !line.startsWith('WEB_ADMIN_USERNAME=') && 
                               !line.startsWith('WEB_ADMIN_PASSWORD_HASH=') && 
                               !line.startsWith('WEB_SESSION_SECRET='))
                .join('\n');
            
            // Add new variables
            if (envContent && !envContent.endsWith('\n')) {
                envContent += '\n';
            }
            
            envContent += `\n# Web Interface Admin Configuration\n`;
            envContent += `WEB_ADMIN_USERNAME=${username}\n`;
            envContent += `WEB_ADMIN_PASSWORD_HASH=${passwordHash}\n`;
            envContent += `WEB_SESSION_SECRET=${sessionSecret}\n`;
            
            await fs.writeFile(envPath, envContent);
            console.log(`✅ Environment variables saved to ${envPath}`);
            
        } catch (error) {
            console.error(`❌ Failed to save to .env file: ${error.message}`);
            console.log('Please manually add the environment variables shown above.');
        }
    }

    /**
     * Display completion message
     */
    displayCompletion() {
        console.log('\n🎉 Web Admin Setup Complete!');
        console.log('=============================\n');
        console.log('Your admin user has been created and configured.');
        console.log('You can now:');
        console.log('  1. Start the VPN server: npm start');
        console.log('  2. Open the web interface: http://localhost:3000/login');
        console.log('  3. Log in with your admin credentials');
        console.log('  4. Generate VPN certificates for your devices\n');
        console.log('For security, make sure to:');
        console.log('  - Use HTTPS in production (set WEB_HTTPS_ONLY=true)');
        console.log('  - Keep your admin credentials secure');
        console.log('  - Regularly update your password\n');
    }

    /**
     * Run the setup process
     */
    async run() {
        try {
            this.displayWelcome();
            
            const shouldContinue = await this.checkExistingAdmin();
            if (!shouldContinue) {
                this.rl.close();
                return;
            }
            
            const username = await this.getUsername();
            const password = await this.getPassword();
            
            console.log('\n🔄 Creating admin user...');
            await this.createAdmin(username, password);
            
            console.log('\n🔄 Generating configuration...');
            await this.generateEnvVars(username, password);
            
            this.displayCompletion();
            
        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            process.exit(1);
        } finally {
            this.rl.close();
        }
    }

    /**
     * Close readline interface
     */
    close() {
        this.rl.close();
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Setup cancelled by user.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Setup terminated.');
    process.exit(0);
});

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new WebAdminSetup();
    setup.run().catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}

module.exports = WebAdminSetup;