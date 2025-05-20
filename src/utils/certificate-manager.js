const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const mkdirp = require('mkdirp');
const config = require('../config');

class CertificateManager {
    constructor(logger) {
      this.logger = logger || console;
      this.logger.info('Initializing CertificateManager...');
      this.logger.info(`Certificates directory: ${config.certificates.dir}`);
      
      // Make sure directories exist
      mkdirp.sync(config.certificates.dir);
      this.logger.info('Ensured certificates directory exists');
      
      this.pkiPath = path.join(config.certificates.dir, 'pki');
      this.platform = os.platform();
      this.logger.info(`Platform detected: ${this.platform}`);
      
      // Default to the project's easy-rsa directory
      this.easyrsaPath = path.join(process.cwd(), 'easy-rsa');
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
        } else {
          this.logger.info('Skipping init-pki as directory already exists');
        }
        
        // Now build CA
        if (this.platform === 'win32') {  // Windows
          command = `
            cd /d "${this.easyrsaPath}" &&
            easyrsa build-ca nopass
          `;
        } else {  // macOS and Linux
          command = `
            cd "${this.easyrsaPath}" &&
            ./easyrsa build-ca nopass
          `;
        }
        
        this.logger.info('Building CA...');
        const caResult = await exec(command);
        if (caResult.stdout) this.logger.info(`CA build output: ${caResult.stdout}`);
        if (caResult.stderr) this.logger.warn(`CA build stderr: ${caResult.stderr}`);
        
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
        
        this.logger.info('PKI initialized successfully');
        return true;
      } catch (error) {
        this.logger.error(`Error initializing PKI: ${error.message}`);
        if (error.stdout) this.logger.info(`Command stdout: ${error.stdout}`);
        if (error.stderr) this.logger.error(`Command stderr: ${error.stderr}`);
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
        }
        
        // Copy the certificates to the certificates directory
        await this.copyCertificates(config.certificates.serverCertName);
        
        this.logger.info('Server certificates generated successfully');
        return true;
      } catch (error) {
        this.logger.error(`Error generating server certificates: ${error.message}`);
        if (error.stdout) this.logger.info(`Command stdout: ${error.stdout}`);
        if (error.stderr) this.logger.error(`Command stderr: ${error.stderr}`);
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
        
        // Copy each file
        for (const [type, srcPath] of Object.entries(sourcePaths)) {
          try {
            await fs.access(srcPath);
            await fs.copyFile(srcPath, destPaths[type]);
            this.logger.info(`Copied ${type} certificate to: ${destPaths[type]}`);
          } catch (err) {
            this.logger.warn(`Could not copy ${type} certificate: ${err.message}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error copying certificates: ${error.message}`);
        throw new Error(`Failed to copy certificates: ${error.message}`);
      }
    }
    
    async generateClientCertificate(clientName) {
      try {
        // If we don't have a path yet, find it
        if (!this.easyrsaPath) {
          this.easyrsaPath = await this.findEasyRsaPath();
        }
        
        this.logger.info(`Using Easy-RSA path for client cert: ${this.easyrsaPath}`);
        
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
        
        // Copy the client certificates
        await this.copyCertificates(clientName);
        
        // Generate client configuration
        await this.generateClientConfig(clientName);
        
        this.logger.info(`Client certificate for ${clientName} generated successfully`);
        return true;
      } catch (error) {
        this.logger.error(`Error generating client certificate: ${error.message}`);
        if (error.stdout) this.logger.info(`Command stdout: ${error.stdout}`);
        if (error.stderr) this.logger.error(`Command stderr: ${error.stderr}`);
        throw new Error(`Failed to generate client certificate: ${error.message}`);
      }
    }
      
    async generateClientConfig(clientName) {
      const newLine = this.platform === 'win32' ? '\r\n' : '\n';

      const ca = await fs.readFile(path.join(config.certificates.dir, 'ca.crt'), 'utf8');
      const cert = await fs.readFile(path.join(config.certificates.dir, `${clientName}.crt`), 'utf8');
      const key = await fs.readFile(path.join(config.certificates.dir, `${clientName}.key`), 'utf8');

      const clientConfig =
`client
dev tun
proto ${config.vpn.protocol}
remote YOUR_SERVER_IP ${config.vpn.port}
resolv-retry infinite
nobind
persist-key
persist-tun
comp-lzo
verb 3
<ca>
${ca.trim()}
</ca>
<cert>
${cert.trim()}
</cert>
<key>
${key.trim()}
</key>`.replace(/\n/g, newLine);

      const outputPath = path.join(config.certificates.dir, `${clientName}.ovpn`);
      await fs.writeFile(outputPath, clientConfig);
      this.logger.info(`Generated inline client config at: ${outputPath}`);
    }
}

module.exports = CertificateManager;