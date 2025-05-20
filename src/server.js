const express = require('express');
const { spawn } = require('child_process');
const winston = require('winston');
const os = require('os');
const path = require('path');
const config = require('./config');
const CertificateManager = require('./utils/certificate-manager');

const app = express();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() }) // Add console logging
  ]
});

// Initialize OpenVPN server
async function initializeVPNServer() {
  try {
    logger.info('Initializing VPN server...');
    logger.info(`Detected platform: ${os.platform()}`);
    
    // Initialize PKI and certificates
    const certManager = new CertificateManager(logger);
    
    logger.info('Initializing PKI...');
    await certManager.initializePKI().catch(err => {
      logger.error(`PKI initialization error: ${err.message}`);
      throw err;
    });
    
    logger.info('Generating server certificates...');
    await certManager.generateServerCertificates().catch(err => {
      logger.error(`Server certificate generation error: ${err.message}`);
      throw err;
    });
    
    logger.info('VPN server initialized successfully!');

    // Start OpenVPN server process
    startOpenVPNServer();
  } catch (error) {
    logger.error(`Failed to initialize VPN server: ${error.message}`, { error });
    // Don't exit the process, so the API server still works
    logger.info('API server will continue to run, but OpenVPN server failed to start');
  }
}

function startOpenVPNServer() {
  try {
    logger.info('Starting OpenVPN server...');
    
    // Determine the openvpn executable name based on the platform
    let openvpnCommand = 'openvpn';
    let configPath = '/etc/openvpn/openvpn.conf';
    
    if (os.platform() === 'win32') {
      // On Windows, OpenVPN is usually installed in Program Files
      openvpnCommand = path.join('C:\\Program Files\\OpenVPN\\bin\\openvpn.exe');
      configPath = path.join('C:\\Program Files\\OpenVPN\\config\\openvpn.conf');
    }
    
    logger.info(`Using OpenVPN command: ${openvpnCommand}`);
    logger.info(`Using config path: ${configPath}`);
    
    // Check if the config file exists
    const fs = require('fs');
    if (!fs.existsSync(configPath)) {
      logger.error(`OpenVPN config file not found at: ${configPath}`);
      logger.info('Skipping OpenVPN server start due to missing config file');
      return;
    }
    
    const openvpn = spawn(openvpnCommand, ['--config', configPath]);

    openvpn.stdout.on('data', (data) => {
      logger.info(`OpenVPN: ${data}`);
    });

    openvpn.stderr.on('data', (data) => {
      logger.error(`OpenVPN Error: ${data}`);
    });

    openvpn.on('close', (code) => {
      logger.info(`OpenVPN process exited with code ${code}`);
      // Restart OpenVPN after a delay if it crashes
      setTimeout(startOpenVPNServer, 5000);
    });
    
    logger.info('OpenVPN server started successfully');
  } catch (error) {
    logger.error(`Failed to start OpenVPN process: ${error.message}`, { error });
    // Try to restart after a delay
    setTimeout(startOpenVPNServer, 5000);
  }
}


// API routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const fs = require('fs').promises;

// Serve the form on GET
app.get('/get-cert', (req, res) => {
  res.send(`
    <html>
      <head><title>Download VPN Config</title></head>
      <body>
        <h2>Authenticate to download VPN config</h2>
        <form method="POST" action="/get-cert">
          <label>Username: <input type="text" name="username" /></label><br/>
          <label>Password: <input type="password" name="password" /></label><br/>
          <button type="submit">Get Config</button>
        </form>
      </body>
    </html>
  `);
});

// Handle form POST
app.post('/get-cert', express.urlencoded({ extended: true }), async (req, res) => {
  const { username, password } = req.body;

  if (username === 'root' && password === 'paparol@42') {
    // create a unique client name each time to avoid Easy‑RSA conflicts
    const clientName = `root_${Date.now()}`;
    const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-client.sh');
    const { spawn } = require('child_process');

    const generate = spawn('bash', [scriptPath, clientName]);

    generate.stdout.on('data', data => {
      logger.info(`GenerateClient STDOUT: ${data}`);
    });

    generate.stderr.on('data', data => {
      logger.error(`GenerateClient STDERR: ${data}`);
    });

    generate.on('close', async (code) => {
      if (code !== 0) {
        logger.error(`generate-client.sh exited with code ${code}`);
        return res.status(500).send('Failed to generate certificate');
      }

      try {
        const certPath = path.join(config.certificates.dir, `${clientName}.ovpn`);
        const certData = await fs.readFile(certPath, 'utf8');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${clientName}.ovpn"`);
        return res.send(certData);
      } catch (err) {
        logger.error(`Failed to read generated certificate: ${err.message}`);
        return res.status(500).send('Certificate read failed');
      }
    });
  } else {
    return res.status(403).send('Unauthorized');
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  logger.info(`Management server listening on port ${port}`);
  initializeVPNServer();
});