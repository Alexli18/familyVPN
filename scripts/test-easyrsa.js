const CertificateManager = require('../src/utils/certificate-manager');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const path = require('path');
const fs = require('fs').promises;

async function testEasyRSA() {
  console.log('Testing Easy-RSA functionality...');
  
  try {
    const certManager = new CertificateManager();
    
    console.log('Step 1: Finding Easy-RSA path...');
    const easyrsaPath = await certManager.findEasyRsaPath();
    console.log(`Found Easy-RSA at: ${easyrsaPath}`);
    
    // Check if it's the downloaded version or system version
    const isDownloaded = easyrsaPath.includes(process.cwd());
    console.log(`Using ${isDownloaded ? 'downloaded' : 'system'} version of Easy-RSA`);
    
    // Verify easyrsa script
    const easyrsaScript = path.join(easyrsaPath, 'easyrsa');
    console.log(`Checking easyrsa script at: ${easyrsaScript}`);
    
    try {
      const stats = await fs.stat(easyrsaScript);
      console.log(`Script exists: ${stats.isFile()}`);
      console.log(`Script size: ${stats.size} bytes`);
      console.log(`Script permissions: ${stats.mode.toString(8)}`);
      
      // Make sure it's executable
      if ((stats.mode & 0o111) === 0) {
        console.log('Script is not executable, fixing permissions...');
        await fs.chmod(easyrsaScript, 0o755);
        console.log('Fixed permissions');
      }
    } catch (error) {
      console.error(`Error checking script: ${error.message}`);
    }
    
    // Try a simple easyrsa version command
    console.log('\nStep 2: Testing a basic Easy-RSA command...');
    try {
      const command = `cd "${easyrsaPath}" && ./easyrsa --version`;
      console.log(`Running command: ${command}`);
      
      const { stdout, stderr } = await exec(command);
      console.log('Command output:');
      console.log(stdout);
      
      if (stderr) {
        console.warn('Command stderr:');
        console.warn(stderr);
      }
      
      console.log('Basic command test successful!\n');
    } catch (error) {
      console.error(`Error running basic command: ${error.message}`);
      if (error.stdout) console.log(`Command stdout: ${error.stdout}`);
      if (error.stderr) console.error(`Command stderr: ${error.stderr}`);
    }
    
    // Try init-pki command
    console.log('\nStep 3: Testing init-pki command...');
    try {
      // First, check if pki directory already exists
      const pkiDir = path.join(easyrsaPath, 'pki');
      let pkiExists = false;
      
      try {
        await fs.access(pkiDir);
        pkiExists = true;
        console.log(`PKI directory already exists at: ${pkiDir}`);
      } catch (err) {
        console.log(`PKI directory does not exist yet: ${pkiDir}`);
      }
      
      if (pkiExists) {
        const backup = `${pkiDir}_backup_${Date.now()}`;
        console.log(`Backing up existing PKI to: ${backup}`);
        await fs.rename(pkiDir, backup);
      }
      
      // Now try init-pki
      const command = `cd "${easyrsaPath}" && ./easyrsa init-pki`;
      console.log(`Running command: ${command}`);
      
      const { stdout, stderr } = await exec(command);
      console.log('Command output:');
      console.log(stdout);
      
      if (stderr) {
        console.warn('Command stderr:');
        console.warn(stderr);
      }
      
      console.log('init-pki command successful!\n');
    } catch (error) {
      console.error(`Error running init-pki command: ${error.message}`);
      if (error.stdout) console.log(`Command stdout: ${error.stdout}`);
      if (error.stderr) console.error(`Command stderr: ${error.stderr}`);
    }
    
    console.log('\nEasy-RSA test completed.');
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
  }
}

testEasyRSA().catch(console.error);