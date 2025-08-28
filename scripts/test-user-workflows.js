#!/usr/bin/env node

/**
 * Test User Workflows Script
 * 
 * This script tests the main user workflows to ensure documentation
 * provides complete paths for different user types
 */

const fs = require('fs');
const path = require('path');

class WorkflowTester {
    constructor() {
        this.results = [];
        this.errors = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    // Check if file exists and is readable
    checkFile(filePath, description) {
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.length > 100) { // Basic content check
                    this.log(`${description}: ${filePath}`);
                    return true;
                } else {
                    this.errors.push(`${description} exists but appears empty: ${filePath}`);
                    return false;
                }
            } else {
                this.errors.push(`${description} missing: ${filePath}`);
                return false;
            }
        } catch (error) {
            this.errors.push(`Cannot read ${description}: ${filePath} - ${error.message}`);
            return false;
        }
    }

    // Test beginner user workflow
    testBeginnerWorkflow() {
        this.log('\n=== Testing Beginner User Workflow ===');
        
        const workflow = [
            { file: 'README.md', desc: 'Main project overview' },
            { file: 'FIRST_TIME.md', desc: 'First-time setup guide' },
            { file: 'docs/en/installation/docker.md', desc: 'Docker installation guide' },
            { file: 'docs/en/configuration/environment.md', desc: 'Environment configuration' },
            { file: 'docs/en/configuration/certificates.md', desc: 'Certificate setup' },
            { file: 'docs/en/troubleshooting/common-issues.md', desc: 'Common issues help' }
        ];

        let success = true;
        for (const step of workflow) {
            if (!this.checkFile(step.file, step.desc)) {
                success = false;
            }
        }

        this.results.push({
            workflow: 'Beginner User',
            success: success,
            description: 'New user can follow complete setup process'
        });

        return success;
    }

    // Test Russian user workflow
    testRussianUserWorkflow() {
        this.log('\n=== Testing Russian User Workflow ===');
        
        const workflow = [
            { file: 'README.md', desc: 'Main project overview (bilingual)' },
            { file: 'FIRST_TIME_RU.md', desc: 'Russian first-time setup guide' },
            { file: 'docs/ru/installation/docker.md', desc: 'Russian Docker installation guide' },
            { file: 'docs/ru/configuration/environment.md', desc: 'Russian environment configuration' },
            { file: 'docs/ru/configuration/certificates.md', desc: 'Russian certificate setup' },
            { file: 'docs/ru/troubleshooting/common-issues.md', desc: 'Russian common issues help' }
        ];

        let success = true;
        for (const step of workflow) {
            if (!this.checkFile(step.file, step.desc)) {
                success = false;
            }
        }

        this.results.push({
            workflow: 'Russian User',
            success: success,
            description: 'Russian user can follow complete setup process'
        });

        return success;
    }

    // Test advanced user workflow
    testAdvancedUserWorkflow() {
        this.log('\n=== Testing Advanced User Workflow ===');
        
        const workflow = [
            { file: 'README.md', desc: 'Main project overview' },
            { file: 'docs/en/README.md', desc: 'Documentation overview' },
            { file: 'docs/en/api/README.md', desc: 'API documentation' },
            { file: 'docs/en/security/README.md', desc: 'Security documentation' },
            { file: 'docs/en/deployment/production.md', desc: 'Production deployment' },
            { file: 'docs/en/troubleshooting/diagnostics.md', desc: 'Advanced diagnostics' }
        ];

        let success = true;
        for (const step of workflow) {
            if (!this.checkFile(step.file, step.desc)) {
                success = false;
            }
        }

        this.results.push({
            workflow: 'Advanced User',
            success: success,
            description: 'Advanced user can access detailed technical information'
        });

        return success;
    }

    // Test troubleshooting workflow
    testTroubleshootingWorkflow() {
        this.log('\n=== Testing Troubleshooting Workflow ===');
        
        const workflow = [
            { file: 'docs/en/troubleshooting/common-issues.md', desc: 'Common issues guide' },
            { file: 'docs/en/troubleshooting/diagnostics.md', desc: 'Diagnostic tools' },
            { file: 'docs/en/troubleshooting/recovery.md', desc: 'Recovery procedures' },
            { file: 'docs/en/troubleshooting/performance.md', desc: 'Performance optimization' }
        ];

        let success = true;
        for (const step of workflow) {
            if (!this.checkFile(step.file, step.desc)) {
                success = false;
            }
        }

        this.results.push({
            workflow: 'Troubleshooting',
            success: success,
            description: 'Users can find help when things go wrong'
        });

        return success;
    }

    // Test configuration completeness
    testConfigurationCompleteness() {
        this.log('\n=== Testing Configuration Completeness ===');
        
        const requiredConfigs = [
            { file: 'docs/en/configuration/environment.md', desc: 'Environment setup' },
            { file: 'docs/en/configuration/networking.md', desc: 'Network configuration' },
            { file: 'docs/en/configuration/security.md', desc: 'Security configuration' },
            { file: 'docs/en/configuration/certificates.md', desc: 'Certificate configuration' },
            { file: 'docs/ru/configuration/environment.md', desc: 'Russian environment setup' },
            { file: 'docs/ru/configuration/networking.md', desc: 'Russian network configuration' },
            { file: 'docs/ru/configuration/security.md', desc: 'Russian security configuration' },
            { file: 'docs/ru/configuration/certificates.md', desc: 'Russian certificate configuration' }
        ];

        let success = true;
        for (const config of requiredConfigs) {
            if (!this.checkFile(config.file, config.desc)) {
                success = false;
            }
        }

        this.results.push({
            workflow: 'Configuration',
            success: success,
            description: 'All required configuration documentation exists'
        });

        return success;
    }

    // Test deployment options
    testDeploymentOptions() {
        this.log('\n=== Testing Deployment Options ===');
        
        const deploymentGuides = [
            { file: 'docs/en/deployment/docker.md', desc: 'Docker deployment' },
            { file: 'docs/en/deployment/local.md', desc: 'Local deployment' },
            { file: 'docs/en/deployment/aws.md', desc: 'AWS deployment' },
            { file: 'docs/en/deployment/gcp.md', desc: 'Google Cloud deployment' },
            { file: 'docs/en/deployment/production.md', desc: 'Production deployment' }
        ];

        let success = true;
        for (const guide of deploymentGuides) {
            if (!this.checkFile(guide.file, guide.desc)) {
                success = false;
            }
        }

        this.results.push({
            workflow: 'Deployment',
            success: success,
            description: 'Multiple deployment options are documented'
        });

        return success;
    }

    // Test content quality
    testContentQuality() {
        this.log('\n=== Testing Content Quality ===');
        
        const criticalFiles = [
            'README.md',
            'FIRST_TIME.md',
            'FIRST_TIME_RU.md',
            'docs/en/installation/docker.md',
            'docs/ru/installation/docker.md'
        ];

        let qualityIssues = 0;
        
        for (const file of criticalFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                
                // Check for minimum content length
                if (content.length < 500) {
                    this.errors.push(`${file} appears too short (${content.length} chars)`);
                    qualityIssues++;
                }
                
                // Check for code blocks
                const codeBlocks = (content.match(/```/g) || []).length / 2;
                if (file.includes('installation') && codeBlocks < 2) {
                    this.errors.push(`${file} should have more code examples`);
                    qualityIssues++;
                }
                
                // Check for headers
                const headers = (content.match(/^#+\s+/gm) || []).length;
                if (headers < 3) {
                    this.errors.push(`${file} should have more section headers`);
                    qualityIssues++;
                }
                
                this.log(`Content quality check: ${file} (${content.length} chars, ${codeBlocks} code blocks, ${headers} headers)`);
            }
        }

        const success = qualityIssues === 0;
        this.results.push({
            workflow: 'Content Quality',
            success: success,
            description: 'Documentation has adequate content depth'
        });

        return success;
    }

    // Run all workflow tests
    async runAllTests() {
        this.log('Starting user workflow tests...');
        
        const tests = [
            () => this.testBeginnerWorkflow(),
            () => this.testRussianUserWorkflow(),
            () => this.testAdvancedUserWorkflow(),
            () => this.testTroubleshootingWorkflow(),
            () => this.testConfigurationCompleteness(),
            () => this.testDeploymentOptions(),
            () => this.testContentQuality()
        ];

        let allPassed = true;
        for (const test of tests) {
            const result = test();
            if (!result) {
                allPassed = false;
            }
        }

        this.generateReport(allPassed);
        return allPassed;
    }

    // Generate test report
    generateReport(allPassed) {
        this.log('\n' + '='.repeat(60));
        this.log('USER WORKFLOW TEST REPORT');
        this.log('='.repeat(60));
        
        this.log(`\nWorkflow Test Results:`);
        for (const result of this.results) {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            this.log(`${status}: ${result.workflow} - ${result.description}`);
        }
        
        this.log(`\nTotal workflows tested: ${this.results.length}`);
        this.log(`Passed: ${this.results.filter(r => r.success).length}`);
        this.log(`Failed: ${this.results.filter(r => !r.success).length}`);
        
        if (this.errors.length > 0) {
            this.log('\n❌ ISSUES FOUND:');
            this.errors.forEach((error, i) => {
                this.log(`${i + 1}. ${error}`);
            });
        }
        
        if (allPassed) {
            this.log('\n🎉 All user workflows are properly documented!');
        } else {
            this.log('\n⚠️ Some workflows need attention.');
        }
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            allPassed: allPassed,
            results: this.results,
            errors: this.errors,
            summary: {
                totalWorkflows: this.results.length,
                passed: this.results.filter(r => r.success).length,
                failed: this.results.filter(r => !r.success).length,
                totalIssues: this.errors.length
            }
        };
        
        fs.writeFileSync('workflow-test-report.json', JSON.stringify(report, null, 2));
        this.log('\n📄 Detailed report saved to: workflow-test-report.json');
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new WorkflowTester();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Workflow tests failed:', error);
        process.exit(1);
    });
}

module.exports = WorkflowTester;