#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const config = require('../src/config');
const OpenVPNSecurityConfig = require('../src/utils/openvpn-security-config');

console.log('🔒 Applying OpenVPN Security Hardening...');

async function hardenConfiguration() {
  try {
    // Initialize logging service
    const LoggingService = require('../src/services/logging-service');
    const loggingService = new LoggingService();
    const logger = loggingService.getLogger();

    // Initialize Simplified Certificate Manager
    const SimplifiedCertificateManager = require('../src/utils/enhanced-certificate-manager');
    const certManager = new SimplifiedCertificateManager(logger, loggingService);

    console.log('📋 Step 1: Initializing security hardening components...');
    
    // Generate TLS auth key for enhanced security
    await certManager.generateTLSAuthKey();
    
    // Generate CRL for certificate revocation support
    await certManager.generateCRL();
    
    console.log('✅ Security components initialized');

    console.log('📋 Step 2: Generating hardened OpenVPN configuration...');
    
    // Create security config manager
    const securityConfig = new OpenVPNSecurityConfig(config, logger);
    
    // Generate hardened configuration
    const hardenedConfig = securityConfig.generateHardenedConfig(config.certificates.dir, {
      port: 1194,
      protocol: 'udp',
      subnet: '10.8.0.0',
      netmask: '255.255.255.0',
      dnsServers: ['1.1.1.1', '1.0.0.1'], // Cloudflare DNS for security
      logDir: process.platform === 'win32' ? 'C:\\ProgramData\\OpenVPN\\log' : '/var/log/openvpn'
    });

    // Write hardened configuration
    const configPath = path.join(config.config.path, 'openvpn.conf');
    const backupPath = path.join(config.config.path, `openvpn.conf.backup.${Date.now()}`);
    
    // Backup existing configuration if it exists
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
      console.log(`📁 Backed up existing config to: ${backupPath}`);
    }
    
    // Write new hardened configuration
    await fs.writeFile(configPath, hardenedConfig);
    console.log(`✅ Hardened configuration written to: ${configPath}`);

    console.log('📋 Step 3: Creating additional security files...');
    
    // Create client config directory
    await securityConfig.createClientConfigDir(config.certificates.dir);
    
    // Create firewall scripts (Linux/macOS only)
    if (process.platform !== 'win32') {
      await securityConfig.createFirewallScripts(config.certificates.dir);
      console.log('✅ Firewall scripts created');
    }

    console.log('📋 Step 4: Validating security configuration...');
    
    // Simple validation - check if key files exist
    const taKeyPath = path.join(config.certificates.dir, 'ta.key');
    const crlPath = path.join(config.certificates.dir, 'crl.pem');
    
    if (await fs.pathExists(taKeyPath) && await fs.pathExists(crlPath)) {
        console.log('✅ Security configuration validation passed');
    } else {
        console.warn('⚠️  Some security files may be missing');
    }

    // Validate OpenVPN configuration syntax
    const isValid = await securityConfig.validateConfiguration(configPath);
    if (isValid) {
      console.log('✅ OpenVPN configuration syntax validation passed');
    } else {
      console.warn('⚠️  OpenVPN configuration validation failed - please check the logs');
    }

    console.log('\n🎉 OpenVPN Security Hardening Complete!');
    console.log('\n📋 Security Features Applied:');
    console.log('   ✅ AES-256-GCM encryption');
    console.log('   ✅ Perfect Forward Secrecy (ECDH + strong DH params)');
    console.log('   ✅ TLS authentication layer');
    console.log('   ✅ Certificate verification requirements');
    console.log('   ✅ DNS leak protection with secure DNS servers');
    console.log('   ✅ Connection security and timeout settings');
    console.log('   ✅ Certificate Revocation List (CRL) support');
    console.log('   ✅ Enhanced logging and monitoring');
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Restart your OpenVPN server to apply the new configuration');
    console.log('   2. Regenerate client certificates to include new security features');
    console.log('   3. Test VPN connections with the hardened configuration');
    
    if (process.platform !== 'win32') {
      console.log('   4. Review and customize firewall scripts in /etc/openvpn/');
    }

  } catch (error) {
    console.error('❌ Error during security hardening:', error.message);
    console.error('\nPlease check the logs and ensure:');
    console.error('   - OpenVPN is installed and accessible');
    console.error('   - OpenSSL is installed and accessible');
    console.error('   - You have proper permissions to write configuration files');
    console.error('   - All required certificates exist');
    
    process.exit(1);
  }
}

// Run the hardening process
hardenConfiguration();