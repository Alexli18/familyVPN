const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const mkdirp = require('mkdirp');
const config = require('../config');

class SimplifiedCertificateManager {
    constructor(logger, loggingService) {
        this.logger = logger || console;
        this.loggingService = loggingService;
        this.logger.info('Initializing SimplifiedCertificateManager...');
        this.logger.info(`Certificates directory: ${config.certificates.dir}`);
        
        // Make sure directories exist
        mkdirp.sync(config.certificates.dir);
        this.logger.info('Ensured certificates directory exists');
        
        this.pkiPath = path.join(config.certificates.dir, 'pki');
        this.crlPath = path.join(config.certificates.dir, 'crl');
        this.platform = os.platform();
        this.logger.info(`Platform detected: ${this.platform}`);
        
        // Default to the project's easy-rsa directory
        this.easyrsaPath = path.join(process.cwd(), 'easy-rsa');
        
        // Initialize CRL directory
        this.initializeCRLDirectory();
    }

    async initializeCRLDirectory() {
        try {
            // Create CRL directory with proper permissions
            await mkdirp(this.crlPath);
            
            // Set secure permissions (700 - owner only)
            if (this.platform !== 'win32') {
                await exec(`chmod 700 "${this.crlPath}"`);
            }
        } catch (error) {
            this.logger.error('Error initializing CRL directory:', error);
            throw error;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async findEasyRsaPath() {
        this.logger.info('Searching for Easy-RSA installation...');
        
        // Paths to check based on operating system
        let pathsToCheck = [];
        
        if (this.platform === 'darwin') {  // macOS
            pathsToCheck = [
                '/usr/local/share/easy-rsa',    // Intel Macs with Homebrew
                '/opt/homebrew/share/easy-rsa', // Apple Silicon (M1/M2) Macs with Homebrew
                '/usr/local/etc/easy-rsa',      // Alternate Homebrew location
                path.join(os.homedir(), 'easy-rsa')
            ];
        } else if (this.platform === 'linux') {  // Linux
            pathsToCheck = [
                '/usr/share/easy-rsa',          // Debian/Ubuntu default
                '/usr/local/share/easy-rsa',    // Common alternate location
                '/etc/easy-rsa',                // Some distros
                '/usr/local/etc/easy-rsa',      // Optional location
                path.join(os.homedir(), 'easy-rsa')
            ];
        } else if (this.platform === 'win32') {  // Windows
            pathsToCheck = [
                'C:\\Program Files\\OpenVPN\\easy-rsa',
                'C:\\Program Files (x86)\\OpenVPN\\easy-rsa',
                path.join(os.homedir(), 'easy-rsa')
            ];
        }
        
        // Add the project directory path
        pathsToCheck.push(path.join(process.cwd(), 'easy-rsa'));
        
        // Check if any of the paths exist
        for (const checkPath of pathsToCheck) {
            try {
                await fs.access(checkPath);
                
                // Check if the easyrsa script is actually there
                const easyrsaScript = this.platform === 'win32' 
                    ? path.join(checkPath, 'easyrsa.bat') 
                    : path.join(checkPath, 'easyrsa');
                
                try {
                    await fs.access(easyrsaScript);
                    this.logger.info(`Found easyrsa script at: ${easyrsaScript}`);
                    this.easyrsaPath = checkPath;
                    return checkPath;
                } catch (err) {
                    this.logger.info(`Found directory ${checkPath} but easyrsa script not found`);
                }
            } catch (error) {
                // Path doesn't exist, continue
            }
        }
        
        // If we couldn't find easy-rsa, download it
        this.logger.info('Easy-RSA not found in standard locations, will download it');
        return await this.downloadEasyRsa(this.easyrsaPath);
    }

    async downloadEasyRsa(targetPath) {
        this.logger.info(`Downloading Easy-RSA to ${targetPath}...`);
        
        try {
            // Create the directory if it doesn't exist
            await mkdirp(targetPath);
            
            if (this.platform === 'win32') {  // Windows
                // Windows download logic (omitted for brevity)
            } else {  // macOS and Linux
                // Download and extract Easy-RSA
                const commands = [
                    `curl -L https://github.com/OpenVPN/easy-rsa/releases/download/v3.1.0/EasyRSA-3.1.0.tgz -o /tmp/easyrsa.tgz`,
                    `tar -xzf /tmp/easyrsa.tgz -C /tmp`,
                    `mkdir -p ${targetPath}`,
                    `cp -R /tmp/EasyRSA-3.1.0/* ${targetPath}/`,
                    `chmod +x ${path.join(targetPath, 'easyrsa')}`,
                    `rm -f /tmp/easyrsa.tgz`
                ];
                
                for (const cmd of commands) {
                    await exec(cmd);
                }
            }
            
            this.easyrsaPath = targetPath;
            this.logger.info('Easy-RSA downloaded and set up successfully.');
            return targetPath;
        } catch (error) {
            this.logger.error(`Failed to download Easy-RSA: ${error.message}`);
            throw new Error(`Failed to download and set up Easy-RSA: ${error.message}`);
        }
    }

    async initializePKI() {
        try {
            // If we don't have a path yet, find it
            if (!this.easyrsaPath) {
                this.easyrsaPath = await this.findEasyRsaPath();
            }

            this.logger.info(`Using Easy-RSA path: ${this.easyrsaPath}`);

            // Ensure certificates directory exists
            await mkdirp(config.certificates.dir);

            // Check if PKI already exists
            const pkiDir = path.join(this.easyrsaPath, 'pki');
            let pkiExists = false;

            try {
                await fs.access(pkiDir);
                this.logger.info(`PKI directory already exists at: ${pkiDir}`);
                pkiExists = true;
            } catch (err) {
                this.logger.info(`PKI directory does not exist, will initialize: ${pkiDir}`);
            }

            // Log PKI initialization attempt
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'PKI_INITIALIZATION_ATTEMPT',
                    'system',
                    'system',
                    'localhost',
                    { pkiExists, pkiDir }
                );
            }

            // Self-healing block: recreate PKI if essential config is missing
            if (pkiExists) {
                const cnfFile = path.join(pkiDir, 'openssl-easyrsa.cnf');
                try {
                    await fs.access(cnfFile);
                } catch (err) {
                    this.logger.warn('PKI exists but openssl-easyrsa.cnf is missing – rebuilding PKI...');
                    await exec(`find "${pkiDir}" -mindepth 1 -delete`);
                    // Re-initialize PKI non-interactively (auto-answer "yes")
                    const initCmd = this.platform === 'win32'
                        ? `cd /d "${this.easyrsaPath}" && echo yes | easyrsa init-pki`
                        : `cd "${this.easyrsaPath}" && echo yes | EASYRSA_BATCH=1 ./easyrsa init-pki`;
                    const initRes = await exec(initCmd);
                    if (initRes.stdout) this.logger.info(`Self-heal init-pki output: ${initRes.stdout}`);
                    if (initRes.stderr) this.logger.warn(`Self-heal init-pki stderr: ${initRes.stderr}`);
                    // PKI is now freshly re-initialized
                    pkiExists = true;
                }
            }

            // Even if PKI exists, we'll check if it has a complete CA setup
            if (pkiExists) {
                try {
                    const serialFile = path.join(pkiDir, 'serial');
                    await fs.access(serialFile);
                    this.logger.info('PKI appears to be properly initialized with CA');

                    // Check for DH params too
                    const dhFile = path.join(pkiDir, 'dh.pem');
                    try {
                        await fs.access(dhFile);
                        this.logger.info('DH parameters already exist');
                        
                        // Log successful PKI validation
                        if (this.loggingService) {
                            this.loggingService.logCertificateEvent(
                                'PKI_VALIDATION_SUCCESS',
                                'system',
                                'system',
                                'localhost',
                                { pkiDir, dhFile, serialFile }
                            );
                        }
                        
                        return true; // PKI is fully initialized
                    } catch (err) {
                        this.logger.info('DH parameters missing, will generate them');
                    }
                } catch (err) {
                    this.logger.info('PKI directory exists but CA is not initialized, will rebuild');
                }
            }

            // Command to execute based on platform
            let command;

            // If PKI doesn't exist, initialize it first
            if (!pkiExists) {
                if (this.platform === 'win32') {  // Windows
                    command = `
                        cd /d "${this.easyrsaPath}" &&
                        easyrsa init-pki
                    `;
                } else {  // macOS and Linux
                    command = `
                        cd "${this.easyrsaPath}" &&
                        ./easyrsa init-pki
                    `;
                }

                // Execute the command
                this.logger.info('Initializing PKI...');
                const { stdout, stderr } = await exec(command);
                if (stdout) this.logger.info(`PKI init output: ${stdout}`);
                if (stderr) this.logger.warn(`PKI init stderr: ${stderr}`);

                // After PKI init, check if ca.crt exists, build CA if missing
                // Check if CA cert exists
                const caFile = path.join(pkiDir, 'ca.crt');
                try {
                    await fs.access(caFile);
                    this.logger.info('CA certificate already exists, skipping build-ca');
                } catch (err) {
                    this.logger.info('CA certificate not found, running build-ca...');

                    if (this.platform === 'win32') {
                        command = `
                            cd /d "${this.easyrsaPath}" &&
                            easyrsa build-ca nopass
                        `;
                    } else {
                        command = `
                            cd "${this.easyrsaPath}" &&
                            EASYRSA_BATCH=1 ./easyrsa build-ca nopass
                        `;
                    }

                    const caResult = await exec(command);
                    if (caResult.stdout) this.logger.info(`CA build output: ${caResult.stdout}`);
                    if (caResult.stderr) this.logger.warn(`CA build stderr: ${caResult.stderr}`);
                    
                    // Log CA creation
                    if (this.loggingService) {
                        this.loggingService.logCertificateEvent(
                            'CA_CERTIFICATE_CREATED', 'ca', 'system', 'localhost', { caFile });
                    }
                }
            } else {
                this.logger.info('Skipping init-pki as directory already exists');
                // If PKI exists, still check if ca.crt is missing and build if needed
                const caFile = path.join(pkiDir, 'ca.crt');
                try {
                    await fs.access(caFile);
                    this.logger.info('CA certificate already exists, skipping build-ca');
                } catch (err) {
                    this.logger.info('CA certificate not found, running build-ca...');
                    if (this.platform === 'win32') {
                        command = `
                            cd /d "${this.easyrsaPath}" &&
                            easyrsa build-ca nopass
                        `;
                    } else {
                        command = `
                            cd "${this.easyrsaPath}" &&
                            EASYRSA_BATCH=1 ./easyrsa build-ca nopass
                        `;
                    }
                    const caResult = await exec(command);
                    if (caResult.stdout) this.logger.info(`CA build output: ${caResult.stdout}`);
                    if (caResult.stderr) this.logger.warn(`CA build stderr: ${caResult.stderr}`);
                    
                    // Log CA creation
                    if (this.loggingService) {
                        this.loggingService.logCertificateEvent(
                            'CA_CERTIFICATE_CREATED', 'ca', 'system', 'localhost', { caFile });
                    }
                }
            }

            // Generate DH parameters
            if (this.platform === 'win32') {  // Windows
                command = `
                    cd /d "${this.easyrsaPath}" &&
                    easyrsa gen-dh
                `;
            } else {  // macOS and Linux
                command = `
                    cd "${this.easyrsaPath}" &&
                    ./easyrsa gen-dh
                `;
            }

            this.logger.info('Generating DH parameters (this may take a while)...');
            const dhResult = await exec(command);
            if (dhResult.stdout) this.logger.info(`DH gen output: ${dhResult.stdout}`);
            if (dhResult.stderr) this.logger.warn(`DH gen stderr: ${dhResult.stderr}`);

            // Log successful PKI initialization
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'PKI_INITIALIZATION_SUCCESS', 'system', 'system', 'localhost', { pkiDir });
            }

            this.logger.info('PKI initialized successfully');
            return true;
        } catch (error) {
            this.logger.error(`Error initializing PKI: ${error.message}`);
            if (error.stdout) this.logger.info(`Command stdout: ${error.stdout}`);
            if (error.stderr) this.logger.error(`Command stderr: ${error.stderr}`);
            
            // Log PKI initialization failure
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'PKI_INITIALIZATION_FAILURE', 'system', 'system', 'localhost', { error: error.message });
            }
            
            throw new Error(`Failed to initialize PKI: ${error.message}`);
        }
    }

    async generateServerCertificates() {
        try {
            // If we don't have a path yet, find it
            if (!this.easyrsaPath) {
                this.easyrsaPath = await this.findEasyRsaPath();
            }
            
            this.logger.info(`Using Easy-RSA path for server certs: ${this.easyrsaPath}`);
            
            // Log server certificate generation attempt
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'SERVER_CERTIFICATE_GENERATION_ATTEMPT',
                    config.certificates.serverCertName,
                    'system',
                    'localhost',
                    {}
                );
            }
            
            // Check if the server certificate request already exists
            const reqFile = path.join(this.easyrsaPath, 'pki', 'reqs', `${config.certificates.serverCertName}.req`);
            try {
                await fs.access(reqFile);
                this.logger.info(`Server request file already exists: ${reqFile}`);
                
                // Check if the certificate already exists as well
                const certFile = path.join(this.easyrsaPath, 'pki', 'issued', `${config.certificates.serverCertName}.crt`);
                try {
                    await fs.access(certFile);
                    this.logger.info(`Server certificate already exists: ${certFile}`);
                    
                    // Certificate already exists, we can skip generation
                    this.logger.info('Using existing server certificate');
                    
                    // Copy the certificates to the certificates directory
                    await this.copyCertificates(config.certificates.serverCertName);
                    
                    // Log successful validation
                    if (this.loggingService) {
                        this.loggingService.logCertificateEvent(
                            'SERVER_CERTIFICATE_VALIDATION_SUCCESS',
                            config.certificates.serverCertName,
                            'system',
                            'localhost',
                            { certFile }
                        );
                    }
                    
                    return true;
                } catch (err) {
                    // Certificate doesn't exist but request does, sign the existing request
                    this.logger.info('Request exists but certificate does not, signing the request...');
                    
                    let command;
                    if (this.platform === 'win32') {  // Windows
                        command = `
                            cd /d "${this.easyrsaPath}" &&
                            easyrsa sign-req server ${config.certificates.serverCertName}
                        `;
                    } else {  // macOS and Linux
                        command = `
                            cd "${this.easyrsaPath}" &&
                            ./easyrsa --batch sign-req server ${config.certificates.serverCertName}
                        `;
                    }
                    
                    this.logger.info(`Signing server certificate for: ${config.certificates.serverCertName}`);
                    const { stdout, stderr } = await exec(command);
                    if (stdout) this.logger.info(`Server cert signing output: ${stdout}`);
                    if (stderr) this.logger.warn(`Server cert signing stderr: ${stderr}`);
                    
                    // Log certificate signing
                    if (this.loggingService) {
                        this.loggingService.logCertificateEvent(
                            'SERVER_CERTIFICATE_SIGNED',
                            config.certificates.serverCertName,
                            'system',
                            'localhost',
                            {}
                        );
                    }
                }
            } catch (err) {
                // Request doesn't exist, generate a new certificate
                this.logger.info('No existing request found, generating new server certificate...');
                
                let command;
                if (this.platform === 'win32') {  // Windows
                    command = `
                        cd /d "${this.easyrsaPath}" &&
                        easyrsa build-server-full ${config.certificates.serverCertName} nopass
                    `;
                } else {  // macOS and Linux
                    command = `
                        cd "${this.easyrsaPath}" &&
                        ./easyrsa --batch build-server-full ${config.certificates.serverCertName} nopass
                    `;
                }
                
                this.logger.info(`Generating server certificate for: ${config.certificates.serverCertName}`);
                const { stdout, stderr } = await exec(command);
                if (stdout) this.logger.info(`Server cert output: ${stdout}`);
                if (stderr) this.logger.warn(`Server cert stderr: ${stderr}`);
                
                // Log certificate generation
                if (this.loggingService) {
                    this.loggingService.logCertificateEvent(
                        'SERVER_CERTIFICATE_GENERATED',
                        config.certificates.serverCertName,
                        'system',
                        'localhost',
                        {}
                    );
                }
            }
            
            // Copy the certificates to the certificates directory with secure permissions
            await this.copyCertificates(config.certificates.serverCertName);
            
            this.logger.info('Server certificates generated successfully');
            return true;
        } catch (error) {
            this.logger.error(`Error generating server certificates: ${error.message}`);
            if (error.stdout) this.logger.info(`Command stdout: ${error.stdout}`);
            if (error.stderr) this.logger.error(`Command stderr: ${error.stderr}`);
            
            // Log certificate generation failure
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'SERVER_CERTIFICATE_GENERATION_FAILURE',
                    config.certificates.serverCertName,
                    'system',
                    'localhost',
                    { error: error.message }
                );
            }
            
            throw new Error(`Failed to generate server certificates: ${error.message}`);
        }
    }

    async copyCertificates(name) {
        try {
            // Source paths in the pki directory
            const sourcePaths = {
                ca: path.join(this.easyrsaPath, 'pki', 'ca.crt'),
                cert: path.join(this.easyrsaPath, 'pki', 'issued', `${name}.crt`),
                key: path.join(this.easyrsaPath, 'pki', 'private', `${name}.key`),
                dh: path.join(this.easyrsaPath, 'pki', 'dh.pem')
            };
            
            // Destination paths in the certificates directory
            const destPaths = {
                ca: path.join(config.certificates.dir, 'ca.crt'),
                cert: path.join(config.certificates.dir, `${name}.crt`),
                key: path.join(config.certificates.dir, `${name}.key`),
                dh: path.join(config.certificates.dir, 'dh.pem')
            };
            
            // Copy each file with secure permissions
            for (const [type, srcPath] of Object.entries(sourcePaths)) {
                try {
                    await fs.access(srcPath);
                    await fs.copyFile(srcPath, destPaths[type]);
                    
                    // Set secure permissions based on file type
                    if (this.platform !== 'win32') {
                        if (type === 'key') {
                            // Private keys should be readable only by owner
                            await exec(`chmod 600 "${destPaths[type]}"`);
                        } else {
                            // Certificates can be readable by group
                            await exec(`chmod 644 "${destPaths[type]}"`);
                        }
                    }
                    
                    this.logger.info(`Copied ${type} certificate to: ${destPaths[type]}`);
                    
                    // Log certificate copy operation
                    if (this.loggingService) {
                        this.loggingService.logCertificateEvent(
                            'CERTIFICATE_COPY_SUCCESS',
                            name,
                            'system',
                            'localhost',
                            { 
                                type, 
                                srcPath, 
                                destPath: destPaths[type]
                            }
                        );
                    }
                } catch (err) {
                    this.logger.warn(`Could not copy ${type} certificate: ${err.message}`);
                    
                    // Log certificate copy failure
                    if (this.loggingService) {
                        this.loggingService.logCertificateEvent(
                            'CERTIFICATE_COPY_FAILURE',
                            name,
                            'system',
                            'localhost',
                            { type, srcPath, error: err.message }
                        );
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error copying certificates: ${error.message}`);
            throw new Error(`Failed to copy certificates: ${error.message}`);
        }
    }
    
    async generateClientCertificate(clientName, username = 'system', clientIP = 'localhost') {
        try {
            // If we don't have a path yet, find it
            if (!this.easyrsaPath) {
                this.easyrsaPath = await this.findEasyRsaPath();
            }
            
            this.logger.info(`Using Easy-RSA path for client cert: ${this.easyrsaPath}`);
            
            // Log client certificate generation attempt
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'CLIENT_CERTIFICATE_GENERATION_ATTEMPT',
                    clientName,
                    username,
                    clientIP,
                    {}
                );
            }
            
            // Check if certificate already exists
            const certFile = path.join(this.easyrsaPath, 'pki', 'issued', `${clientName}.crt`);
            try {
                await fs.access(certFile);
                this.logger.info(`Client certificate already exists: ${certFile}`);
                
                // Copy the existing certificates
                await this.copyCertificates(clientName);
                
                // Generate client configuration
                await this.generateClientConfig(clientName);
                
                // Log successful validation
                if (this.loggingService) {
                    this.loggingService.logCertificateEvent(
                        'CLIENT_CERTIFICATE_VALIDATION_SUCCESS',
                        clientName,
                        username,
                        clientIP,
                        { certFile }
                    );
                }
                
                this.logger.info(`Using existing client certificate for ${clientName}`);
                return true;
            } catch (err) {
                // Certificate doesn't exist, generate a new one
                this.logger.info(`No existing certificate found, generating new client certificate for: ${clientName}`);
            }
            
            let command;
            if (this.platform === 'win32') {  // Windows
                command = `
                    cd /d "${this.easyrsaPath}" &&
                    easyrsa build-client-full ${clientName} nopass
                `;
            } else {  // macOS and Linux
                command = `
                    cd "${this.easyrsaPath}" &&
                    ./easyrsa --batch build-client-full ${clientName} nopass
                `;
            }
            
            this.logger.info(`Generating client certificate for: ${clientName}`);
            const { stdout, stderr } = await exec(command);
            if (stdout) this.logger.info(`Client cert output: ${stdout}`);
            if (stderr) this.logger.warn(`Client cert stderr: ${stderr}`);
            
            // Copy the client certificates with secure permissions
            await this.copyCertificates(clientName);
            
            // Generate client configuration
            await this.generateClientConfig(clientName);
            
            // Log successful client certificate generation
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'CLIENT_CERTIFICATE_GENERATED',
                    clientName,
                    username,
                    clientIP,
                    {}
                );
            }
            
            this.logger.info(`Client certificate for ${clientName} generated successfully`);
            return true;
        } catch (error) {
            this.logger.error(`Error generating client certificate: ${error.message}`);
            if (error.stdout) this.logger.info(`Command stdout: ${error.stdout}`);
            if (error.stderr) this.logger.error(`Command stderr: ${error.stderr}`);
            
            // Log client certificate generation failure
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'CLIENT_CERTIFICATE_GENERATION_FAILURE',
                    clientName,
                    username,
                    clientIP,
                    { error: error.message }
                );
            }
            
            throw new Error(`Failed to generate client certificate: ${error.message}`);
        }
    }

    async generateClientConfig(clientName) {
        const newLine = this.platform === 'win32' ? '\r\n' : '\n';

        try {
            // read & trim to pure PEM (strip any bag attributes or comments)
            const readPem = async (file) => {
                const raw = await fs.readFile(file, 'utf8');
                const match = raw.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
                return match ? match.join('\n').trim() : raw.trim();
            };

            const ca = await readPem(path.join(config.certificates.dir, 'ca.crt'));
            const cert = await readPem(path.join(config.certificates.dir, `${clientName}.crt`));
            const key = await fs.readFile(path.join(config.certificates.dir, `${clientName}.key`), 'utf8');
            
            // Read TLS auth key for hardened security (if it exists)
            let tlsAuth = '';
            const taKeyPath = path.join(config.certificates.dir, 'ta.key');
            try {
                const taKey = await fs.readFile(taKeyPath, 'utf8');
                tlsAuth = `
tls-auth [inline] 1
<tls-auth>
${taKey.trim()}
</tls-auth>`;
            } catch (err) {
                // TLS auth key doesn't exist, skip it
                this.logger.info('TLS auth key not found, generating client config without it');
            }

            const clientConfig =
`client
dev tun
proto ${config.vpn.protocol}
remote ${config.vpn.host} ${config.vpn.port}
resolv-retry infinite
nobind
persist-key
persist-tun
compress lz4
verb 3${tlsAuth}
<ca>
${ca}
</ca>
<cert>
${cert}
</cert>
<key>
${key.trim()}
</key>`.replace(/\n/g, newLine);

            const outputPath = path.join(config.certificates.dir, `${clientName}.ovpn`);
            await fs.writeFile(outputPath, clientConfig);
            
            // Set secure permissions for the client config file
            if (this.platform !== 'win32') {
                await exec(`chmod 600 "${outputPath}"`);
            }
            
            this.logger.info(`Generated inline client config at: ${outputPath}`);
        } catch (error) {
            this.logger.error(`Error generating client config: ${error.message}`);
            throw new Error(`Failed to generate client config: ${error.message}`);
        }
    }

    // Generate CRL (Certificate Revocation List) - kept as it's simple and useful for families
    async generateCRL() {
        try {
            if (!this.easyrsaPath) {
                this.easyrsaPath = await this.findEasyRsaPath();
            }

            this.logger.info('Generating Certificate Revocation List (CRL)...');

            let command;
            if (this.platform === 'win32') {
                command = `cd /d "${this.easyrsaPath}" && easyrsa gen-crl`;
            } else {
                command = `cd "${this.easyrsaPath}" && ./easyrsa gen-crl`;
            }

            const { stdout, stderr } = await exec(command);
            if (stdout) this.logger.info(`CRL generation output: ${stdout}`);
            if (stderr) this.logger.warn(`CRL generation stderr: ${stderr}`);

            // Copy CRL to certificates directory
            const sourceCRL = path.join(this.easyrsaPath, 'pki', 'crl.pem');
            const destCRL = path.join(config.certificates.dir, 'crl.pem');

            try {
                await fs.copyFile(sourceCRL, destCRL);
                
                // Set secure permissions
                if (this.platform !== 'win32') {
                    await exec(`chmod 644 "${destCRL}"`);
                }

                this.logger.info(`CRL copied to: ${destCRL}`);
            } catch (err) {
                this.logger.warn(`Could not copy CRL: ${err.message}`);
            }

            // Log CRL generation
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'CRL_GENERATED', 'crl', 'system', 'localhost', { crlPath: destCRL });
            }

            this.logger.info('CRL generated successfully');
            return destCRL;
        } catch (error) {
            this.logger.error(`Error generating CRL: ${error.message}`);
            
            // Log CRL generation failure
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'CRL_GENERATION_FAILURE', 'crl', 'system', 'localhost', { error: error.message });
            }
            
            throw new Error(`Failed to generate CRL: ${error.message}`);
        }
    }

    // Simple certificate validation (without complex integrity checking)
    async validateCertificate(certPath) {
        try {
            // Check if certificate file exists
            await fs.access(certPath);

            // Use OpenSSL to validate certificate
            const { stdout, stderr } = await exec(`openssl x509 -in "${certPath}" -text -noout`);
            
            if (stderr && stderr.includes('unable to load certificate')) {
                this.logger.warn(`Certificate validation failed: ${certPath}`);
                return false;
            }

            // Check certificate expiration
            const expiryCheck = await exec(`openssl x509 -in "${certPath}" -checkend 0`);
            const isExpired = expiryCheck.stderr && expiryCheck.stderr.includes('will expire');

            if (isExpired) {
                this.logger.warn(`Certificate is expired: ${certPath}`);
                
                // Log expired certificate
                if (this.loggingService) {
                    this.loggingService.logCertificateEvent(
                        'CERTIFICATE_EXPIRED',
                        path.basename(certPath, '.crt'),
                        'system',
                        'localhost',
                        { certPath }
                    );
                }
                
                return false;
            }

            // Log successful validation
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'CERTIFICATE_VALIDATION_SUCCESS',
                    path.basename(certPath, '.crt'),
                    'system',
                    'localhost',
                    { certPath }
                );
            }

            return true;
        } catch (error) {
            this.logger.error(`Certificate validation error: ${error.message}`);
            
            // Log validation failure
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'CERTIFICATE_VALIDATION_FAILURE',
                    path.basename(certPath, '.crt'),
                    'system',
                    'localhost',
                    { certPath, error: error.message }
                );
            }
            
            return false;
        }
    }

    // Generate TLS authentication key for additional security layer
    async generateTLSAuthKey() {
        try {
            const taKeyPath = path.join(config.certificates.dir, 'ta.key');
            
            // Check if ta.key already exists
            if (await this.fileExists(taKeyPath)) {
                this.logger.info('TLS auth key already exists, skipping generation');
                return taKeyPath;
            }

            this.logger.info('Generating TLS authentication key for enhanced security...');
            
            // Generate TLS auth key using OpenVPN
            const command = `openvpn --genkey --secret "${taKeyPath}"`;
            await exec(command);
            
            // Set secure permissions
            if (this.platform !== 'win32') {
                await exec(`chmod 600 "${taKeyPath}"`);
            }
            
            // Log security event
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'TLS_AUTH_KEY_GENERATED', 'system', 'system', 'localhost', { keyPath: taKeyPath });
            }
            
            this.logger.info(`TLS auth key generated successfully at: ${taKeyPath}`);
            return taKeyPath;
            
        } catch (error) {
            if (this.loggingService) {
                this.loggingService.logCertificateEvent(
                    'TLS_AUTH_KEY_GENERATION_FAILED', 'system', 'system', 'localhost', { error: error.message });
            }
            
            this.logger.error('Failed to generate TLS auth key:', error);
            throw error;
        }
    }
}

module.exports = SimplifiedCertificateManager;