const fs = require('fs-extra');
const path = require('path');
const rimraf = require('rimraf');
const os = require('os');
const readline = require('readline');

console.log('Cleaning up OpenVPN files and directories...');

const platform = os.platform();
console.log(`Detected platform: ${platform}`);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function runCleanup() {
  try {
    console.log('\nWould you like to:');
    console.log('1) Clean up temporary files only');
    console.log('2) Clean up temporary files AND reset PKI certificates');
    
    const choice = await askQuestion('Enter your choice (1 or 2): ');
    
    // Clean local easy-rsa directory if it exists
    const localEasyRsa = path.join(process.cwd(), 'easy-rsa');
    
    if (choice === '2') {
      // Confirm the user wants to remove all certificates
      const confirm = await askQuestion('⚠️  WARNING: This will remove ALL certificates and keys. Are you sure? (yes/no): ');
      
      if (confirm === 'yes') {
        console.log('Removing PKI directory...');
        
        // Remove the PKI directory
        if (fs.existsSync(path.join(localEasyRsa, 'pki'))) {
          await new Promise((resolve, reject) => {
            rimraf(path.join(localEasyRsa, 'pki'), (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          console.log('✅ PKI directory removed');
        }
        
        // Also check for certificate directory from config
        try {
          const config = require('../src/config');
          if (fs.existsSync(config.certificates.dir)) {
            const certFiles = await fs.readdir(config.certificates.dir);
            for (const file of certFiles) {
              if (file.endsWith('.crt') || file.endsWith('.key') || file.endsWith('.pem') || file.endsWith('.ovpn')) {
                await fs.unlink(path.join(config.certificates.dir, file));
                console.log(`Removed: ${file}`);
              }
            }
            console.log('✅ Certificate files removed');
          }
        } catch (error) {
          console.log('Could not clean certificates directory:', error.message);
        }
      }
    }
    
    // Clean log files
    const logFiles = ['error.log', 'combined.log'];
    for (const file of logFiles) {
      if (fs.existsSync(file)) {
        console.log(`Removing log file: ${file}`);
        await fs.unlink(file);
      }
    }
    
    // Clean temporary downloads
    if (platform === 'win32') {
      const tempFile = path.join(os.tmpdir(), 'easyrsa.zip');
      if (fs.existsSync(tempFile)) {
        console.log(`Removing temporary file: ${tempFile}`);
        await fs.unlink(tempFile);
      }
    } else {
      const tempFile = '/tmp/easyrsa.tgz';
      if (fs.existsSync(tempFile)) {
        console.log(`Removing temporary file: ${tempFile}`);
        await fs.unlink(tempFile);
      }
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    rl.close();
  } catch (error) {
    console.error('Error during cleanup:', error);
    rl.close();
    process.exit(1);
  }
}

runCleanup();