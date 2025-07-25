#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const AuthenticationService = require('../src/services/auth-service');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    // In environments where setRawMode is not available, fall back to regular input
    if (typeof process.stdin.setRawMode === 'function') {
      process.stdout.write(prompt);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      let password = '';
      
      const onData = (char) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl+D
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl+C
            process.exit();
            break;
          case '\u007f': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            password += char;
            process.stdout.write('*');
            break;
        }
      };
      
      process.stdin.on('data', onData);
    } else {
      // Fallback for environments without setRawMode
      console.warn('⚠️  Password will be visible (setRawMode not available)');
      rl.question(prompt, resolve);
    }
  });
}

async function setupAuthentication() {
  console.log('🔐 VPN Server Authentication Setup');
  console.log('=====================================\n');
  
  try {
    // Check if running with command line arguments for automated setup
    const args = process.argv.slice(2);
    let username, password;
    
    if (args.length >= 2) {
      username = args[0];
      password = args[1];
      console.log(`Using provided credentials for user: ${username}`);
    } else {
      // Get username
      username = await question('Enter admin username: ');
      if (!username || username.trim().length === 0) {
        console.error('❌ Username cannot be empty');
        process.exit(1);
      }
      
      // Get password
      password = await questionHidden('Enter admin password: ');
      if (!password || password.length < 8) {
        console.error('❌ Password must be at least 8 characters long');
        process.exit(1);
      }
      
      // Confirm password
      const confirmPassword = await questionHidden('Confirm admin password: ');
      if (password !== confirmPassword) {
        console.error('❌ Passwords do not match');
        process.exit(1);
      }
    }
    
    // Validate password length
    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    
    console.log('\n🔄 Generating secure password hash...');
    
    // Generate password hash
    const passwordHash = await AuthenticationService.createPasswordHash(password);
    
    // Generate JWT secrets
    const crypto = require('crypto');
    const jwtSecret = crypto.randomBytes(64).toString('hex');
    const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
    
    // Create .env file
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = `# VPN Server Authentication Configuration
# Generated on ${new Date().toISOString()}

# Admin Credentials
VPN_USERNAME=${username.trim()}
VPN_PASSWORD_HASH=${passwordHash}

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security Settings
ENFORCE_IP_VALIDATION=false
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900000

# Server Configuration
PORT=3000
NODE_ENV=production
`;
    
    await fs.writeFile(envPath, envContent, 'utf8');
    
    console.log('✅ Authentication setup completed successfully!');
    console.log(`📁 Configuration saved to: ${envPath}`);
    console.log('\n🔒 Security Notes:');
    console.log('- Keep your .env file secure and never commit it to version control');
    console.log('- The password has been hashed using bcrypt with 12 salt rounds');
    console.log('- JWT tokens expire after 15 minutes for security');
    console.log('- Failed login attempts are rate limited and tracked');
    console.log('\n🚀 You can now start the server with: npm start');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  setupAuthentication();
}

module.exports = { setupAuthentication };