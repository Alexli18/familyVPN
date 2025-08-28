#!/usr/bin/env node

/**
 * Network Security Management Script
 * Provides common firewall scenarios and network security operations
 * Requirements: 6.1, 6.2, 6.3
 */

const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('cross-spawn');

// Configuration
const config = require('../src/config');
const LoggingService = require('../src/services/logging-service');
const NetworkSecurityManager = require('../src/utils/network-security');

const loggingService = new LoggingService();
const logger = loggingService.getLogger();

class NetworkSecurityScript {
  constructor() {
    this.networkSecurity = new NetworkSecurityManager(config, logger);
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log(`
🛡️  VPN Network Security Management

Usage: node scripts/network-security.js <command> [options]

Commands:
  init                 Initialize network security (firewall rules, DNS protection)
  status              Show current firewall status
  apply-rules         Apply firewall rules
  cleanup             Clean up firewall rules
  test-dns            Test DNS leak protection
  client-access       Manage client access control
  monitor             Start network monitoring
  backup-rules        Backup current firewall rules
  restore-rules       Restore firewall rules from backup

Examples:
  node scripts/network-security.js init
  node scripts/network-security.js status
  node scripts/network-security.js cleanup
  node scripts/network-security.js test-dns

Options:
  --help, -h          Show this help message
  --verbose, -v       Enable verbose logging
  --dry-run          Show what would be done without executing
`);
  }

  /**
   * Initialize network security
   */
  async initializeNetworkSecurity() {
    try {
      console.log('🔧 Initializing network security...');
      await this.networkSecurity.initializeNetworkSecurity();
      console.log('✅ Network security initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize network security:', error.message);
      process.exit(1);
    }
  }

  /**
   * Show firewall status
   */
  async showFirewallStatus() {
    try {
      console.log('📊 Checking firewall status...');
      const status = await this.networkSecurity.getFirewallStatus();
      
      if (!status.supported) {
        console.log('⚠️  Firewall status not supported on this platform');
        return;
      }

      if (status.success) {
        console.log('✅ Firewall is active');
        console.log('\n📋 Current rules:');
        console.log(status.rules);
      } else {
        console.log('❌ Failed to get firewall status:', status.error);
      }
    } catch (error) {
      console.error('❌ Error checking firewall status:', error.message);
    }
  }

  /**
   * Apply firewall rules
   */
  async applyFirewallRules() {
    try {
      console.log('🔥 Applying firewall rules...');
      await this.networkSecurity.applyFirewallRules();
      console.log('✅ Firewall rules applied successfully');
    } catch (error) {
      console.error('❌ Failed to apply firewall rules:', error.message);
      process.exit(1);
    }
  }

  /**
   * Clean up firewall rules
   */
  async cleanupFirewallRules() {
    try {
      console.log('🧹 Cleaning up firewall rules...');
      
      if (process.platform === 'win32') {
        console.log('⚠️  Firewall cleanup not supported on Windows');
        return;
      }

      // Create and run cleanup script
      await this.networkSecurity.createFirewallCleanupScript();
      
      const result = await this.runCommand('bash', ['/etc/openvpn/firewall-cleanup.sh']);
      
      if (result.success) {
        console.log('✅ Firewall rules cleaned up successfully');
        console.log(result.stdout);
      } else {
        console.error('❌ Failed to clean up firewall rules:', result.stderr);
      }
    } catch (error) {
      console.error('❌ Error cleaning up firewall rules:', error.message);
    }
  }

  /**
   * Test DNS leak protection
   */
  async testDNSLeakProtection() {
    try {
      console.log('🔍 Testing DNS leak protection...');
      
      if (process.platform === 'win32') {
        console.log('⚠️  DNS leak testing not supported on Windows');
        return;
      }

      // Check if VPN interface exists
      const vpnCheck = await this.runCommand('ip', ['link', 'show', 'tun0']);
      
      if (!vpnCheck.success) {
        console.log('⚠️  VPN interface (tun0) not found. Start VPN server first.');
        return;
      }

      console.log('✅ VPN interface found');

      // Test DNS resolution
      console.log('🔍 Testing DNS resolution...');
      const dnsTest = await this.runCommand('nslookup', ['google.com']);
      
      if (dnsTest.success) {
        console.log('✅ DNS resolution working');
        
        // Check if using secure DNS servers
        if (dnsTest.stdout.includes('1.1.1.1') || dnsTest.stdout.includes('1.0.0.1')) {
          console.log('✅ Using secure DNS servers (Cloudflare)');
        } else {
          console.log('⚠️  May not be using configured secure DNS servers');
        }
      } else {
        console.log('❌ DNS resolution failed:', dnsTest.stderr);
      }

      // Test external DNS leak detection
      console.log('🌐 Testing for DNS leaks...');
      const leakTest = await this.runCommand('curl', ['-s', 'https://1.1.1.1/cdn-cgi/trace']);
      
      if (leakTest.success) {
        console.log('✅ External DNS leak test completed');
        console.log('📊 Results:', leakTest.stdout);
      } else {
        console.log('⚠️  Could not perform external DNS leak test');
      }

    } catch (error) {
      console.error('❌ Error testing DNS leak protection:', error.message);
    }
  }

  /**
   * Manage client access control
   */
  async manageClientAccess() {
    try {
      console.log('👥 Managing client access control...');
      
      const ccdDir = path.join(config.certificates.dir, 'ccd');
      
      // Check if client config directory exists
      if (await fs.pathExists(ccdDir)) {
        console.log('✅ Client config directory exists');
        
        // List existing client configurations
        const clients = await fs.readdir(ccdDir);
        
        if (clients.length > 0) {
          console.log('📋 Configured clients:');
          for (const client of clients) {
            const clientConfig = await fs.readFile(path.join(ccdDir, client), 'utf8');
            console.log(`  - ${client}:`);
            console.log(`    ${clientConfig.split('\n')[0]}`);
          }
        } else {
          console.log('📋 No client-specific configurations found');
        }
      } else {
        console.log('⚠️  Client config directory not found. Run initialization first.');
      }

      // Show access log if available
      const accessLog = '/var/log/openvpn/client-access.log';
      if (await fs.pathExists(accessLog)) {
        console.log('\n📊 Recent client access (last 10 entries):');
        const logContent = await fs.readFile(accessLog, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim()).slice(-10);
        lines.forEach(line => console.log(`  ${line}`));
      }

    } catch (error) {
      console.error('❌ Error managing client access:', error.message);
    }
  }

  /**
   * Start network monitoring
   */
  async startNetworkMonitoring() {
    try {
      console.log('📡 Starting network monitoring...');
      
      if (process.platform === 'win32') {
        console.log('⚠️  Network monitoring not supported on Windows');
        return;
      }

      // Check if monitoring script exists
      const monitorScript = '/etc/openvpn/dns-monitor.sh';
      
      if (await fs.pathExists(monitorScript)) {
        console.log('🚀 Starting DNS monitoring...');
        
        // Start monitoring in background
        const monitor = spawn('bash', [monitorScript], {
          detached: true,
          stdio: 'ignore'
        });
        
        monitor.unref();
        
        console.log('✅ Network monitoring started');
        console.log('📊 Monitor logs: /var/log/openvpn/dns-monitor.log');
      } else {
        console.log('⚠️  Monitoring script not found. Run initialization first.');
      }

    } catch (error) {
      console.error('❌ Error starting network monitoring:', error.message);
    }
  }

  /**
   * Backup firewall rules
   */
  async backupFirewallRules() {
    try {
      console.log('💾 Backing up firewall rules...');
      
      if (process.platform === 'win32') {
        console.log('⚠️  Firewall backup not supported on Windows');
        return;
      }

      const backupDir = '/etc/openvpn/backups';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `iptables-backup-${timestamp}.rules`);

      await fs.ensureDir(backupDir);
      
      const result = await this.runCommand('iptables-save');
      
      if (result.success) {
        await fs.writeFile(backupFile, result.stdout);
        console.log(`✅ Firewall rules backed up to: ${backupFile}`);
      } else {
        console.error('❌ Failed to backup firewall rules:', result.stderr);
      }

    } catch (error) {
      console.error('❌ Error backing up firewall rules:', error.message);
    }
  }

  /**
   * Restore firewall rules from backup
   */
  async restoreFirewallRules() {
    try {
      console.log('🔄 Restoring firewall rules...');
      
      if (process.platform === 'win32') {
        console.log('⚠️  Firewall restore not supported on Windows');
        return;
      }

      const backupDir = '/etc/openvpn/backups';
      
      if (!await fs.pathExists(backupDir)) {
        console.log('⚠️  No backup directory found');
        return;
      }

      // List available backups
      const backups = await fs.readdir(backupDir);
      const ruleBackups = backups.filter(file => file.includes('iptables-backup'));

      if (ruleBackups.length === 0) {
        console.log('⚠️  No firewall rule backups found');
        return;
      }

      // Use the most recent backup
      const latestBackup = ruleBackups.sort().pop();
      const backupFile = path.join(backupDir, latestBackup);

      console.log(`🔄 Restoring from: ${latestBackup}`);
      
      const result = await this.runCommand('iptables-restore', [backupFile]);
      
      if (result.success) {
        console.log('✅ Firewall rules restored successfully');
      } else {
        console.error('❌ Failed to restore firewall rules:', result.stderr);
      }

    } catch (error) {
      console.error('❌ Error restoring firewall rules:', error.message);
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

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const script = new NetworkSecurityScript();

  switch (command) {
    case 'init':
      await script.initializeNetworkSecurity();
      break;
    case 'status':
      await script.showFirewallStatus();
      break;
    case 'apply-rules':
      await script.applyFirewallRules();
      break;
    case 'cleanup':
      await script.cleanupFirewallRules();
      break;
    case 'test-dns':
      await script.testDNSLeakProtection();
      break;
    case 'client-access':
      await script.manageClientAccess();
      break;
    case 'monitor':
      await script.startNetworkMonitoring();
      break;
    case 'backup-rules':
      await script.backupFirewallRules();
      break;
    case 'restore-rules':
      await script.restoreFirewallRules();
      break;
    case '--help':
    case '-h':
    case 'help':
    default:
      script.showHelp();
      break;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = NetworkSecurityScript;