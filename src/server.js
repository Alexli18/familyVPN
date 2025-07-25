require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const winston = require('winston');
const os = require('os');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const CertificateManager = require('./utils/certificate-manager');
const AuthenticationService = require('./services/auth-service');
const {
  authRateLimit,
  authSlowDown,
  authenticateToken,
  securityHeaders,
  requestLogger
} = require('./middleware/auth-middleware');

const app = express();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ 
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize authentication service
const authService = new AuthenticationService(logger);

// Apply security middleware
app.use(securityHeaders);
app.use(requestLogger(logger));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

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

// Authentication endpoint
app.post('/auth/login', authRateLimit, authSlowDown, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    const result = await authService.authenticate(username, password, req.ip);
    
    // Set secure HTTP-only cookies for tokens
    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Authentication successful',
      expiresIn: result.tokens.expiresIn
    });

  } catch (error) {
    res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
});

// Token refresh endpoint
app.post('/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const tokens = await authService.refreshToken(refreshToken, req.ip);
    
    // Set new tokens in cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresIn: tokens.expiresIn
    });

  } catch (error) {
    res.status(401).json({ 
      error: 'Token refresh failed',
      message: error.message 
    });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Serve the login form on GET
app.get('/get-cert', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>VPN Certificate Download</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .error { color: red; margin-top: 10px; }
          .success { color: green; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h2>🔐 VPN Certificate Download</h2>
        <form id="loginForm">
          <div class="form-group">
            <label>Username:</label>
            <input type="text" id="username" name="username" required />
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button type="submit">Authenticate & Download</button>
        </form>
        <div id="message"></div>
        
        <script>
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageDiv = document.getElementById('message');
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
              // First authenticate
              const authResponse = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
              });
              
              if (!authResponse.ok) {
                const error = await authResponse.json();
                throw new Error(error.message || 'Authentication failed');
              }
              
              messageDiv.innerHTML = '<div class="success">✅ Authentication successful! Generating certificate...</div>';
              
              // Then download certificate
              const certResponse = await fetch('/api/generate-cert', {
                method: 'POST',
                credentials: 'include'
              });
              
              if (!certResponse.ok) {
                const error = await certResponse.json();
                throw new Error(error.message || 'Certificate generation failed');
              }
              
              // Download the certificate file
              const blob = await certResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'vpn-config.ovpn';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              messageDiv.innerHTML = '<div class="success">✅ Certificate downloaded successfully!</div>';
              
            } catch (error) {
              messageDiv.innerHTML = '<div class="error">❌ ' + error.message + '</div>';
            }
          });
        </script>
      </body>
    </html>
  `);
});

// Protected certificate generation endpoint
app.post('/api/generate-cert', authenticateToken(authService), async (req, res) => {
  try {
    // Create a unique client name based on authenticated user and timestamp
    const clientName = `${req.user.username}_${Date.now()}`;
    const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-client.sh');

    logger.info('Generating client certificate', {
      clientName,
      username: req.user.username,
      clientIP: req.ip,
      correlationId: req.correlationId
    });

    const generate = spawn('bash', [scriptPath, clientName]);

    generate.stdout.on('data', data => {
      logger.info(`GenerateClient STDOUT: ${data}`, { correlationId: req.correlationId });
    });

    generate.stderr.on('data', data => {
      logger.error(`GenerateClient STDERR: ${data}`, { correlationId: req.correlationId });
    });

    generate.on('close', async (code) => {
      if (code !== 0) {
        logger.error(`generate-client.sh exited with code ${code}`, { 
          correlationId: req.correlationId,
          clientName 
        });
        return res.status(500).json({ error: 'Failed to generate certificate' });
      }

      try {
        const certPath = path.join(config.certificates.dir, `${clientName}.ovpn`);
        const certData = await fs.readFile(certPath, 'utf8');
        
        logger.info('Certificate generated successfully', {
          clientName,
          username: req.user.username,
          clientIP: req.ip,
          correlationId: req.correlationId
        });
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${clientName}.ovpn"`);
        return res.send(certData);
        
      } catch (err) {
        logger.error(`Failed to read generated certificate: ${err.message}`, { 
          correlationId: req.correlationId,
          clientName 
        });
        return res.status(500).json({ error: 'Certificate read failed' });
      }
    });

  } catch (error) {
    logger.error('Certificate generation error', {
      error: error.message,
      username: req.user.username,
      clientIP: req.ip,
      correlationId: req.correlationId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  logger.info(`Management server listening on port ${port}`);
  initializeVPNServer();
});