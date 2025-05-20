const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const config = require('../src/config');

// Create readline interface
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

async function bundleClientConfig() {
  try {
    console.log('Bundling OpenVPN client configuration...');
    
    // Ask for client name
    const clientName = await askQuestion('Enter the client name (the one you generated with generate-client): ');
    
    if (!clientName) {
      console.log('Client name is required');
      rl.close();
      return;
    }
    
    // Ask for server IP
    const serverIp = await askQuestion('Enter the server\'s public IP address: ');
    
    if (!serverIp) {
      console.log('Server IP is required');
      rl.close();
      return;
    }
    
    // Paths to the required files
    const certDir = config.certificates.dir;
    const clientConfig = path.join(certDir, `${clientName}.ovpn`);
    const caFile = path.join(certDir, 'ca.crt');
    const clientCertFile = path.join(certDir, `${clientName}.crt`);
    const clientKeyFile = path.join(certDir, `${clientName}.key`);
    
    // Check if all required files exist
    try {
      await fs.access(clientConfig);
      await fs.access(caFile);
      await fs.access(clientCertFile);
      await fs.access(clientKeyFile);
    } catch (err) {
      console.error(`❌ Error: Could not find one or more required files: ${err.message}`);
      console.log(`Make sure you've generated a client certificate for "${clientName}" using the 'generate-client' script.`);
      rl.close();
      return;
    }
    
    // Read the original config file
    let ovpnContent = await fs.readFile(clientConfig, 'utf8');
    
    // Replace the server IP
    ovpnContent = ovpnContent.replace('YOUR_SERVER_IP', serverIp);
    
    // Read the certificate and key files
    const caContent = await fs.readFile(caFile, 'utf8');
    const clientCertContent = await fs.readFile(clientCertFile, 'utf8');
    const clientKeyContent = await fs.readFile(clientKeyFile, 'utf8');
    
    // Remove the existing references to external files
    ovpnContent = ovpnContent
      .replace(/ca ca.crt\s*/, '')
      .replace(new RegExp(`cert ${clientName}.crt\\s*`), '')
      .replace(new RegExp(`key ${clientName}.key\\s*`), '');
    
    // Embed the certificates and key in the config
    ovpnContent += `\n<ca>\n${caContent}</ca>\n`;
    ovpnContent += `\n<cert>\n${clientCertContent}</cert>\n`;
    ovpnContent += `\n<key>\n${clientKeyContent}</key>\n`;
    
    // Add recommended client settings
    ovpnContent += `
# Added settings for better compatibility
key-direction 1
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
verb 3
`;
    
    // Write the bundled config file
    const bundledConfigPath = path.join(certDir, `${clientName}-bundled.ovpn`);
    await fs.writeFile(bundledConfigPath, ovpnContent);
    
    console.log(`\n✅ Successfully created bundled OpenVPN config file:`);
    console.log(`   ${bundledConfigPath}`);
    console.log(`\nThis file contains all the necessary certificates and keys.`);
    console.log(`Import this file directly into your OpenVPN client app.`);
    
    rl.close();
  } catch (error) {
    console.error(`❌ Error bundling client config: ${error.message}`);
    rl.close();
  }
}

bundleClientConfig().catch(console.error);