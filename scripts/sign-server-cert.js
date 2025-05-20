const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const config = require('../src/config');

async function signServerCertificate() {
  try {
    console.log('Fixing server certificate issue...');
    
    // Define paths
    const easyrsaPath = path.join(process.cwd(), 'easy-rsa');
    const reqFile = path.join(easyrsaPath, 'pki', 'reqs', 'server.req');
    const certFile = path.join(easyrsaPath, 'pki', 'issued', 'server.crt');
    
    // Check if the request exists
    let reqExists = false;
    try {
      await fs.access(reqFile);
      reqExists = true;
      console.log('✅ Server request file exists');
    } catch (err) {
      console.log('❌ Server request file does not exist');
    }
    
    // Check if the certificate exists
    let certExists = false;
    try {
      await fs.access(certFile);
      certExists = true;
      console.log('✅ Server certificate already exists');
    } catch (err) {
      console.log('❌ Server certificate does not exist');
    }
    
    if (reqExists && !certExists) {
      // Request exists but certificate doesn't - we need to sign it
      console.log('\nSigning server certificate...');
      
      const command = `
        cd "${easyrsaPath}" &&
        ./easyrsa --batch sign-req server server
      `;
      
      const { stdout, stderr } = await exec(command);
      console.log('Command output:', stdout);
      if (stderr) console.warn('Command stderr:', stderr);
      
      console.log('✅ Server certificate signed successfully');
      
      // Copy certificates to the destination directory
      await copyServerCertificates(easyrsaPath, config.certificates.dir);
    } else if (!reqExists) {
      // Neither exists - we need to generate both
      console.log('\nGenerating new server certificate...');
      
      const command = `
        cd "${easyrsaPath}" &&
        ./easyrsa --batch build-server-full server nopass
      `;
      
      const { stdout, stderr } = await exec(command);
      console.log('Command output:', stdout);
      if (stderr) console.warn('Command stderr:', stderr);
      
      console.log('✅ Server certificate generated successfully');
      
      // Copy certificates to the destination directory
      await copyServerCertificates(easyrsaPath, config.certificates.dir);
    } else {
      // Both exist - just copy the certificates
      console.log('\nUsing existing certificates...');
      await copyServerCertificates(easyrsaPath, config.certificates.dir);
    }
    
    console.log('\n🎉 Server certificate setup complete!');
    console.log('\nYou can now start your VPN server.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stdout) console.log('Command stdout:', error.stdout);
    if (error.stderr) console.error('Command stderr:', error.stderr);
  }
}

async function copyServerCertificates(easyrsaPath, destDir) {
  try {
    console.log('\nCopying certificates to destination directory...');
    
    // Source paths in the pki directory
    const sourcePaths = {
      ca: path.join(easyrsaPath, 'pki', 'ca.crt'),
      cert: path.join(easyrsaPath, 'pki', 'issued', 'server.crt'),
      key: path.join(easyrsaPath, 'pki', 'private', 'server.key'),
      dh: path.join(easyrsaPath, 'pki', 'dh.pem')
    };
    
    // Destination paths
    const destPaths = {
      ca: path.join(destDir, 'ca.crt'),
      cert: path.join(destDir, 'server.crt'),
      key: path.join(destDir, 'server.key'),
      dh: path.join(destDir, 'dh.pem')
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
    
    console.log('✅ Certificates copied successfully');
  } catch (error) {
    console.error('❌ Error copying certificates:', error.message);
    throw error;
  }
}

signServerCertificate().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});