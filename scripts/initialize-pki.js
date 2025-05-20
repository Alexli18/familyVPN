const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const mkdirp = require('mkdirp');

// Load config
const config = require('../src/config');

async function initializePKI() {
  console.log('Starting PKI initialization process...');
  console.log(`Platform: ${os.platform()}`);
  console.log(`Certificates directory: ${config.certificates.dir}`);
  
  // Ensure certificates directory exists
  await mkdirp(config.certificates.dir);
  console.log('✅ Certificates directory created/verified');
  
  // Define easy-rsa path
  const easyrsaPath = path.join(process.cwd(), 'easy-rsa');
  console.log(`Using Easy-RSA path: ${easyrsaPath}`);
  
  // Check if Easy-RSA exists
  try {
    await fs.access(easyrsaPath);
    console.log('✅ Easy-RSA directory exists');
    
    // Check if easyrsa script exists
    const easyrsaScript = path.join(easyrsaPath, 'easyrsa');
    try {
      await fs.access(easyrsaScript);
      console.log('✅ easyrsa script exists');
      
      // Make it executable
      await fs.chmod(easyrsaScript, 0o755);
      console.log('✅ ensured easyrsa script is executable');
    } catch (err) {
      console.error('❌ easyrsa script not found:', err.message);
      return;
    }
  } catch (err) {
    console.error('❌ Easy-RSA directory not found:', err.message);
    console.log('Please run setup first');
    return;
  }
  
  // Clean up any existing PKI directory
  const pkiDir = path.join(easyrsaPath, 'pki');
  try {
    if (await fs.pathExists(pkiDir)) {
      console.log('Removing existing PKI directory...');
      await fs.remove(pkiDir);
      console.log('✅ Removed existing PKI directory');
    }
  } catch (err) {
    console.error('❌ Error removing PKI directory:', err.message);
  }
  
  // Initialize PKI
  console.log('\nStep 1: Initializing PKI...');
  try {
    const { stdout, stderr } = await exec(`cd "${easyrsaPath}" && ./easyrsa init-pki`);
    console.log('Command output:', stdout);
    if (stderr) console.warn('Command stderr:', stderr);
    console.log('✅ PKI initialized');
  } catch (err) {
    console.error('❌ Error initializing PKI:', err.message);
    if (err.stdout) console.log('Command stdout:', err.stdout);
    if (err.stderr) console.error('Command stderr:', err.stderr);
    return;
  }
  
  // Build CA (non-interactive)
  console.log('\nStep 2: Building CA...');
  try {
    const { stdout, stderr } = await exec(`cd "${easyrsaPath}" && ./easyrsa --batch build-ca nopass`);
    console.log('Command output:', stdout);
    if (stderr) console.warn('Command stderr:', stderr);
    console.log('✅ CA built successfully');
  } catch (err) {
    console.error('❌ Error building CA:', err.message);
    if (err.stdout) console.log('Command stdout:', err.stdout);
    if (err.stderr) console.error('Command stderr:', err.stderr);
    return;
  }
  
  // Generate DH parameters (with progress indication)
  console.log('\nStep 3: Generating DH parameters...');
  console.log('This may take several minutes. Please be patient.');
  
  try {
    // Start a progress indicator
    const progressInterval = setInterval(() => {
      process.stdout.write('.');
    }, 3000);
    
    const { stdout, stderr } = await exec(`cd "${easyrsaPath}" && ./easyrsa gen-dh`);
    
    // Clear the progress indicator
    clearInterval(progressInterval);
    process.stdout.write('\n');
    
    console.log('Command output:', stdout);
    if (stderr) console.warn('Command stderr:', stderr);
    console.log('✅ DH parameters generated successfully');
  } catch (err) {
    console.error('\n❌ Error generating DH parameters:', err.message);
    if (err.stdout) console.log('Command stdout:', err.stdout);
    if (err.stderr) console.error('Command stderr:', err.stderr);
    return;
  }
  
  // Generate server certificate
  console.log('\nStep 4: Generating server certificate...');
  try {
    const { stdout, stderr } = await exec(`cd "${easyrsaPath}" && ./easyrsa --batch build-server-full ${config.certificates.serverCertName} nopass`);
    console.log('Command output:', stdout);
    if (stderr) console.warn('Command stderr:', stderr);
    console.log('✅ Server certificate generated');
  } catch (err) {
    console.error('❌ Error generating server certificate:', err.message);
    if (err.stdout) console.log('Command stdout:', err.stdout);
    if (err.stderr) console.error('Command stderr:', err.stderr);
    return;
  }
  
  // Copy certificates to the certificate directory
  console.log('\nStep 5: Copying certificates to certificate directory...');
  try {
    // Source paths in the pki directory
    const sourcePaths = {
      ca: path.join(easyrsaPath, 'pki', 'ca.crt'),
      cert: path.join(easyrsaPath, 'pki', 'issued', `${config.certificates.serverCertName}.crt`),
      key: path.join(easyrsaPath, 'pki', 'private', `${config.certificates.serverCertName}.key`),
      dh: path.join(easyrsaPath, 'pki', 'dh.pem')
    };
    
    // Destination paths in the certificates directory
    const destPaths = {
      ca: path.join(config.certificates.dir, 'ca.crt'),
      cert: path.join(config.certificates.dir, `${config.certificates.serverCertName}.crt`),
      key: path.join(config.certificates.dir, `${config.certificates.serverCertName}.key`),
      dh: path.join(config.certificates.dir, 'dh.pem')
    };
    
    // Copy each file
    for (const [type, srcPath] of Object.entries(sourcePaths)) {
      try {
        await fs.access(srcPath);
        await fs.copyFile(srcPath, destPaths[type]);
        console.log(`✅ Copied ${type} certificate to: ${destPaths[type]}`);
      } catch (err) {
        console.warn(`❌ Could not copy ${type} certificate: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error copying certificates:', error.message);
  }
  
  console.log('\n🎉 PKI initialization completed successfully!');
  console.log('\nYou can now start your VPN server.');
}

initializePKI().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});