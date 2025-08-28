const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('cross-spawn');
const which = require('which');
const os = require('os');
const mkdirp = require('mkdirp');
const readline = require('readline');

console.log('Setting up PrivateVPN environment...');

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
      resolve(answer.trim());
    });
  });
}

async function runSetup() {
  try {
    // Ask for setup type (system-wide or user directory)
    console.log('\nWould you like to:');
    console.log('1) Use system directories (requires admin/sudo privileges)');
    console.log('2) Use local directories in your home folder (recommended)');
    
    const setupType = await askQuestion('Enter your choice (1 or 2): ');
    
    // Determine config directories based on choice
    let configDir, certDir;
    
    if (setupType === '1') {
      // System directories
      if (platform === 'win32') {
        configDir = path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'OpenVPN', 'config');
        certDir = path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'OpenVPN', 'certificates');
      } else {
        configDir = '/etc/openvpn';
        certDir = '/etc/openvpn/certificates';
        
        // For macOS and Linux, remind about sudo
        if (platform === 'darwin' || platform === 'linux') {
          console.log('\n⚠️  You selected system directories which require admin privileges.');
          console.log('Please run this script with sudo: sudo npm run setup');
          console.log('Or choose option 2 to use local directories instead.');
          
          const proceed = await askQuestion('Do you want to continue anyway? (yes/no): ');
          if (proceed.toLowerCase() !== 'yes') {
            console.log('Setup aborted. Please run again with sudo or select option 2.');
            rl.close();
            return;
          }
        }
      }
    } else {
      // User directories - create in home folder
      const homeDir = os.homedir();
      const vpnDir = path.join(homeDir, '.privatevpn');
      configDir = path.join(vpnDir, 'config');
      certDir = path.join(vpnDir, 'certificates');
      
      console.log(`\nUsing local directory: ${vpnDir}`);
      
      // Ensure these paths are saved for the application to use
      // Create a local .env file with these paths
      const envContent = `VPN_CONFIG_DIR=${configDir}\nVPN_CERT_DIR=${certDir}\n`;
      await fs.writeFile(path.join(process.cwd(), '.env'), envContent);
      console.log('Created .env file with local paths');
    }
    
    // Create directories
    console.log(`\nCreating configuration directories...`);
    try {
      await mkdirp(configDir);
      await mkdirp(certDir);
      console.log(`✅ Directories created successfully!`);
    } catch (err) {
      if (err.code === 'EACCES') {
        console.error(`❌ Permission denied when creating directories.`);
        console.error(`Please run this script with sudo or select option 2 for local directories.`);
        rl.close();
        return;
      } else {
        throw err;
      }
    }
    
    // Create hardened OpenVPN config if it doesn't exist
    const configFile = path.join(configDir, 'openvpn.conf');
    try {
      if (!fs.existsSync(configFile)) {
        console.log(`Creating hardened OpenVPN config at ${configFile}`);
        const hardenedConfig = generateSampleConfig(certDir);
        await fs.writeFile(configFile, hardenedConfig);
        console.log(`✅ Hardened OpenVPN config created`);
      } else {
        console.log(`✅ OpenVPN config already exists at ${configFile}`);
        console.log(`   To apply security hardening, run: npm run harden-config`);
      }
    } catch (err) {
      console.error(`❌ Could not create config file: ${err.message}`);
    }
    
    // Check if OpenVPN is installed
    try {
      const openvpnPath = platform === 'win32' 
        ? 'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe' 
        : await which('openvpn').catch(() => null);
      
      if (openvpnPath) {
        console.log(`✅ Found OpenVPN at: ${openvpnPath}`);
      } else {
        throw new Error('OpenVPN not found');
      }
    } catch (err) {
      console.log('❌ OpenVPN not found in PATH. Please install OpenVPN:');
      if (platform === 'darwin') {
        console.log('   macOS: brew install openvpn');
      } else if (platform === 'linux') {
        console.log('   Ubuntu/Debian: sudo apt-get install openvpn');
        console.log('   CentOS/RHEL: sudo yum install openvpn');
      } else if (platform === 'win32') {
        console.log('   Windows: Download and install from https://openvpn.net/community-downloads/');
      }
    }
    
    // Check if Easy-RSA is installed
    await checkEasyRSA();
    
    // Create a config.js that points to the chosen directories
    try {
      const configContent = `module.exports = {
  vpn: {
    subnet: process.env.VPN_SUBNET || '10.8.0.0',
    netmask: process.env.VPN_NETMASK || '255.255.255.0',
    port: 1194,
    protocol: 'udp'
  },
  certificates: {
    dir: process.env.VPN_CERT_DIR || '${certDir.replace(/\\/g, '\\\\')}',
    serverCertName: 'server',
    validityDays: 3650 // 10 years
  },
  config: {
    path: process.env.VPN_CONFIG_DIR || '${configDir.replace(/\\/g, '\\\\')}'
  }
};`;
      
      // Make sure the src directory exists
      const srcDir = path.join(process.cwd(), 'src');
      if (!fs.existsSync(srcDir)) {
        await mkdirp(srcDir);
      }
      
      await fs.writeFile(path.join(srcDir, 'config.js'), configContent);
      console.log(`✅ Created/updated config.js with your selected paths`);
    } catch (err) {
      console.error(`❌ Could not update config.js: ${err.message}`);
    }
    
    console.log('\n✅ Setup completed successfully!');
    console.log(`\nConfiguration directory: ${configDir}`);
    console.log(`Certificates directory: ${certDir}`);
    
    rl.close();
  } catch (error) {
    console.error('Error during setup:', error);
    rl.close();
    process.exit(1);
  }
}

function generateSampleConfig(certDir) {
  // Generate a hardened OpenVPN server config
  const OpenVPNSecurityConfig = require('../src/utils/openvpn-security-config');
  const logger = require('../src/services/logging-service');
  
  const securityConfig = new OpenVPNSecurityConfig({}, logger);
  
  return securityConfig.generateHardenedConfig(certDir, {
    port: 1194,
    protocol: 'udp',
    subnet: '10.8.0.0',
    netmask: '255.255.255.0',
    dnsServers: ['1.1.1.1', '1.0.0.1'], // Secure DNS servers
    logDir: platform === 'win32' ? 'C:\\ProgramData\\OpenVPN\\log' : '/var/log/openvpn'
  });
}

async function checkEasyRSA() {
  const easyRSAPaths = {
    darwin: ['/usr/local/share/easy-rsa', '/opt/homebrew/share/easy-rsa'],
    linux: ['/usr/share/easy-rsa', '/usr/local/share/easy-rsa'],
    win32: ['C:\\Program Files\\OpenVPN\\easy-rsa', 'C:\\Program Files (x86)\\OpenVPN\\easy-rsa']
  };
  
  const paths = easyRSAPaths[platform] || [];
  let found = false;
  
  for (const easyrsa of paths) {
    try {
      await fs.access(easyrsa);
      console.log(`✅ Found Easy-RSA at: ${easyrsa}`);
      found = true;
      break;
    } catch (err) {
      // Path not accessible
    }
  }
  
  if (!found) {
    console.log('ℹ️  Easy-RSA not found in common locations.');
    if (platform === 'darwin') {
      console.log('   You can install it with: brew install easy-rsa');
    } else if (platform === 'linux') {
      console.log('   You can install it with: sudo apt-get install easy-rsa (Debian/Ubuntu)');
      console.log('   or: sudo yum install easy-rsa (CentOS/RHEL)');
    }
    console.log('   Alternatively, the application will download it automatically when needed.');
  }
}

runSetup();