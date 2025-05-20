const { spawn } = require('cross-spawn');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CertificateManager = require('../src/utils/certificate-manager');

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generateClient() {
  try {
    // Ask for client name
    const clientName = await new Promise((resolve) => {
      rl.question('Enter client name: ', (answer) => {
        resolve(answer.trim());
      });
    });

    if (!clientName) {
      console.error('Client name is required');
      rl.close();
      return;
    }

    console.log(`Generating certificates for client: ${clientName}`);

    // Initialize certificate manager
    const certManager = new CertificateManager();
    
    // Generate client certificate
    await certManager.generateClientCertificate(clientName);
    
    // Get server IP address for configuration
    const serverIp = await new Promise((resolve) => {
      rl.question('Enter the server\'s public IP address: ', (answer) => {
        resolve(answer.trim());
      });
    });

    // Update client config with the server IP
    if (serverIp) {
      const config = require('../src/config');
      const clientConfigPath = path.join(config.certificates.dir, `${clientName}.ovpn`);
      
      if (await fs.pathExists(clientConfigPath)) {
        let clientConfig = await fs.readFile(clientConfigPath, 'utf8');
        clientConfig = clientConfig.replace('YOUR_SERVER_IP', serverIp);
        await fs.writeFile(clientConfigPath, clientConfig);
      }
    }

    console.log(`
Client configuration generated successfully!

Client config file is saved at:
${path.resolve(require('../src/config').certificates.dir, `${clientName}.ovpn`)}

Share this file securely with the client.
`);

    rl.close();
  } catch (error) {
    console.error('Error generating client certificate:', error);
    rl.close();
    process.exit(1);
  }
}

generateClient();