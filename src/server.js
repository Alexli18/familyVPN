require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const cookieParser = require('cookie-parser');
const config = require('./config');
const CertificateManager = require('./utils/certificate-manager');
const NetworkSecurityManager = require('./utils/network-security');
const AuthenticationService = require('./services/auth-service');
const LoggingService = require('./services/logging-service');
const BasicHealthService = require('./services/metrics-service');

const {
  authRateLimit,
  authSlowDown,
  authenticateToken,
  securityHeaders,
  requestLogger
} = require('./middleware/auth-middleware');

// Web interface components
const {
  createSessionMiddleware,
  createSecurityMiddleware,
  createHTTPSEnforcement,
  createGeneralRateLimit,
  createSessionCleanup
} = require('./middleware/session-middleware');

const WebAuthRoutes = require('./routes/auth');
const CertificateRoutes = require('./routes/certificates');

const app = express();

// Initialize simplified services
const loggingService = new LoggingService();
const basicHealthService = new BasicHealthService(loggingService);
const authService = new AuthenticationService(loggingService, basicHealthService);

// Setup log rotation handlers
loggingService.setupLogRotationHandlers();

// Get logger for backward compatibility
const logger = loggingService.getLogger();

// Web interface middleware setup
const sessionMiddleware = createSessionMiddleware({
  sessionSecret: process.env.WEB_SESSION_SECRET
});
const securityMiddleware = createSecurityMiddleware();
const httpsEnforcement = createHTTPSEnforcement();
const generalRateLimit = createGeneralRateLimit(logger);
const sessionCleanup = createSessionCleanup();

// Apply security and session middleware
// Only enforce HTTPS in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.WEB_HTTPS_ONLY === 'true') {
  app.use(httpsEnforcement);
  logger.info('HTTPS enforcement enabled');
} else {
  logger.info('HTTPS enforcement disabled for development');
}
// Temporarily disable security middleware for debugging
// app.use(securityMiddleware);
app.use(securityHeaders);
app.use(generalRateLimit);
app.use(requestLogger(logger, loggingService, basicHealthService));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(sessionCleanup);

// Static file serving for web interface
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Simple template rendering function (no view engine needed)
app.engine('html', (filePath, options, callback) => {
  fs.readFile(filePath, 'utf8')
    .then(content => {
      // Simple template variable replacement
      let rendered = content;
      
      // Replace template variables with values or empty strings
      rendered = rendered.replace(/\{\{csrfToken\}\}/g, options.csrfToken || '');
      rendered = rendered.replace(/\{\{username\}\}/g, options.username || 'Admin');
      rendered = rendered.replace(/\{\{error\}\}/g, options.error || '');
      
      callback(null, rendered);
    })
    .catch(err => callback(err));
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// Initialize OpenVPN server
async function initializeVPNServer() {
  try {
    logger.info('Initializing VPN server...');
    logger.info(`Detected platform: ${os.platform()}`);
    logger.info(`Current working directory: ${process.cwd()}`);
    logger.info(`Certificate directory: ${config.certificates.dir}`);
    logger.info(`Config directory: ${config.config.path}`);
    
    // Check if we can write to the current directory
    try {
      const testFile = path.join(process.cwd(), '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      logger.info('Current directory is writable');
    } catch (writeError) {
      logger.error(`Current directory is not writable: ${writeError.message}`);
      logger.info('VPN server initialization may fail due to read-only filesystem');
    }
    
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
    
    // Initialize network security
    const networkSecurity = new NetworkSecurityManager(config, logger);
    logger.info('Initializing network security...');
    await networkSecurity.initializeNetworkSecurity().catch(err => {
      logger.error(`Network security initialization error: ${err.message}`);
      // Don't throw - continue with VPN server start even if firewall setup fails
      logger.warn('Continuing VPN server initialization without network security features');
    });
    
    logger.info('VPN server initialized successfully!');

    // Start OpenVPN server process only if not in Docker
    if (!process.env.DOCKER_ENV) {
      startOpenVPNServer();
    } else {
      logger.info('Skipping OpenVPN server start in Docker environment');
    }
  } catch (error) {
    logger.error(`Failed to initialize VPN server: ${error.message}`, { error });
    // Don't exit the process, so the API server still works
    logger.info('API server will continue to run, but OpenVPN server failed to start');
  }
}

function startOpenVPNServer() {
  try {
    logger.info('Starting OpenVPN server...');
    
    // Determine the openvpn executable name and config path based on the platform
    let openvpnCommand = 'openvpn';
    let configPath;
    
    if (os.platform() === 'win32') {
      // On Windows, OpenVPN is usually installed in Program Files
      openvpnCommand = path.join('C:\\Program Files\\OpenVPN\\bin\\openvpn.exe');
      configPath = path.join('C:\\Program Files\\OpenVPN\\config\\openvpn.conf');
    } else if (os.platform() === 'darwin') {
      // On macOS, try multiple possible locations
      const macOSPaths = [
        path.join(config.config.path, 'openvpn.conf'),
        '/usr/local/etc/openvpn/openvpn.conf',
        '/opt/homebrew/etc/openvpn/openvpn.conf',
        '/etc/openvpn/openvpn.conf'
      ];
      
      configPath = macOSPaths.find(p => {
        try {
          const fsSync = require('fs');
          return fsSync.existsSync(p);
        } catch (error) {
          return false;
        }
      }) || macOSPaths[0]; // Default to first path if none found
    } else {
      // Linux and other Unix-like systems
      configPath = process.env.OPENVPN_CONFIG || '/etc/openvpn/openvpn.conf';
    }
    
    logger.info(`Using OpenVPN command: ${openvpnCommand}`);
    logger.info(`Using config path: ${configPath}`);
    
    // Check if the config file exists
    const fsSync = require('fs');
    if (!fsSync.existsSync(configPath)) {
      logger.warn(`OpenVPN config file not found at: ${configPath}`);
      logger.info('OpenVPN server not started - config file missing');
      logger.info('To enable OpenVPN server:');
      logger.info(`  1. Create OpenVPN config at: ${configPath}`);
      logger.info('  2. Ensure OpenVPN is installed on your system');
      logger.info('  3. Web interface will still work for certificate management');
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
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await basicHealthService.getBasicHealthStatus();
    basicHealthService.recordHttpRequest('GET', '/health', 200);
    res.json(healthStatus);
  } catch (error) {
    basicHealthService.recordHttpRequest('GET', '/health', 500);
    loggingService.error('Health check failed', { error: error.message });
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

// Metrics endpoint for monitoring
app.get('/metrics', async (req, res) => {
  try {
    const metrics = basicHealthService.getBasicMetrics();
    basicHealthService.recordHttpRequest('GET', '/metrics', 200);
    res.json(metrics);
  } catch (error) {
    basicHealthService.recordHttpRequest('GET', '/metrics', 500);
    loggingService.error('Metrics retrieval failed', { error: error.message });
    res.status(500).json({ error: 'Metrics retrieval failed' });
  }
});

// Network security status endpoint
app.get('/api/network-security/status', authenticateToken(authService), async (req, res) => {
  try {
    const networkSecurity = new NetworkSecurityManager(config, logger);
    const status = await networkSecurity.getFirewallStatus();
    
    basicHealthService.recordHttpRequest('GET', '/api/network-security/status', 200);
    res.json({
      success: true,
      firewall: status,
      platform: process.platform,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    basicHealthService.recordHttpRequest('GET', '/api/network-security/status', 500);
    loggingService.error('Network security status check failed', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get network security status' 
    });
  }
});



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
  const startTime = Date.now();
  
  try {
    // Create a unique client name based on authenticated user and timestamp
    const clientName = `${req.user.username}_${Date.now()}`;
    const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-client.sh');

    loggingService.logCertificateEvent('GENERATION_STARTED', clientName, req.user.username, req.ip, {
      scriptPath
    });

    basicHealthService.recordHttpRequest('POST', '/api/generate-cert', 200);

    const generate = spawn('bash', [scriptPath, clientName]);

    generate.stdout.on('data', data => {
      loggingService.debug(`Certificate generation STDOUT: ${data}`, {
        clientName,
        username: req.user.username
      });
    });

    generate.stderr.on('data', data => {
      loggingService.error(`Certificate generation STDERR: ${data}`, {
        clientName,
        username: req.user.username
      });
    });

    generate.on('close', async (code) => {
      const duration = (Date.now() - startTime) / 1000;
      
      if (code !== 0) {
        loggingService.logCertificateEvent('GENERATION_FAILED', clientName, req.user.username, req.ip, {
          exitCode: code,
          duration
        });
        
        basicHealthService.recordCertificateOperation('generate', 'failed', req.user.username);
        basicHealthService.recordHttpRequest('POST', '/api/generate-cert', 500);
        

        
        return res.status(500).json({ error: 'Failed to generate certificate' });
      }

      try {
        const certPath = path.join(config.certificates.dir, `${clientName}.ovpn`);
        const certData = await fs.readFile(certPath, 'utf8');
        
        loggingService.logCertificateEvent('GENERATION_SUCCESS', clientName, req.user.username, req.ip, {
          certPath,
          duration,
          certSize: certData.length
        });
        
        basicHealthService.recordCertificateOperation('generate', 'success', req.user.username);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${clientName}.ovpn"`);
        return res.send(certData);
        
      } catch (err) {
        loggingService.logCertificateEvent('GENERATION_READ_FAILED', clientName, req.user.username, req.ip, {
          error: err.message,
          certPath: path.join(config.certificates.dir, `${clientName}.ovpn`),
          duration
        });
        
        basicHealthService.recordCertificateOperation('generate', 'failed', req.user.username);
        basicHealthService.recordHttpRequest('POST', '/api/generate-cert', 500);
        
        return res.status(500).json({ error: 'Certificate read failed' });
      }
    });

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    
    loggingService.logCertificateEvent('GENERATION_ERROR', 'unknown', req.user.username, req.ip, {
      error: error.message,
      duration
    });
    
    basicHealthService.recordCertificateOperation('generate', 'failed', req.user.username);
    basicHealthService.recordHttpRequest('POST', '/api/generate-cert', 500);
    basicHealthService.recordSystemError('CERTIFICATE_GENERATION_ERROR');
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Web interface routes
const webAuthRoutes = new WebAuthRoutes(logger, loggingService, basicHealthService);
const certificateRoutes = new CertificateRoutes(logger, loggingService, basicHealthService, config);

// Mount web routes
app.use('/', webAuthRoutes.getRouter());
app.use('/', certificateRoutes.getRouter());

// Root route - redirect to appropriate page based on authentication
app.get('/', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.redirect('/certificates');
  } else {
    res.redirect('/login');
  }
});

// Error handling middleware for web interface
app.use((err, req, res, next) => {
  logger.error('Web interface error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // For API requests, return JSON error
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } else {
    // For web requests, render error page or redirect
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Family VPN Server</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error-container { max-width: 500px; margin: 0 auto; }
          .error-code { font-size: 72px; color: #dc3545; margin-bottom: 20px; }
          .error-message { font-size: 18px; color: #666; margin-bottom: 30px; }
          .back-link { color: #007bff; text-decoration: none; }
          .back-link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-code">500</div>
          <div class="error-message">Internal Server Error</div>
          <p>Something went wrong. Please try again later.</p>
          <a href="/" class="back-link">← Back to Home</a>
        </div>
      </body>
      </html>
    `);
  }
});

// 404 handler for web interface
app.use((req, res) => {
  // For API requests, return JSON 404
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    res.status(404).json({
      success: false,
      error: 'Not found'
    });
  } else {
    // For web requests, render 404 page
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Page Not Found - Family VPN Server</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error-container { max-width: 500px; margin: 0 auto; }
          .error-code { font-size: 72px; color: #6c757d; margin-bottom: 20px; }
          .error-message { font-size: 18px; color: #666; margin-bottom: 30px; }
          .back-link { color: #007bff; text-decoration: none; }
          .back-link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-code">404</div>
          <div class="error-message">Page Not Found</div>
          <p>The page you're looking for doesn't exist.</p>
          <a href="/" class="back-link">← Back to Home</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  logger.info(`Management server listening on port ${port}`);
  logger.info(`Web interface available at http://localhost:${port}`);
  logger.info(`API endpoints available at http://localhost:${port}/api/*`);
  initializeVPNServer();
});