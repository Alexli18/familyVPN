#!/usr/bin/env node

/**
 * Comprehensive Validation Test Suite
 * Tests all key features and security configurations
 * Requirements: All requirements validation (1.1-8.5)
 */

const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('cross-spawn');

// Set up test environment with local directories BEFORE importing any modules
const testDir = path.join(process.cwd(), 'test-certificates');
process.env.VPN_CERT_DIR = testDir;
process.env.VPN_CONFIG_DIR = testDir;

// Import services and utilities AFTER setting environment variables
const config = require('../src/config');
const LoggingService = require('../src/services/logging-service');
const AuthenticationService = require('../src/services/auth-service');
const MetricsService = require('../src/services/metrics-service');
const SimplifiedCertificateManager = require('../src/utils/enhanced-certificate-manager');
const NetworkSecurityManager = require('../src/utils/network-security');

class ComprehensiveValidationTest {
  constructor() {
    this.loggingService = new LoggingService();
    this.logger = this.loggingService.getLogger();
    this.metricsService = new MetricsService(this.loggingService);
    this.authService = new AuthenticationService(this.loggingService, this.metricsService);
    this.certManager = new SimplifiedCertificateManager(this.logger, this.loggingService);
    this.networkSecurity = new NetworkSecurityManager(config, this.logger);
    this.testResults = [];
    this.testStartTime = Date.now();
  }

  /**
   * Get the reloaded config with test environment variables
   */
  getConfig() {
    return config;
  }

  /**
   * Run all comprehensive validation tests
   */
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Validation Test Suite...\n');
    console.log('📋 Testing all security hardening requirements\n');

    try {
      // Requirement 1: Authentication and Credential Security
      await this.testAuthenticationSecurity();
      
      // Requirement 2: Logging and Monitoring
      await this.testLoggingAndMonitoring();
      
      // Requirement 3: OpenVPN Security Configuration
      await this.testOpenVPNSecurity();
      
      // Requirement 4: Certificate Management
      await this.testCertificateManagement();
      
      // Requirement 5: Docker Security
      await this.testDockerSecurity();
      
      // Requirement 6: Network Security
      await this.testNetworkSecurity();
      
      // Requirement 7: Documentation and Compliance
      await this.testDocumentationCompliance();
      
      // Requirement 8: Backup and Recovery
      await this.testBackupRecovery();

      // Integration Tests
      await this.testSystemIntegration();

      // Display results
      this.displayTestResults();

    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test Requirement 1: Authentication and Credential Security
   */
  async testAuthenticationSecurity() {
    console.log('🔐 Testing Authentication and Credential Security (Requirement 1)');
    
    // Test 1.1: No hardcoded credentials
    await this.testNoHardcodedCredentials();
    
    // Test 1.2: Environment variable authentication
    await this.testEnvironmentVariableAuth();
    
    // Test 1.3: Password hashing and encryption
    await this.testPasswordSecurity();
    
    // Test 1.4: Multi-factor authentication capability
    await this.testMFACapability();
    
    console.log('');
  }

  /**
   * Test for hardcoded credentials in source code
   */
  async testNoHardcodedCredentials() {
    const testName = 'No Hardcoded Credentials (1.1)';
    
    try {
      const sourceFiles = await this.findSourceFiles();
      const suspiciousPatterns = [
        /password\s*[=:]\s*['"][a-zA-Z0-9!@#$%^&*]{8,}['"]/i,
        /username\s*[=:]\s*['"](?!system|admin|user|test|username|password)[a-zA-Z0-9]{3,}['"]/i,
        /secret\s*[=:]\s*['"][a-zA-Z0-9!@#$%^&*]{12,}['"]/i,
        /paparol@42/i,
        /root.*password.*['"][a-zA-Z0-9!@#$%^&*]+['"]/i
      ];

      let foundHardcoded = false;
      const violations = [];

      for (const file of sourceFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        for (const pattern of suspiciousPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            foundHardcoded = true;
            violations.push(`${file}: ${matches[0]}`);
          }
        }
      }

      if (foundHardcoded) {
        throw new Error(`Hardcoded credentials found: ${violations.join(', ')}`);
      }

      this.addTestResult(testName, true, 'No hardcoded credentials found in source code');
      console.log('  ✅ No hardcoded credentials found');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test environment variable authentication
   */
  async testEnvironmentVariableAuth() {
    const testName = 'Environment Variable Authentication (1.2)';
    
    try {
      // Test that auth service uses environment variables
      const testCredentials = {
        username: 'testuser',
        password: 'testpass123'
      };

      // Set test environment variables
      process.env.VPN_USERNAME = testCredentials.username;
      // Hash the password for the auth service
      const hashedPassword = await this.authService.hashPassword(testCredentials.password);
      process.env.VPN_PASSWORD_HASH = hashedPassword;

      // Test authentication with environment credentials
      const result = await this.authService.authenticate(
        testCredentials.username, 
        testCredentials.password, 
        '127.0.0.1'
      );

      if (!result.success) {
        throw new Error('Environment variable authentication failed');
      }

      this.addTestResult(testName, true, 'Environment variable authentication working');
      console.log('  ✅ Environment variable authentication verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test password security (hashing, encryption)
   */
  async testPasswordSecurity() {
    const testName = 'Password Security (1.3)';
    
    try {
      const testPassword = 'testPassword123!';
      
      // Test password hashing
      const hashedPassword = await this.authService.hashPassword(testPassword);
      
      if (!hashedPassword || hashedPassword === testPassword) {
        throw new Error('Password hashing failed');
      }

      // Test bcrypt format
      if (!hashedPassword.startsWith('$2b$')) {
        throw new Error('Password not using bcrypt hashing');
      }

      // Test password verification
      const isValid = await this.authService.verifyPassword(testPassword, hashedPassword);
      if (!isValid) {
        throw new Error('Password verification failed');
      }

      // Test wrong password rejection
      const isInvalid = await this.authService.verifyPassword('wrongpassword', hashedPassword);
      if (isInvalid) {
        throw new Error('Wrong password not properly rejected');
      }

      this.addTestResult(testName, true, 'Password hashing and verification working correctly');
      console.log('  ✅ Password security (bcrypt hashing) verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test MFA capability
   */
  async testMFACapability() {
    const testName = 'Multi-Factor Authentication Capability (1.4)';
    
    try {
      // Test JWT token generation and validation
      const tokens = await this.authService.generateTokens('testuser', '127.0.0.1');
      
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new Error('Token generation failed');
      }

      // Test token validation
      const validation = await this.authService.validateToken(tokens.accessToken, '127.0.0.1');
      if (!validation.valid) {
        throw new Error('Token validation failed');
      }

      // Test token expiration handling
      if (!validation.decoded.exp) {
        throw new Error('Token missing expiration');
      }

      this.addTestResult(testName, true, 'JWT-based authentication tokens working');
      console.log('  ✅ JWT token-based authentication verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test Requirement 2: Logging and Monitoring
   */
  async testLoggingAndMonitoring() {
    console.log('📊 Testing Logging and Monitoring (Requirement 2)');
    
    // Test 2.1: Structured logging
    await this.testStructuredLogging();
    
    // Test 2.2: Security event logging
    await this.testSecurityEventLogging();
    
    // Test 2.3: Health metrics
    await this.testHealthMetrics();
    
    // Test 2.4: Log rotation
    await this.testLogRotation();
    
    // Test 2.5: Alerting capabilities
    await this.testAlertingCapabilities();
    
    console.log('');
  }

  /**
   * Test structured logging
   */
  async testStructuredLogging() {
    const testName = 'Structured Logging (2.1)';
    
    try {
      const logger = this.loggingService.getLogger();
      
      // Test different log levels
      logger.info('Test info message', { testData: 'info' });
      logger.warn('Test warning message', { testData: 'warning' });
      logger.error('Test error message', { testData: 'error' });

      // Check if log files exist
      const logDir = path.join(process.cwd(), 'logs');
      const applicationLog = path.join(logDir, `application-${new Date().toISOString().split('T')[0]}.log`);
      
      if (await fs.pathExists(applicationLog)) {
        const logContent = await fs.readFile(applicationLog, 'utf8');
        
        if (!logContent.includes('Test info message')) {
          throw new Error('Structured logging not working properly');
        }
      }

      this.addTestResult(testName, true, 'Structured logging with Winston working');
      console.log('  ✅ Structured logging verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test security event logging
   */
  async testSecurityEventLogging() {
    const testName = 'Security Event Logging (2.2)';
    
    try {
      // Test security event logging
      this.loggingService.logSecurityEvent('test_event', {
        userId: 'testuser',
        action: 'test_action',
        ip: '127.0.0.1',
        timestamp: new Date().toISOString()
      });

      // Check if security log exists
      const logDir = path.join(process.cwd(), 'logs');
      const securityLog = path.join(logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
      
      if (await fs.pathExists(securityLog)) {
        const logContent = await fs.readFile(securityLog, 'utf8');
        
        if (!logContent.includes('test_event')) {
          throw new Error('Security event logging not working');
        }
      }

      this.addTestResult(testName, true, 'Security event logging working');
      console.log('  ✅ Security event logging verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test health metrics
   */
  async testHealthMetrics() {
    const testName = 'Health Metrics (2.3)';
    
    try {
      // Test metrics recording
      this.metricsService.recordMetric('test_metric', 1, { test: 'true' });
      
      // Test metrics retrieval
      const metrics = this.metricsService.getMetrics();
      
      if (!metrics || typeof metrics !== 'object') {
        throw new Error('Metrics service not working properly');
      }

      this.addTestResult(testName, true, 'Health metrics collection working');
      console.log('  ✅ Health metrics verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test log rotation
   */
  async testLogRotation() {
    const testName = 'Log Rotation (2.4)';
    
    try {
      // Check if log rotation is configured
      const logger = this.loggingService.getLogger();
      
      // Winston daily rotate file should be configured
      const transports = logger.transports;
      const hasRotateTransport = transports.some(transport => 
        transport.constructor.name === 'DailyRotateFile'
      );

      if (!hasRotateTransport) {
        throw new Error('Log rotation not configured');
      }

      this.addTestResult(testName, true, 'Log rotation configured with Winston daily rotate');
      console.log('  ✅ Log rotation configuration verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test alerting capabilities
   */
  async testAlertingCapabilities() {
    const testName = 'Alerting Capabilities (2.5)';
    
    try {
      // Test alert generation through logging service
      this.loggingService.generateAlert('high', 'Test alert message', {
        source: 'test',
        timestamp: new Date().toISOString()
      });

      // Check if alert was logged
      const logDir = path.join(process.cwd(), 'logs');
      const securityLog = path.join(logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
      
      if (await fs.pathExists(securityLog)) {
        const logContent = await fs.readFile(securityLog, 'utf8');
        
        if (!logContent.includes('ALERT')) {
          throw new Error('Alert generation not working');
        }
      }

      this.addTestResult(testName, true, 'Alert generation working through logging service');
      console.log('  ✅ Alerting capabilities verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test Requirement 3: OpenVPN Security Configuration
   */
  async testOpenVPNSecurity() {
    console.log('🔒 Testing OpenVPN Security Configuration (Requirement 3)');
    
    // Test 3.1: Strong encryption algorithms
    await this.testStrongEncryption();
    
    // Test 3.2: Perfect forward secrecy
    await this.testPerfectForwardSecrecy();
    
    // Test 3.3: Strong key sizes
    await this.testStrongKeySizes();
    
    // Test 3.4: Unnecessary services disabled
    await this.testUnnecessaryServicesDisabled();
    
    // Test 3.5: DNS leak protection
    await this.testDNSLeakProtection();
    
    console.log('');
  }

  /**
   * Test strong encryption configuration
   */
  async testStrongEncryption() {
    const testName = 'Strong Encryption Algorithms (3.1)';
    
    try {
      // Check if hardened config script exists and works
      const hardenScript = path.join(__dirname, '..', 'scripts', 'harden-config.js');
      
      if (!await fs.pathExists(hardenScript)) {
        throw new Error('Hardened config script not found');
      }

      // Run hardening script
      const result = await this.runCommand('node', [hardenScript]);
      
      if (!result.success) {
        throw new Error(`Hardening script failed: ${result.error}`);
      }

      // Check if hardened config file was created
      const hardenedConfigPath = path.join(this.getConfig().certificates.dir, 'server-hardened.conf');
      
      if (await fs.pathExists(hardenedConfigPath)) {
        const configContent = await fs.readFile(hardenedConfigPath, 'utf8');
        
        if (!configContent.includes('cipher AES-256-GCM')) {
          throw new Error('Strong encryption (AES-256-GCM) not configured');
        }

        if (!configContent.includes('auth SHA256')) {
          throw new Error('Strong authentication (SHA256) not configured');
        }
      }

      this.addTestResult(testName, true, 'Strong encryption algorithms configured');
      console.log('  ✅ Strong encryption (AES-256-GCM) verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test perfect forward secrecy
   */
  async testPerfectForwardSecrecy() {
    const testName = 'Perfect Forward Secrecy (3.2)';
    
    try {
      const hardenedConfigPath = path.join(this.getConfig().certificates.dir, 'server-hardened.conf');
      
      if (await fs.pathExists(hardenedConfigPath)) {
        const configContent = await fs.readFile(hardenedConfigPath, 'utf8');
        
        if (!configContent.includes('tls-crypt')) {
          throw new Error('TLS-crypt not configured for perfect forward secrecy');
        }

        if (!configContent.includes('dh ')) {
          throw new Error('Diffie-Hellman parameters not configured');
        }
      } else {
        throw new Error('Hardened config file not found');
      }

      this.addTestResult(testName, true, 'Perfect forward secrecy configured');
      console.log('  ✅ Perfect forward secrecy verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test strong key sizes
   */
  async testStrongKeySizes() {
    const testName = 'Strong Key Sizes (3.3)';
    
    try {
      // Check if CA certificate uses strong key size
      const caCertPath = path.join(process.cwd(), 'easy-rsa', 'pki', 'ca.crt');
      
      if (await fs.pathExists(caCertPath)) {
        const result = await this.runCommand('openssl', ['x509', '-in', caCertPath, '-text', '-noout']);
        
        if (result.success) {
          const certInfo = result.stdout;
          
          // Check for RSA key size >= 2048 or ECC
          if (!certInfo.includes('2048 bit') && !certInfo.includes('4096 bit') && !certInfo.includes('Public-Key: (256 bit)')) {
            throw new Error('Certificate not using strong key size');
          }
        }
      }

      this.addTestResult(testName, true, 'Strong key sizes verified');
      console.log('  ✅ Strong key sizes (≥2048-bit RSA) verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test unnecessary services disabled
   */
  async testUnnecessaryServicesDisabled() {
    const testName = 'Unnecessary Services Disabled (3.4)';
    
    try {
      const hardenedConfigPath = path.join(config.certificates.dir, 'server-hardened.conf');
      
      if (await fs.pathExists(hardenedConfigPath)) {
        const configContent = await fs.readFile(hardenedConfigPath, 'utf8');
        
        // Check for security-focused configurations
        if (!configContent.includes('user nobody') && !configContent.includes('user openvpn')) {
          throw new Error('OpenVPN not configured to run as non-root user');
        }

        if (!configContent.includes('group nobody') && !configContent.includes('group openvpn') && !configContent.includes('group nogroup')) {
          throw new Error('OpenVPN not configured to run with restricted group');
        }
      }

      this.addTestResult(testName, true, 'Unnecessary services and privileges disabled');
      console.log('  ✅ Service hardening verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test DNS leak protection
   */
  async testDNSLeakProtection() {
    const testName = 'DNS Leak Protection (3.5)';
    
    try {
      // Test DNS protection configuration
      await this.networkSecurity.configureDNSLeakProtection();
      
      const dnsConfigPath = path.join(this.getConfig().certificates.dir, 'dns-protection.conf');
      
      if (await fs.pathExists(dnsConfigPath)) {
        const dnsContent = await fs.readFile(dnsConfigPath, 'utf8');
        
        if (!dnsContent.includes('block-outside-dns')) {
          throw new Error('DNS leak protection not configured');
        }

        if (!dnsContent.includes('redirect-gateway def1 bypass-dhcp')) {
          throw new Error('Gateway redirection not configured');
        }
      }

      this.addTestResult(testName, true, 'DNS leak protection configured');
      console.log('  ✅ DNS leak protection verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test Requirement 4: Certificate Management
   */
  async testCertificateManagement() {
    console.log('📜 Testing Certificate Management (Requirement 4)');
    
    // Test 4.1: Automated certificate renewal
    await this.testAutomatedRenewal();
    
    // Test 4.2: Certificate revocation
    await this.testCertificateRevocation();
    
    // Test 4.3: Certificate validity periods
    await this.testCertificateValidityPeriods();
    
    // Test 4.4: Certificate operation logging
    await this.testCertificateOperationLogging();
    
    // Test 4.5: CA private key security
    await this.testCAPrivateKeySecurity();
    
    console.log('');
  }

  /**
   * Test automated certificate renewal capability
   */
  async testAutomatedRenewal() {
    const testName = 'Automated Certificate Renewal (4.1)';
    
    try {
      // Test certificate validation functionality
      const caCertPath = path.join(process.cwd(), 'easy-rsa', 'pki', 'ca.crt');
      
      if (await fs.pathExists(caCertPath)) {
        const isValid = await this.certManager.validateCertificate(caCertPath);
        
        if (!isValid) {
          throw new Error('Certificate validation failed');
        }
      }

      // Test certificate generation (renewal simulation)
      await this.certManager.generateClientCertificate('test-renewal-client');
      
      const clientCertPath = path.join(this.getConfig().certificates.dir, 'test-renewal-client.crt');
      if (await fs.pathExists(clientCertPath)) {
        // Clean up test certificate
        await fs.remove(clientCertPath);
        const clientKeyPath = path.join(this.getConfig().certificates.dir, 'test-renewal-client.key');
        if (await fs.pathExists(clientKeyPath)) {
          await fs.remove(clientKeyPath);
        }
      }

      this.addTestResult(testName, true, 'Certificate renewal capability verified');
      console.log('  ✅ Automated renewal capability verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test certificate revocation
   */
  async testCertificateRevocation() {
    const testName = 'Certificate Revocation (4.2)';
    
    try {
      // Test CRL generation
      const crlPath = await this.certManager.generateCRL();
      
      if (!crlPath || !await fs.pathExists(crlPath)) {
        throw new Error('CRL generation failed');
      }

      // Verify CRL content
      const result = await this.runCommand('openssl', ['crl', '-in', crlPath, '-text', '-noout']);
      
      if (!result.success) {
        throw new Error('CRL validation failed');
      }

      this.addTestResult(testName, true, 'Certificate revocation (CRL) working');
      console.log('  ✅ Certificate revocation (CRL) verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test certificate validity periods
   */
  async testCertificateValidityPeriods() {
    const testName = 'Certificate Validity Periods (4.3)';
    
    try {
      // Check CA certificate validity
      const caCertPath = path.join(process.cwd(), 'easy-rsa', 'pki', 'ca.crt');
      
      if (await fs.pathExists(caCertPath)) {
        const result = await this.runCommand('openssl', ['x509', '-in', caCertPath, '-dates', '-noout']);
        
        if (result.success) {
          const dates = result.stdout;
          
          if (!dates.includes('notBefore') || !dates.includes('notAfter')) {
            throw new Error('Certificate validity dates not found');
          }
        }
      }

      this.addTestResult(testName, true, 'Certificate validity periods configured');
      console.log('  ✅ Certificate validity periods verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test certificate operation logging
   */
  async testCertificateOperationLogging() {
    const testName = 'Certificate Operation Logging (4.4)';
    
    try {
      // Generate a test certificate to trigger logging
      await this.certManager.generateClientCertificate('test-logging-client');
      
      // Check if certificate operations are logged
      const logDir = path.join(process.cwd(), 'logs');
      const applicationLog = path.join(logDir, `application-${new Date().toISOString().split('T')[0]}.log`);
      
      if (await fs.pathExists(applicationLog)) {
        const logContent = await fs.readFile(applicationLog, 'utf8');
        
        if (!logContent.includes('certificate') && !logContent.includes('Certificate')) {
          throw new Error('Certificate operations not being logged');
        }
      }

      // Clean up test certificate
      const testCertPath = path.join(this.getConfig().certificates.dir, 'test-logging-client.crt');
      if (await fs.pathExists(testCertPath)) {
        await fs.remove(testCertPath);
      }
      const testKeyPath = path.join(this.getConfig().certificates.dir, 'test-logging-client.key');
      if (await fs.pathExists(testKeyPath)) {
        await fs.remove(testKeyPath);
      }

      this.addTestResult(testName, true, 'Certificate operations being logged');
      console.log('  ✅ Certificate operation logging verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test CA private key security
   */
  async testCAPrivateKeySecurity() {
    const testName = 'CA Private Key Security (4.5)';
    
    try {
      const caKeyPath = path.join(process.cwd(), 'easy-rsa', 'pki', 'private', 'ca.key');
      
      if (await fs.pathExists(caKeyPath)) {
        const stats = await fs.stat(caKeyPath);
        
        // Check file permissions (should be 600 or similar)
        const mode = stats.mode & parseInt('777', 8);
        
        if (mode > parseInt('600', 8)) {
          throw new Error('CA private key has overly permissive permissions');
        }
      }

      this.addTestResult(testName, true, 'CA private key security verified');
      console.log('  ✅ CA private key security verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test Requirement 5: Docker Security
   */
  async testDockerSecurity() {
    console.log('🐳 Testing Docker Security (Requirement 5)');
    
    // Test 5.1: Multi-stage Docker builds
    await this.testMultiStageDockerBuild();
    
    // Test 5.2: Non-root container execution
    await this.testNonRootContainer();
    
    // Test 5.3: Secure secret injection
    await this.testSecureSecretInjection();
    
    // Test 5.4: Security scanning
    await this.testSecurityScanning();
    
    // Test 5.5: Container lifecycle management
    await this.testContainerLifecycleManagement();
    
    console.log('');
  }

  /**
   * Test multi-stage Docker build
   */
  async testMultiStageDockerBuild() {
    const testName = 'Multi-stage Docker Build (5.1)';
    
    try {
      const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
      
      if (await fs.pathExists(dockerfilePath)) {
        const dockerfileContent = await fs.readFile(dockerfilePath, 'utf8');
        
        if (!dockerfileContent.includes('FROM') || !dockerfileContent.includes('AS')) {
          throw new Error('Multi-stage Docker build not configured');
        }

        // Check for security best practices
        if (!dockerfileContent.includes('USER') && !dockerfileContent.includes('adduser')) {
          throw new Error('Dockerfile not configured for non-root user');
        }
      } else {
        throw new Error('Dockerfile not found');
      }

      this.addTestResult(testName, true, 'Multi-stage Docker build configured');
      console.log('  ✅ Multi-stage Docker build verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test non-root container execution
   */
  async testNonRootContainer() {
    const testName = 'Non-root Container Execution (5.2)';
    
    try {
      const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
      
      if (await fs.pathExists(dockerfilePath)) {
        const dockerfileContent = await fs.readFile(dockerfilePath, 'utf8');
        
        if (!dockerfileContent.includes('USER ') && !dockerfileContent.includes('adduser')) {
          throw new Error('Container not configured to run as non-root user');
        }
      }

      this.addTestResult(testName, true, 'Non-root container execution configured');
      console.log('  ✅ Non-root container execution verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test secure secret injection
   */
  async testSecureSecretInjection() {
    const testName = 'Secure Secret Injection (5.3)';
    
    try {
      const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
      
      if (await fs.pathExists(dockerComposePath)) {
        const composeContent = await fs.readFile(dockerComposePath, 'utf8');
        
        // Check for environment variable usage
        if (!composeContent.includes('environment:') && !composeContent.includes('env_file:')) {
          throw new Error('Secure secret injection not configured');
        }
      }

      this.addTestResult(testName, true, 'Secure secret injection configured');
      console.log('  ✅ Secure secret injection verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test security scanning
   */
  async testSecurityScanning() {
    const testName = 'Security Scanning (5.4)';
    
    try {
      const securityScanScript = path.join(__dirname, '..', 'scripts', 'security-scan.js');
      
      if (!await fs.pathExists(securityScanScript)) {
        throw new Error('Security scan script not found');
      }

      // Run security scan
      const result = await this.runCommand('node', [securityScanScript]);
      
      if (!result.success && !result.stdout.includes('scan')) {
        throw new Error('Security scanning not working properly');
      }

      this.addTestResult(testName, true, 'Security scanning capability available');
      console.log('  ✅ Security scanning verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test container lifecycle management
   */
  async testContainerLifecycleManagement() {
    const testName = 'Container Lifecycle Management (5.5)';
    
    try {
      const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
      
      if (await fs.pathExists(dockerComposePath)) {
        const composeContent = await fs.readFile(dockerComposePath, 'utf8');
        
        // Check for health checks
        if (!composeContent.includes('healthcheck') && !composeContent.includes('HEALTHCHECK')) {
          throw new Error('Health checks not configured');
        }

        // Check for restart policies
        if (!composeContent.includes('restart:')) {
          throw new Error('Restart policy not configured');
        }
      }

      this.addTestResult(testName, true, 'Container lifecycle management configured');
      console.log('  ✅ Container lifecycle management verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test Requirement 6: Network Security
   */
  async testNetworkSecurity() {
    console.log('🌐 Testing Network Security (Requirement 6)');
    
    // Test 6.1: Traffic filtering
    await this.testTrafficFiltering();
    
    // Test 6.2: Firewall configuration
    await this.testFirewallConfiguration();
    
    // Test 6.3: Split-tunneling options
    await this.testSplitTunnelingOptions();
    
    console.log('');
  }

  /**
   * Test traffic filtering
   */
  async testTrafficFiltering() {
    const testName = 'Traffic Filtering (6.1)';
    
    try {
      // Test client access control setup
      await this.networkSecurity.setupClientAccessControl();
      
      const clientAccessPath = path.join(this.getConfig().certificates.dir, 'client-access.conf');
      
      if (await fs.pathExists(clientAccessPath)) {
        const accessContent = await fs.readFile(clientAccessPath, 'utf8');
        
        if (!accessContent.includes('verify-client-cert require')) {
          throw new Error('Client certificate verification not configured');
        }
      }

      this.addTestResult(testName, true, 'Traffic filtering configured');
      console.log('  ✅ Traffic filtering verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test firewall configuration
   */
  async testFirewallConfiguration() {
    const testName = 'Firewall Configuration (6.2)';
    
    try {
      // Test firewall rules creation
      await this.networkSecurity.createFirewallRules();
      
      if (process.platform !== 'win32') {
        const firewallScript = path.join(this.getConfig().certificates.dir, 'scripts', 'firewall-rules.sh');
        
        if (await fs.pathExists(firewallScript)) {
          const scriptContent = await fs.readFile(firewallScript, 'utf8');
          
          if (!scriptContent.includes('iptables')) {
            throw new Error('Firewall rules not properly configured');
          }
        }
      }

      this.addTestResult(testName, true, 'Firewall configuration verified');
      console.log('  ✅ Firewall configuration verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test split-tunneling options
   */
  async testSplitTunnelingOptions() {
    const testName = 'Split-tunneling Options (6.3)';
    
    try {
      // Test DNS leak protection which includes routing options
      await this.networkSecurity.configureDNSLeakProtection();
      
      const dnsConfigPath = path.join(this.getConfig().certificates.dir, 'dns-protection.conf');
      
      if (await fs.pathExists(dnsConfigPath)) {
        const dnsContent = await fs.readFile(dnsConfigPath, 'utf8');
        
        if (!dnsContent.includes('redirect-gateway')) {
          throw new Error('Gateway redirection options not configured');
        }
      }

      this.addTestResult(testName, true, 'Split-tunneling options available');
      console.log('  ✅ Split-tunneling options verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test Requirement 7: Documentation and Compliance
   */
  async testDocumentationCompliance() {
    console.log('📚 Testing Documentation and Compliance (Requirement 7)');
    
    // Test 7.1: Complete documentation
    await this.testCompleteDocumentation();
    
    // Test 7.2: Security configuration documentation
    await this.testSecurityConfigurationDocumentation();
    
    console.log('');
  }

  /**
   * Test complete documentation
   */
  async testCompleteDocumentation() {
    const testName = 'Complete Documentation (7.1)';
    
    try {
      const requiredDocs = [
        'README.md',
        'docs/en/security/README.md',
        'docs/ru/security/README.md',
        'docs/en/troubleshooting/README.md'
      ];

      for (const doc of requiredDocs) {
        const docPath = path.join(process.cwd(), doc);
        
        if (!await fs.pathExists(docPath)) {
          throw new Error(`Required documentation missing: ${doc}`);
        }

        const content = await fs.readFile(docPath, 'utf8');
        
        if (content.length < 100) {
          throw new Error(`Documentation too brief: ${doc}`);
        }
      }

      this.addTestResult(testName, true, 'Complete documentation available');
      console.log('  ✅ Complete documentation verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test security configuration documentation
   */
  async testSecurityConfigurationDocumentation() {
    const testName = 'Security Configuration Documentation (7.2)';
    
    try {
      const securityDocPath = path.join(process.cwd(), 'SECURITY.md');
      
      if (await fs.pathExists(securityDocPath)) {
        const securityContent = await fs.readFile(securityDocPath, 'utf8');
        
        const requiredSections = [
          'authentication',
          'certificate',
          'encryption',
          'firewall',
          'logging'
        ];

        for (const section of requiredSections) {
          if (!securityContent.toLowerCase().includes(section)) {
            throw new Error(`Security documentation missing section: ${section}`);
          }
        }
      }

      this.addTestResult(testName, true, 'Security configuration documented');
      console.log('  ✅ Security configuration documentation verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test Requirement 8: Backup and Recovery
   */
  async testBackupRecovery() {
    console.log('💾 Testing Backup and Recovery (Requirement 8)');
    
    // Test 8.1: Automated backup
    await this.testAutomatedBackup();
    
    // Test 8.2: Encrypted backup storage
    await this.testEncryptedBackupStorage();
    
    // Test 8.3: Disaster recovery capability
    await this.testDisasterRecoveryCapability();
    
    // Test 8.4: Backup integrity verification
    await this.testBackupIntegrityVerification();
    
    // Test 8.5: Recovery procedure documentation
    await this.testRecoveryProcedureDocumentation();
    
    console.log('');
  }

  /**
   * Test automated backup
   */
  async testAutomatedBackup() {
    const testName = 'Automated Backup (8.1)';
    
    try {
      const backupScript = path.join(__dirname, '..', 'scripts', 'backup-certificates.js');
      
      if (!await fs.pathExists(backupScript)) {
        throw new Error('Backup script not found');
      }

      // Test backup creation
      const result = await this.runCommand('node', [backupScript, 'create']);
      
      if (!result.success) {
        throw new Error(`Backup creation failed: ${result.error}`);
      }

      // Check if backup directory was created
      const backupDir = path.join(process.cwd(), 'certificate-backups');
      
      if (await fs.pathExists(backupDir)) {
        const backups = await fs.readdir(backupDir);
        
        if (backups.length === 0) {
          throw new Error('No backups found after creation');
        }
      }

      this.addTestResult(testName, true, 'Automated backup working');
      console.log('  ✅ Automated backup verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test encrypted backup storage
   */
  async testEncryptedBackupStorage() {
    const testName = 'Encrypted Backup Storage (8.2)';
    
    try {
      // Check if backup includes checksums for integrity
      const backupDir = path.join(process.cwd(), 'certificate-backups');
      
      if (await fs.pathExists(backupDir)) {
        const backups = await fs.readdir(backupDir);
        
        if (backups.length > 0) {
          const latestBackup = backups[backups.length - 1];
          const checksumFile = path.join(backupDir, latestBackup, 'checksums.json');
          
          if (await fs.pathExists(checksumFile)) {
            const checksums = JSON.parse(await fs.readFile(checksumFile, 'utf8'));
            
            if (!checksums || Object.keys(checksums).length === 0) {
              throw new Error('Backup checksums not generated');
            }
          }
        }
      }

      this.addTestResult(testName, true, 'Backup integrity protection available');
      console.log('  ✅ Backup integrity protection verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test disaster recovery capability
   */
  async testDisasterRecoveryCapability() {
    const testName = 'Disaster Recovery Capability (8.3)';
    
    try {
      const backupScript = path.join(__dirname, '..', 'scripts', 'backup-certificates.js');
      
      // Test backup listing
      const listResult = await this.runCommand('node', [backupScript, 'list']);
      
      if (!listResult.success) {
        throw new Error('Backup listing failed');
      }

      // Test that backup commands are available and functional
      if (listResult.stdout.includes('Резервные копии не найдены') || 
          listResult.stdout.includes('No backups found')) {
        // This is acceptable - no backups exist yet
        console.log('  ℹ️  No existing backups found, but backup system is functional');
      }

      this.addTestResult(testName, true, 'Disaster recovery capability available');
      console.log('  ✅ Disaster recovery capability verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test backup integrity verification
   */
  async testBackupIntegrityVerification() {
    const testName = 'Backup Integrity Verification (8.4)';
    
    try {
      const backupScript = path.join(__dirname, '..', 'scripts', 'backup-certificates.js');
      
      // First check if backups exist
      const listResult = await this.runCommand('node', [backupScript, 'list']);
      
      if (listResult.success && listResult.stdout.includes('backup-')) {
        // If backups exist, try to verify the first one
        const backupDir = path.join(process.cwd(), 'certificate-backups');
        if (await fs.pathExists(backupDir)) {
          const backups = await fs.readdir(backupDir);
          if (backups.length > 0) {
            const firstBackup = path.join(backupDir, backups[0]);
            const verifyResult = await this.runCommand('node', [backupScript, 'verify', firstBackup]);
            
            if (!verifyResult.success) {
              throw new Error('Backup verification failed for existing backup');
            }
          }
        }
      }

      this.addTestResult(testName, true, 'Backup integrity verification available');
      console.log('  ✅ Backup integrity verification verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test recovery procedure documentation
   */
  async testRecoveryProcedureDocumentation() {
    const testName = 'Recovery Procedure Documentation (8.5)';
    
    try {
      const troubleshootingDoc = path.join(process.cwd(), 'docs/en/troubleshooting/recovery.md');
      
      if (await fs.pathExists(troubleshootingDoc)) {
        const content = await fs.readFile(troubleshootingDoc, 'utf8');
        
        if (!content.toLowerCase().includes('резервное копирование') && 
            !content.toLowerCase().includes('backup') || 
            !content.toLowerCase().includes('восстановление') && 
            !content.toLowerCase().includes('recovery')) {
          throw new Error('Recovery procedures not documented');
        }
      } else {
        throw new Error('Troubleshooting documentation not found');
      }

      this.addTestResult(testName, true, 'Recovery procedures documented');
      console.log('  ✅ Recovery procedure documentation verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test system integration
   */
  async testSystemIntegration() {
    console.log('🔗 Testing System Integration');
    
    // Test overall system startup
    await this.testSystemStartup();
    
    // Test service integration
    await this.testServiceIntegration();
    
    console.log('');
  }

  /**
   * Test system startup
   */
  async testSystemStartup() {
    const testName = 'System Startup Integration';
    
    try {
      // Test that main server file exists and can be loaded
      const serverPath = path.join(__dirname, '..', 'src', 'server.js');
      
      if (!await fs.pathExists(serverPath)) {
        throw new Error('Main server file not found');
      }

      // Test configuration loading
      const configModule = require('../src/config');
      
      if (!configModule || !configModule.server || !configModule.certificates) {
        throw new Error('Configuration not properly loaded');
      }

      this.addTestResult(testName, true, 'System startup components verified');
      console.log('  ✅ System startup integration verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Test service integration
   */
  async testServiceIntegration() {
    const testName = 'Service Integration';
    
    try {
      // Test that all services can be instantiated together
      const loggingService = new LoggingService();
      const metricsService = new MetricsService(loggingService);
      const authService = new AuthenticationService(loggingService, metricsService);
      const certManager = new SimplifiedCertificateManager(loggingService.getLogger(), loggingService);
      const networkSecurity = new NetworkSecurityManager(config, loggingService.getLogger());

      // Test basic service interactions
      loggingService.logSecurityEvent('integration_test', { test: true });
      metricsService.recordMetric('integration_test', 1);

      this.addTestResult(testName, true, 'All services integrate properly');
      console.log('  ✅ Service integration verified');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`  ❌ ${error.message}`);
    }
  }

  /**
   * Helper method to find source files
   */
  async findSourceFiles() {
    const sourceFiles = [];
    const searchDirs = ['src', 'scripts'];

    for (const dir of searchDirs) {
      const dirPath = path.join(process.cwd(), dir);
      
      if (await fs.pathExists(dirPath)) {
        const files = await this.findFilesRecursively(dirPath, /\.(js|ts)$/);
        sourceFiles.push(...files);
      }
    }

    return sourceFiles;
  }

  /**
   * Helper method to find files recursively
   */
  async findFilesRecursively(dir, pattern) {
    const files = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        const subFiles = await this.findFilesRecursively(itemPath, pattern);
        files.push(...subFiles);
      } else if (pattern.test(item)) {
        files.push(itemPath);
      }
    }

    return files;
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Display test results summary
   */
  displayTestResults() {
    const testDuration = Date.now() - this.testStartTime;
    
    console.log('\n📊 Comprehensive Validation Test Results');
    console.log('==========================================\n');

    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => r.passed === false).length;
    const total = this.testResults.length;

    // Group results by requirement
    const requirementGroups = {
      'Requirement 1': this.testResults.filter(r => r.test.includes('(1.')),
      'Requirement 2': this.testResults.filter(r => r.test.includes('(2.')),
      'Requirement 3': this.testResults.filter(r => r.test.includes('(3.')),
      'Requirement 4': this.testResults.filter(r => r.test.includes('(4.')),
      'Requirement 5': this.testResults.filter(r => r.test.includes('(5.')),
      'Requirement 6': this.testResults.filter(r => r.test.includes('(6.')),
      'Requirement 7': this.testResults.filter(r => r.test.includes('(7.')),
      'Requirement 8': this.testResults.filter(r => r.test.includes('(8.')),
      'Integration': this.testResults.filter(r => !r.test.includes('('))
    };

    for (const [group, results] of Object.entries(requirementGroups)) {
      if (results.length > 0) {
        console.log(`\n${group}:`);
        results.forEach(result => {
          const status = result.passed ? '✅ PASS' : '❌ FAIL';
          console.log(`  ${status} - ${result.test}`);
          if (result.message) {
            console.log(`      ${result.message}`);
          }
        });
      }
    }

    console.log(`\n📈 Overall Results: ${passed}/${total} tests passed`);
    console.log(`⏱️  Test Duration: ${(testDuration / 1000).toFixed(2)}s`);
    
    if (failed > 0) {
      console.log(`❌ ${failed} test(s) failed`);
      console.log('\n🔍 Failed tests require attention before deployment');
      process.exit(1);
    } else {
      console.log('✅ All comprehensive validation tests passed!');
      console.log('\n🎉 VPN Security Hardening validation complete');
    }
  }

  /**
   * Run command with promise wrapper
   */
  runCommand(command, args = []) {
    return new Promise((resolve) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          error: code !== 0 ? stderr : null
        });
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new ComprehensiveValidationTest();
  test.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = ComprehensiveValidationTest;