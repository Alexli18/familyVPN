#!/usr/bin/env node

/**
 * Network Security Test Suite
 * Tests the network security and firewall functionality
 * Requirements: 6.1, 6.2, 6.3
 */

const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('cross-spawn');

// Set up test environment with local directories BEFORE importing any modules
const testDir = path.join(process.cwd(), 'test-certificates');
process.env.VPN_CERT_DIR = testDir;
process.env.VPN_CONFIG_DIR = testDir;

// Test configuration
const config = require('../src/config');
const LoggingService = require('../src/services/logging-service');
const NetworkSecurityManager = require('../src/utils/network-security');

class NetworkSecurityTest {
  constructor() {
    this.loggingService = new LoggingService();
    this.logger = this.loggingService.getLogger();
    this.networkSecurity = new NetworkSecurityManager(config, this.logger);
    this.testResults = [];
  }

  /**
   * Run all network security tests
   */
  async runAllTests() {
    console.log('🛡️  Starting Network Security Test Suite...\n');

    try {
      // Test 1: Network Security Manager initialization
      await this.testNetworkSecurityInitialization();

      // Test 2: Firewall rules creation
      await this.testFirewallRulesCreation();

      // Test 3: Client access control setup
      await this.testClientAccessControlSetup();

      // Test 4: DNS leak protection configuration
      await this.testDNSLeakProtectionConfig();

      // Test 5: Client scripts creation
      await this.testClientScriptsCreation();

      // Test 6: Firewall status check
      await this.testFirewallStatusCheck();

      // Test 7: Network security script functionality
      await this.testNetworkSecurityScript();

      // Display results
      this.displayTestResults();

    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test network security manager initialization
   */
  async testNetworkSecurityInitialization() {
    const testName = 'Network Security Manager Initialization';
    console.log(`🧪 Testing: ${testName}`);

    try {
      // Test manager creation
      const manager = new NetworkSecurityManager(config, this.logger);
      
      if (!manager) {
        throw new Error('Failed to create NetworkSecurityManager instance');
      }

      // Test configuration access
      if (!manager.config || !manager.logger) {
        throw new Error('Manager missing required configuration or logger');
      }

      // Test platform detection
      if (!manager.platform) {
        throw new Error('Platform detection failed');
      }

      this.addTestResult(testName, true, 'Manager initialized successfully');
      console.log('✅ Network Security Manager initialized successfully\n');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`❌ ${testName} failed: ${error.message}\n`);
    }
  }

  /**
   * Test firewall rules creation
   */
  async testFirewallRulesCreation() {
    const testName = 'Firewall Rules Creation';
    console.log(`🧪 Testing: ${testName}`);

    try {
      // Create firewall rules
      await this.networkSecurity.createFirewallRules();

      // Check if firewall script was created
      const firewallScript = path.join(config.certificates.dir, 'scripts', 'firewall-rules.sh');
      
      if (process.platform !== 'win32') {
        // On Unix-like systems, check if script exists and is executable
        if (await fs.pathExists(firewallScript)) {
          const stats = await fs.stat(firewallScript);
          
          if (!stats.isFile()) {
            throw new Error('Firewall script is not a file');
          }

          // Check if script contains expected content
          const scriptContent = await fs.readFile(firewallScript, 'utf8');
          
          if (!scriptContent.includes('iptables')) {
            throw new Error('Firewall script missing iptables rules');
          }

          if (!scriptContent.includes('VPN_SUBNET')) {
            throw new Error('Firewall script missing VPN subnet configuration');
          }

          this.addTestResult(testName, true, 'Firewall rules script created successfully');
          console.log('✅ Firewall rules script created and validated\n');
        } else {
          throw new Error('Firewall script not created');
        }
      } else {
        // On Windows, just verify the method completed without error
        this.addTestResult(testName, true, 'Firewall rules creation completed (Windows - not supported)');
        console.log('✅ Firewall rules creation completed (Windows platform)\n');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`❌ ${testName} failed: ${error.message}\n`);
    }
  }

  /**
   * Test client access control setup
   */
  async testClientAccessControlSetup() {
    const testName = 'Client Access Control Setup';
    console.log(`🧪 Testing: ${testName}`);

    try {
      // Setup client access control
      await this.networkSecurity.setupClientAccessControl();

      // Check if client access config was created
      const clientAccessFile = path.join(config.certificates.dir, 'client-access.conf');
      
      if (await fs.pathExists(clientAccessFile)) {
        const configContent = await fs.readFile(clientAccessFile, 'utf8');
        
        if (!configContent.includes('verify-client-cert require')) {
          throw new Error('Client access config missing certificate verification');
        }

        if (!configContent.includes('remote-cert-tls client')) {
          throw new Error('Client access config missing TLS client verification');
        }

        this.addTestResult(testName, true, 'Client access control configured successfully');
        console.log('✅ Client access control setup completed\n');
      } else {
        throw new Error('Client access configuration file not created');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`❌ ${testName} failed: ${error.message}\n`);
    }
  }

  /**
   * Test DNS leak protection configuration
   */
  async testDNSLeakProtectionConfig() {
    const testName = 'DNS Leak Protection Configuration';
    console.log(`🧪 Testing: ${testName}`);

    try {
      // Configure DNS leak protection
      await this.networkSecurity.configureDNSLeakProtection();

      // Check if DNS config was created
      const dnsConfigFile = path.join(config.certificates.dir, 'dns-protection.conf');
      
      if (await fs.pathExists(dnsConfigFile)) {
        const dnsContent = await fs.readFile(dnsConfigFile, 'utf8');
        
        if (!dnsContent.includes('block-outside-dns')) {
          throw new Error('DNS config missing outside DNS blocking');
        }

        if (!dnsContent.includes('1.1.1.1')) {
          throw new Error('DNS config missing secure DNS servers');
        }

        if (!dnsContent.includes('redirect-gateway')) {
          throw new Error('DNS config missing gateway redirection');
        }

        this.addTestResult(testName, true, 'DNS leak protection configured successfully');
        console.log('✅ DNS leak protection configuration completed\n');
      } else {
        throw new Error('DNS protection configuration file not created');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`❌ ${testName} failed: ${error.message}\n`);
    }
  }

  /**
   * Test client scripts creation
   */
  async testClientScriptsCreation() {
    const testName = 'Client Scripts Creation';
    console.log(`🧪 Testing: ${testName}`);

    try {
      // Create client scripts
      await this.networkSecurity.createClientScripts();

      if (process.platform !== 'win32') {
        // Check connect script
        const connectScript = path.join(config.certificates.dir, 'scripts', 'client-connect.sh');
        if (await fs.pathExists(connectScript)) {
          const connectContent = await fs.readFile(connectScript, 'utf8');
          
          if (!connectContent.includes('common_name')) {
            throw new Error('Connect script missing common name handling');
          }

          if (!connectContent.includes('logger')) {
            throw new Error('Connect script missing logging functionality');
          }
        } else {
          throw new Error('Client connect script not created');
        }

        // Check disconnect script
        const disconnectScript = path.join(config.certificates.dir, 'scripts', 'client-disconnect.sh');
        if (await fs.pathExists(disconnectScript)) {
          const disconnectContent = await fs.readFile(disconnectScript, 'utf8');
          
          if (!disconnectContent.includes('iptables -D')) {
            throw new Error('Disconnect script missing cleanup rules');
          }
        } else {
          throw new Error('Client disconnect script not created');
        }

        this.addTestResult(testName, true, 'Client scripts created successfully');
        console.log('✅ Client connect/disconnect scripts created\n');
      } else {
        this.addTestResult(testName, true, 'Client scripts creation completed (Windows - not supported)');
        console.log('✅ Client scripts creation completed (Windows platform)\n');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`❌ ${testName} failed: ${error.message}\n`);
    }
  }

  /**
   * Test firewall status check
   */
  async testFirewallStatusCheck() {
    const testName = 'Firewall Status Check';
    console.log(`🧪 Testing: ${testName}`);

    try {
      // Get firewall status
      const status = await this.networkSecurity.getFirewallStatus();

      if (!status) {
        throw new Error('Firewall status check returned null');
      }

      if (typeof status.supported !== 'boolean') {
        throw new Error('Firewall status missing supported flag');
      }

      if (process.platform === 'win32') {
        if (status.supported) {
          throw new Error('Windows should report firewall as not supported');
        }
      } else {
        // On Unix-like systems, should be supported
        if (!status.supported) {
          throw new Error('Unix-like systems should support firewall status');
        }
      }

      this.addTestResult(testName, true, `Firewall status check completed (supported: ${status.supported})`);
      console.log(`✅ Firewall status check completed (supported: ${status.supported})\n`);

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`❌ ${testName} failed: ${error.message}\n`);
    }
  }

  /**
   * Test network security script functionality
   */
  async testNetworkSecurityScript() {
    const testName = 'Network Security Script';
    console.log(`🧪 Testing: ${testName}`);

    try {
      // Test script exists
      const scriptPath = path.join(__dirname, '..', 'scripts', 'network-security.js');
      
      if (!await fs.pathExists(scriptPath)) {
        throw new Error('Network security script not found');
      }

      // Test script help command
      const helpResult = await this.runCommand('node', [scriptPath, '--help']);
      
      if (!helpResult.success) {
        throw new Error('Script help command failed');
      }

      if (!helpResult.stdout.includes('Network Security Management')) {
        throw new Error('Script help output missing expected content');
      }

      // Test script status command (should not fail even if no firewall)
      const statusResult = await this.runCommand('node', [scriptPath, 'status']);
      
      // Status command should complete (success or failure is platform dependent)
      if (statusResult.stdout.length === 0 && statusResult.stderr.length === 0) {
        throw new Error('Script status command produced no output');
      }

      this.addTestResult(testName, true, 'Network security script functionality verified');
      console.log('✅ Network security script functionality verified\n');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.log(`❌ ${testName} failed: ${error.message}\n`);
    }
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
    console.log('\n📊 Test Results Summary');
    console.log('========================\n');

    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => r.passed === false).length;
    const total = this.testResults.length;

    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.test}`);
      if (result.message) {
        console.log(`    ${result.message}`);
      }
    });

    console.log(`\n📈 Results: ${passed}/${total} tests passed`);
    
    if (failed > 0) {
      console.log(`❌ ${failed} test(s) failed`);
      process.exit(1);
    } else {
      console.log('✅ All tests passed!');
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
  const test = new NetworkSecurityTest();
  test.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = NetworkSecurityTest;