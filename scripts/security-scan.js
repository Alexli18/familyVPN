#!/usr/bin/env node

/**
 * Simple Security Scanning for Family VPN Server
 * Basic security checks appropriate for single-node deployment
 */

const { spawn } = require('cross-spawn');
const fs = require('fs-extra');
const path = require('path');

class SimpleSecurityScanner {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            checks: []
        };
    }

    /**
     * Run basic Docker security checks
     */
    async runBasicChecks() {
        console.log('🔍 Running basic security checks...');
        
        // Check if running as non-root
        await this.checkNonRootUser();
        
        // Check for basic hardening
        await this.checkDockerHardening();
        
        // Check for secrets in code
        await this.checkForSecrets();
        
        return this.results;
    }

    /**
     * Check if container runs as non-root
     */
    async checkNonRootUser() {
        try {
            const dockerfile = await fs.readFile('Dockerfile', 'utf8');
            const hasNonRootUser = dockerfile.includes('USER ') && !dockerfile.includes('USER root');
            
            this.results.checks.push({
                name: 'Non-root user',
                status: hasNonRootUser ? 'PASS' : 'FAIL',
                message: hasNonRootUser ? 'Container runs as non-root user' : 'Container may run as root'
            });
        } catch (error) {
            this.results.checks.push({
                name: 'Non-root user',
                status: 'ERROR',
                message: 'Could not check Dockerfile'
            });
        }
    }

    /**
     * Check basic Docker hardening
     */
    async checkDockerHardening() {
        try {
            const compose = await fs.readFile('docker-compose.yml', 'utf8');
            
            const checks = [
                { pattern: 'no-new-privileges', name: 'No new privileges' },
                { pattern: 'cap_drop', name: 'Capabilities dropped' },
                { pattern: 'tmpfs', name: 'Temporary filesystem' }
            ];
            
            checks.forEach(check => {
                const hasFeature = compose.includes(check.pattern);
                this.results.checks.push({
                    name: check.name,
                    status: hasFeature ? 'PASS' : 'WARN',
                    message: hasFeature ? `${check.name} configured` : `${check.name} not configured`
                });
            });
        } catch (error) {
            this.results.checks.push({
                name: 'Docker hardening',
                status: 'ERROR',
                message: 'Could not check docker-compose.yml'
            });
        }
    }

    /**
     * Check for potential secrets in code
     */
    async checkForSecrets() {
        const secretPatterns = [
            { pattern: /password\s*=\s*['"][^'"]+['"]/, name: 'Hardcoded passwords' },
            { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/, name: 'API keys' },
            { pattern: /secret\s*=\s*['"][^'"]+['"]/, name: 'Secrets' }
        ];

        try {
            const srcFiles = await this.getSourceFiles();
            let foundSecrets = false;

            for (const file of srcFiles) {
                const content = await fs.readFile(file, 'utf8');
                
                for (const { pattern, name } of secretPatterns) {
                    if (pattern.test(content)) {
                        foundSecrets = true;
                        this.results.checks.push({
                            name: `Secret check: ${name}`,
                            status: 'FAIL',
                            message: `Potential ${name.toLowerCase()} found in ${file}`
                        });
                    }
                }
            }

            if (!foundSecrets) {
                this.results.checks.push({
                    name: 'Secret scanning',
                    status: 'PASS',
                    message: 'No obvious secrets found in source code'
                });
            }
        } catch (error) {
            this.results.checks.push({
                name: 'Secret scanning',
                status: 'ERROR',
                message: 'Could not scan source files'
            });
        }
    }

    /**
     * Get list of source files to scan
     */
    async getSourceFiles() {
        const files = [];
        const srcDir = path.join(process.cwd(), 'src');
        
        if (await fs.pathExists(srcDir)) {
            const srcFiles = await fs.readdir(srcDir, { recursive: true });
            files.push(...srcFiles.filter(f => f.endsWith('.js')).map(f => path.join(srcDir, f)));
        }
        
        return files;
    }

    /**
     * Generate simple report
     */
    async generateReport() {
        const reportPath = path.join(process.cwd(), 'security-check-report.json');
        await fs.writeJson(reportPath, this.results, { spaces: 2 });
        
        console.log('\n📊 Security Check Results:');
        this.results.checks.forEach(check => {
            const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️';
            console.log(`${icon} ${check.name}: ${check.message}`);
        });
        
        console.log(`\n📄 Full report saved to: ${reportPath}`);
        return this.results;
    }
}

/**
 * Main execution
 */
async function main() {
    const scanner = new SimpleSecurityScanner();
    
    console.log('🛡️  Running basic security checks for family VPN server...');
    
    try {
        await scanner.runBasicChecks();
        await scanner.generateReport();
        
        const failedChecks = scanner.results.checks.filter(c => c.status === 'FAIL').length;
        
        if (failedChecks > 0) {
            console.log(`\n⚠️  ${failedChecks} security issues found. Review the report above.`);
            process.exit(1);
        } else {
            console.log('\n✅ All basic security checks passed!');
        }
        
    } catch (error) {
        console.error('❌ Security check failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = SimpleSecurityScanner;