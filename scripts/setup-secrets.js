#!/usr/bin/env node

/**
 * Simple Secret Management for Family VPN Server
 * Basic secure environment setup for single-node deployment
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class SimpleSecretManager {
    constructor() {
        this.envPath = path.join(process.cwd(), '.env');
    }

    /**
     * Generate secure environment variables
     */
    async generateSecureEnv() {
        console.log('🔐 Generating secure environment configuration...');
        
        // Check if .env already exists
        if (await fs.pathExists(this.envPath)) {
            console.log('⚠️  .env file already exists. Backing up...');
            await fs.copy(this.envPath, `${this.envPath}.backup.${Date.now()}`);
        }
        
        const envVars = {
            // Basic settings
            NODE_ENV: 'production',
            
            // VPN configuration
            VPN_SUBNET: '10.8.0.0',
            VPN_NETMASK: '255.255.255.0',
            VPN_CONFIG_DIR: '/etc/openvpn',
            
            // Security settings
            LOG_LEVEL: 'info',
            RATE_LIMIT_WINDOW: '15',
            RATE_LIMIT_MAX: '100',
            
            // Certificate settings
            CERT_KEY_SIZE: '2048',
            CERT_VALIDITY_DAYS: '365'
        };
        
        // Generate secure random secrets
        envVars.JWT_SECRET = crypto.randomBytes(32).toString('hex');
        envVars.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
        
        // Write to .env file with secure permissions
        const envContent = Object.entries(envVars)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        await fs.writeFile(this.envPath, envContent, { mode: 0o600 });
        
        console.log('✅ Secure .env file generated');
        console.log('📝 Generated secrets:');
        console.log('   - JWT_SECRET (32 bytes)');
        console.log('   - SESSION_SECRET (32 bytes)');
        
        return envVars;
    }

    /**
     * Validate environment configuration
     */
    async validateEnv() {
        console.log('🔍 Validating environment configuration...');
        
        if (!await fs.pathExists(this.envPath)) {
            throw new Error('.env file not found. Run setup first.');
        }
        
        const envContent = await fs.readFile(this.envPath, 'utf8');
        const requiredVars = ['JWT_SECRET', 'SESSION_SECRET', 'NODE_ENV'];
        
        const missingVars = requiredVars.filter(varName => 
            !envContent.includes(`${varName}=`)
        );
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        
        console.log('✅ Environment configuration is valid');
        return true;
    }


}

/**
 * Main execution
 */
async function main() {
    const secretManager = new SimpleSecretManager();
    
    try {
        console.log('🛡️  Setting up secure environment for family VPN server...');
        
        // Generate secure environment
        await secretManager.generateSecureEnv();
        
        // Validate configuration
        await secretManager.validateEnv();
        
        console.log('\n✅ Secret management setup completed!');
        console.log('📋 Next steps:');
        console.log('   1. Review the generated .env file');
        console.log('   2. Build and run your Docker container');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = SimpleSecretManager;