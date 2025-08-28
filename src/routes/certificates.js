const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const CertificateManager = require('../utils/certificate-manager');
const { 
    requireAuthentication, 
    createCertificateRateLimit,
    createCSRFProtection 
} = require('../middleware/session-middleware');

/**
 * Certificate management routes for web interface
 * Provides secure certificate generation, listing, download, and revocation
 */
class CertificateRoutes {
    constructor(logger, loggingService, basicHealthService, config) {
        this.router = express.Router();
        this.logger = logger;
        this.loggingService = loggingService;
        this.basicHealthService = basicHealthService;
        this.config = config;
        this.certManager = new CertificateManager(logger);
        
        // Certificate metadata storage (in production, use database)
        this.certificateMetadata = new Map();
        
        this.setupRoutes();
    }

    setupRoutes() {
        // Apply authentication to all certificate routes
        this.router.use(requireAuthentication());
        
        // Apply rate limiting for certificate operations
        const certificateRateLimit = createCertificateRateLimit(this.logger);
        const csrfProtection = createCSRFProtection();

        // GET /certificates - Display certificate management page
        this.router.get('/certificates', csrfProtection, async (req, res) => {
            try {
                // For web interface, render the certificates page
                if (!req.xhr && !req.headers.accept?.includes('application/json')) {
                    return res.render('certificates', {
                        csrfToken: res.locals.csrfToken,
                        username: req.session.username
                    });
                }

                // For API requests, return certificate list
                const certificates = await this.listCertificates();
                res.json({
                    success: true,
                    certificates,
                    count: certificates.length
                });

            } catch (error) {
                this.logger.error('Failed to load certificates page', { 
                    error: error.message,
                    username: req.session.username 
                });

                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to load certificates'
                    });
                } else {
                    res.status(500).render('error', {
                        message: 'Failed to load certificates page'
                    });
                }
            }
        });

        // GET /certificates/list - API endpoint for certificate list
        this.router.get('/certificates/list', async (req, res) => {
            try {
                const certificates = await this.listCertificates();
                
                if (this.basicHealthService) {
                    this.basicHealthService.recordHttpRequest('GET', '/certificates/list', 200);
                }

                res.json({
                    success: true,
                    certificates,
                    count: certificates.length,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                this.logger.error('Failed to list certificates', { 
                    error: error.message,
                    username: req.session.username 
                });

                if (this.basicHealthService) {
                    this.basicHealthService.recordHttpRequest('GET', '/certificates/list', 500);
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve certificate list'
                });
            }
        });

        // POST /certificates/generate - Generate new client certificate
        this.router.post('/certificates/generate', certificateRateLimit, csrfProtection, async (req, res) => {
            const startTime = Date.now();
            
            let { clientName } = req.body;
            const username = req.session.username;
            const clientIP = req.ip;

            try {
                // Validate input
                if (!clientName || typeof clientName !== 'string') {
                    return res.status(400).json({
                        success: false,
                        error: 'Client name is required and must be a string'
                    });
                }

                // Sanitize client name
                clientName = this.sanitizeClientName(clientName);
                
                if (!this.isValidClientName(clientName)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid client name. Use only alphanumeric characters, hyphens, and underscores (3-50 characters)'
                    });
                }

                // Check if certificate already exists
                const existingCerts = await this.listCertificates();
                const exists = existingCerts.some(cert => cert.name === clientName);
                
                if (exists) {
                    return res.status(409).json({
                        success: false,
                        error: 'Certificate with this name already exists'
                    });
                }

                // Log certificate generation start
                this.logCertificateEvent('GENERATION_STARTED', clientName, username, clientIP, {
                    requestId: this.generateRequestId()
                });

                // Generate certificate using certificate manager
                await this.certManager.generateClientCertificate(clientName);

                // Store certificate metadata
                const metadata = {
                    name: clientName,
                    createdAt: new Date(),
                    createdBy: username,
                    status: 'active',
                    clientIP: clientIP,
                    serialNumber: await this.getCertificateSerial(clientName),
                    expiresAt: await this.getCertificateExpiry(clientName)
                };

                this.certificateMetadata.set(clientName, metadata);

                const duration = (Date.now() - startTime) / 1000;

                // Log successful generation
                this.logCertificateEvent('GENERATION_SUCCESS', clientName, username, clientIP, {
                    duration,
                    serialNumber: metadata.serialNumber
                });

                if (this.basicHealthService) {
                    this.basicHealthService.recordCertificateOperation('generate', 'success', username);
                    this.basicHealthService.recordHttpRequest('POST', '/certificates/generate', 201);
                }

                res.status(201).json({
                    success: true,
                    message: 'Certificate generated successfully',
                    certificate: {
                        name: clientName,
                        createdAt: metadata.createdAt,
                        status: metadata.status,
                        downloadUrl: `/certificates/download/${clientName}`
                    }
                });

            } catch (error) {
                const duration = (Date.now() - startTime) / 1000;

                this.logCertificateEvent('GENERATION_FAILED', clientName || 'unknown', username, clientIP, {
                    error: error.message,
                    duration
                });

                this.logger.error('Certificate generation failed', {
                    error: error.message,
                    clientName,
                    username,
                    clientIP
                });

                if (this.basicHealthService) {
                    this.basicHealthService.recordCertificateOperation('generate', 'failed', username);
                    this.basicHealthService.recordHttpRequest('POST', '/certificates/generate', 500);
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to generate certificate'
                });
            }
        });

        // GET /certificates/download/:name - Download certificate file
        this.router.get('/certificates/download/:name', async (req, res) => {
            const { name } = req.params;
            const username = req.session.username;
            const clientIP = req.ip;

            try {
                // Validate certificate name
                if (!this.isValidClientName(name)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid certificate name'
                    });
                }

                // Check if certificate exists
                const certPath = path.join(this.config.certificates.dir, `${name}.ovpn`);
                
                try {
                    await fs.access(certPath);
                } catch (error) {
                    this.logger.warn('Certificate download attempted for non-existent certificate', {
                        name,
                        username,
                        clientIP
                    });

                    return res.status(404).json({
                        success: false,
                        error: 'Certificate not found'
                    });
                }

                // Read certificate file
                const certData = await fs.readFile(certPath, 'utf8');

                // Log download event
                this.logCertificateEvent('DOWNLOAD', name, username, clientIP, {
                    fileSize: certData.length
                });

                if (this.basicHealthService) {
                    this.basicHealthService.recordCertificateOperation('download', 'success', username);
                    this.basicHealthService.recordHttpRequest('GET', `/certificates/download/${name}`, 200);
                }

                // Set appropriate headers for file download
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${name}.ovpn"`);
                res.setHeader('Content-Length', Buffer.byteLength(certData, 'utf8'));

                res.send(certData);

            } catch (error) {
                this.logger.error('Certificate download failed', {
                    error: error.message,
                    name,
                    username,
                    clientIP
                });

                if (this.basicHealthService) {
                    this.basicHealthService.recordCertificateOperation('download', 'failed', username);
                    this.basicHealthService.recordHttpRequest('GET', `/certificates/download/${name}`, 500);
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to download certificate'
                });
            }
        });

        // POST /certificates/revoke/:name - Revoke certificate
        this.router.post('/certificates/revoke/:name', csrfProtection, async (req, res) => {
            const { name } = req.params;
            const username = req.session.username;
            const clientIP = req.ip;
            
            try {
                // Validate certificate name
                if (!this.isValidClientName(name)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid certificate name'
                    });
                }

                // Check if certificate exists and is not already revoked
                const metadata = this.certificateMetadata.get(name);
                if (!metadata) {
                    return res.status(404).json({
                        success: false,
                        error: 'Certificate not found'
                    });
                }

                if (metadata.status === 'revoked') {
                    return res.status(409).json({
                        success: false,
                        error: 'Certificate is already revoked'
                    });
                }

                // Revoke certificate using Easy-RSA
                await this.revokeCertificate(name);

                // Update metadata
                metadata.status = 'revoked';
                metadata.revokedAt = new Date();
                metadata.revokedBy = username;
                this.certificateMetadata.set(name, metadata);

                // Log revocation event
                this.logCertificateEvent('REVOCATION_SUCCESS', name, username, clientIP, {
                    serialNumber: metadata.serialNumber
                });

                if (this.basicHealthService) {
                    this.basicHealthService.recordCertificateOperation('revoke', 'success', username);
                    this.basicHealthService.recordHttpRequest('POST', `/certificates/revoke/${name}`, 200);
                }

                res.json({
                    success: true,
                    message: 'Certificate revoked successfully',
                    certificate: {
                        name,
                        status: 'revoked',
                        revokedAt: metadata.revokedAt,
                        revokedBy: username
                    }
                });

            } catch (error) {
                this.logCertificateEvent('REVOCATION_FAILED', name, username, clientIP, {
                    error: error.message
                });

                this.logger.error('Certificate revocation failed', {
                    error: error.message,
                    name,
                    username,
                    clientIP
                });

                if (this.basicHealthService) {
                    this.basicHealthService.recordCertificateOperation('revoke', 'failed', username);
                    this.basicHealthService.recordHttpRequest('POST', `/certificates/revoke/${name}`, 500);
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to revoke certificate'
                });
            }
        });
    }

    /**
     * List all certificates with their status
     */
    async listCertificates() {
        try {
            const certificates = [];
            const certDir = this.config.certificates.dir;

            // Read certificate directory
            const files = await fs.readdir(certDir);
            const ovpnFiles = files.filter(file => file.endsWith('.ovpn'));

            for (const file of ovpnFiles) {
                const name = path.basename(file, '.ovpn');
                
                // Skip server certificates
                if (name === 'server' || name === this.config.certificates.serverCertName) {
                    continue;
                }

                const filePath = path.join(certDir, file);
                const stats = await fs.stat(filePath);
                
                // Get metadata if available
                let metadata = this.certificateMetadata.get(name);
                
                // If no metadata exists, create basic metadata from file
                if (!metadata) {
                    metadata = {
                        name,
                        createdAt: stats.birthtime || stats.mtime,
                        status: 'active',
                        serialNumber: await this.getCertificateSerial(name).catch(() => 'unknown'),
                        expiresAt: await this.getCertificateExpiry(name).catch(() => null)
                    };
                    this.certificateMetadata.set(name, metadata);
                }

                certificates.push({
                    name: metadata.name,
                    createdAt: metadata.createdAt,
                    createdBy: metadata.createdBy || 'unknown',
                    status: metadata.status,
                    serialNumber: metadata.serialNumber,
                    expiresAt: metadata.expiresAt,
                    revokedAt: metadata.revokedAt,
                    revokedBy: metadata.revokedBy,
                    fileSize: stats.size,
                    lastModified: stats.mtime
                });
            }

            // Sort by creation date (newest first)
            certificates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return certificates;

        } catch (error) {
            this.logger.error('Failed to list certificates', { error: error.message });
            throw new Error('Failed to retrieve certificate list');
        }
    }

    /**
     * Revoke a certificate using Easy-RSA
     */
    async revokeCertificate(clientName) {
        try {
            // Wait for certificate manager initialization
            await this.certManager.initPromise;

            const easyrsaPath = this.certManager.easyrsaPath;
            const platform = require('os').platform();

            let command;
            if (platform === 'win32') {
                command = `cd /d "${easyrsaPath}" && easyrsa revoke ${clientName}`;
            } else {
                command = `cd "${easyrsaPath}" && echo yes | ./easyrsa revoke ${clientName}`;
            }

            this.logger.info(`Revoking certificate: ${clientName}`);
            const { stdout, stderr } = await exec(command);
            
            if (stdout) this.logger.info(`Revoke output: ${stdout}`);
            if (stderr) this.logger.warn(`Revoke stderr: ${stderr}`);

            // Generate updated CRL
            let crlCommand;
            if (platform === 'win32') {
                crlCommand = `cd /d "${easyrsaPath}" && easyrsa gen-crl`;
            } else {
                crlCommand = `cd "${easyrsaPath}" && ./easyrsa gen-crl`;
            }

            this.logger.info('Generating updated CRL');
            const crlResult = await exec(crlCommand);
            
            if (crlResult.stdout) this.logger.info(`CRL gen output: ${crlResult.stdout}`);
            if (crlResult.stderr) this.logger.warn(`CRL gen stderr: ${crlResult.stderr}`);

            // Copy updated CRL to certificates directory
            const crlSource = path.join(easyrsaPath, 'pki', 'crl.pem');
            const crlDest = path.join(this.config.certificates.dir, 'crl.pem');
            
            try {
                await fs.copyFile(crlSource, crlDest);
                this.logger.info('Updated CRL copied to certificates directory');
            } catch (copyError) {
                this.logger.warn('Failed to copy CRL file', { error: copyError.message });
            }

        } catch (error) {
            this.logger.error('Certificate revocation failed', { 
                error: error.message,
                clientName 
            });
            throw new Error(`Failed to revoke certificate: ${error.message}`);
        }
    }

    /**
     * Get certificate serial number
     */
    async getCertificateSerial(clientName) {
        try {
            const certPath = path.join(this.config.certificates.dir, `${clientName}.crt`);
            
            try {
                await fs.access(certPath);
            } catch (error) {
                // Certificate file doesn't exist in certificates dir, try PKI dir
                const pkiCertPath = path.join(this.certManager.easyrsaPath, 'pki', 'issued', `${clientName}.crt`);
                try {
                    await fs.access(pkiCertPath);
                    const { stdout } = await exec(`openssl x509 -in "${pkiCertPath}" -noout -serial`);
                    return stdout.trim().replace('serial=', '');
                } catch (pkiError) {
                    return 'unknown';
                }
            }

            const { stdout } = await exec(`openssl x509 -in "${certPath}" -noout -serial`);
            return stdout.trim().replace('serial=', '');

        } catch (error) {
            this.logger.warn('Failed to get certificate serial', { 
                error: error.message,
                clientName 
            });
            return 'unknown';
        }
    }

    /**
     * Get certificate expiry date
     */
    async getCertificateExpiry(clientName) {
        try {
            const certPath = path.join(this.config.certificates.dir, `${clientName}.crt`);
            
            try {
                await fs.access(certPath);
            } catch (error) {
                // Certificate file doesn't exist in certificates dir, try PKI dir
                const pkiCertPath = path.join(this.certManager.easyrsaPath, 'pki', 'issued', `${clientName}.crt`);
                try {
                    await fs.access(pkiCertPath);
                    const { stdout } = await exec(`openssl x509 -in "${pkiCertPath}" -noout -enddate`);
                    const dateStr = stdout.trim().replace('notAfter=', '');
                    return new Date(dateStr);
                } catch (pkiError) {
                    return null;
                }
            }

            const { stdout } = await exec(`openssl x509 -in "${certPath}" -noout -enddate`);
            const dateStr = stdout.trim().replace('notAfter=', '');
            return new Date(dateStr);

        } catch (error) {
            this.logger.warn('Failed to get certificate expiry', { 
                error: error.message,
                clientName 
            });
            return null;
        }
    }

    /**
     * Validate client name format
     */
    isValidClientName(name) {
        if (!name || typeof name !== 'string') {
            return false;
        }

        // Allow alphanumeric characters, hyphens, and underscores
        // Length between 3 and 50 characters
        const nameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        return nameRegex.test(name);
    }

    /**
     * Sanitize client name
     */
    sanitizeClientName(name) {
        if (!name || typeof name !== 'string') {
            return '';
        }

        // Remove any characters that aren't alphanumeric, hyphens, or underscores
        return name.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
    }

    /**
     * Generate unique request ID for tracking
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Log certificate events
     */
    logCertificateEvent(event, clientName, username, clientIP, details = {}) {
        const logData = {
            event,
            clientName,
            username,
            clientIP,
            timestamp: new Date().toISOString(),
            ...details
        };

        if (this.loggingService && this.loggingService.logCertificateEvent) {
            this.loggingService.logCertificateEvent(event, clientName, username, clientIP, details);
        } else {
            // Fallback to regular logger
            this.logger.info(`Certificate ${event}`, logData);
        }
    }

    /**
     * Get router instance
     */
    getRouter() {
        return this.router;
    }
}

module.exports = CertificateRoutes;